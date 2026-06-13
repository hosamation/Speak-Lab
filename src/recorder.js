// Recorder factory: mic capture → .m4a (Safari native) or .mp3 (encoded via lamejs).
import { pad, stamp, slug, toast, downloadBlob } from './util.js';
import { fsSupported, getVaultRoot, saveToVault } from './vault.js';

function audioBufferToMp3(audioBuffer, kbps = 128) {
  if (!window.lamejs) throw new Error('MP3 encoder not loaded (offline?). Connect to the internet once to cache lamejs.');
  const channels = Math.min(audioBuffer.numberOfChannels, 2);
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const left = audioBuffer.getChannelData(0);
  const right = channels > 1 ? audioBuffer.getChannelData(1) : null;
  const toInt16 = f => {
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      const s = Math.max(-1, Math.min(1, f[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  };
  const l16 = toInt16(left);
  const r16 = right ? toInt16(right) : null;
  const blockSize = 1152;
  const parts = [];
  for (let i = 0; i < l16.length; i += blockSize) {
    const lc = l16.subarray(i, i + blockSize);
    const rc = r16 ? r16.subarray(i, i + blockSize) : null;
    const enc = r16 ? encoder.encodeBuffer(lc, rc) : encoder.encodeBuffer(lc);
    if (enc.length) parts.push(enc);
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(tail);
  return new Blob(parts, { type: 'audio/mpeg' });
}

async function convertToMp3(rawBlob) {
  const arr = await rawBlob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const audioBuffer = await new Promise((res, rej) => {
    try { ctx.decodeAudioData(arr.slice(0), res, rej); } catch (e) { rej(e); }
  });
  const mp3 = audioBufferToMp3(audioBuffer, 128);
  try { ctx.close(); } catch { }
  return mp3;
}

export function makeRecorder(containerId, cfg) {
  const { getLabel, onBeforeStart } = cfg;
  const root = document.getElementById(containerId);
  root.innerHTML = `
    <div class="rec">
      <div class="dot" id="${containerId}-dot"></div>
      <div class="time" id="${containerId}-time">00:00</div>
      <div class="wave-container" id="${containerId}-wave">
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
        <div class="wave-bar"></div>
      </div>
      <div class="spacer"></div>
      <button class="btn primary" id="${containerId}-start">🎙️ Record</button>
      <button class="btn danger hidden" id="${containerId}-stop">■ Stop</button>
    </div>
    <div id="${containerId}-out" class="hidden">
      <audio controls id="${containerId}-audio"></audio>
      <div class="row" style="margin-top:16px">
        <button class="btn primary" id="${containerId}-save">💾 Save to vault</button>
        <button class="btn" id="${containerId}-dl">⬇️ Download</button>
        <button class="btn ghost" id="${containerId}-clear">🗑️ Discard</button>
      </div>
      <div class="path" id="${containerId}-path"></div>
    </div>`;
  const $ = id => document.getElementById(containerId + '-' + id);
  let mr = null, chunks = [], stream = null, t0 = 0, timer = null, blob = null, ext = 'mp3';

  const tick = () => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $('time').textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  };
  const reset = () => {
    $('time').textContent = '00:00';
    $('out').classList.add('hidden');
    $('audio').src = '';
    blob = null;
    $('wave').classList.remove('live');
    if (containerId === 'rec-jam') {
      const cd = document.getElementById('jam-countdown');
      if (cd) cd.classList.remove('live');
    }
  };
  const filename = () => {
    const lbl = getLabel ? '_' + slug(getLabel() || '') : '';
    return `${cfg.prefix}_${stamp()}${lbl}.${ext}`;
  };

  $('start').onclick = async () => {
    if (onBeforeStart && !onBeforeStart()) return;
    try {
      reset(); chunks = [];
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const cands = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      let mt = '';
      for (const c of cands) if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) { mt = c; break; }
      mr = mt ? new MediaRecorder(stream, { mimeType: mt }) : new MediaRecorder(stream);
      const usedMime = (mr.mimeType || mt || '').toLowerCase();
      const nativeM4a = usedMime.includes('mp4');
      ext = nativeM4a ? 'm4a' : 'mp3';
      mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        const raw = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (nativeM4a) {
          blob = raw;
        } else {
          try {
            toast('Encoding MP3…', 1500);
            blob = await convertToMp3(raw);
          } catch (err) {
            console.error(err);
            toast('MP3 encode failed — saving original. ' + (err.message || ''), 5000);
            blob = raw;
            ext = usedMime.includes('ogg') ? 'ogg' : 'webm';
          }
        }
        $('audio').src = URL.createObjectURL(blob);
        $('out').classList.remove('hidden');
        $('path').textContent = cfg.subpath + '/' + filename();
      };
      mr.start();
      t0 = Date.now();
      timer = setInterval(tick, 250);
      $('dot').classList.add('live');
      $('wave').classList.add('live');
      $('start').classList.add('hidden');
      $('stop').classList.remove('hidden');
      if (containerId === 'rec-jam') {
        const cd = document.getElementById('jam-countdown');
        if (cd) {
          cd.classList.remove('live');
          void cd.offsetWidth; // Force element reflow to restart CSS keyframe animation
          cd.classList.add('live');
        }
      }
    } catch (e) {
      console.error(e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
        toast('Mic blocked — allow microphone in browser/OS settings.', 4000);
      else if (e.name === 'NotFoundError')
        toast('No microphone found on this device.', 4000);
      else if (!window.isSecureContext)
        toast('Mic requires HTTPS. Open via https:// or localhost.', 5000);
      else toast('Mic error: ' + e.message, 4000);
    }
  };

  $('stop').onclick = () => {
    mr && mr.stop();
    clearInterval(timer);
    $('dot').classList.remove('live');
    $('wave').classList.remove('live');
    $('start').classList.remove('hidden');
    $('stop').classList.add('hidden');
    if (containerId === 'rec-jam') {
      const cd = document.getElementById('jam-countdown');
      if (cd) cd.classList.remove('live');
    }
  };

  $('save').onclick = async () => {
    if (!blob) return;
    if (!fsSupported) { downloadBlob(filename(), blob); toast('Downloaded — move into vault manually.'); return; }
    try {
      if (!getVaultRoot()) { toast('Pick your vault folder first.'); document.getElementById('pickVault').click(); return; }
      const p = await saveToVault(cfg.subpath, filename(), blob);
      toast('Saved: ' + p, 3000);
    } catch (e) { console.error(e); toast('Save failed — try Download.'); }
  };
  $('dl').onclick = () => blob && downloadBlob(filename(), blob);
  $('clear').onclick = () => reset();
}
