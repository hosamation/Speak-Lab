// Main entry: loads data, wires tabs, builds recorders.
import { pickRandom, toast } from './util.js';
import { wireVaultButtons, refreshVaultBar } from './vault.js';
import { makeRecorder } from './recorder.js';
import { renderStreak } from './streak.js';

const PATHS = {
  jam: '07-Attachments/Audio/Recordings/JAM-Recordings',
  tt: '07-Attachments/Audio/Recordings/Tongue-Twisters-Recordings',
  imp: '07-Attachments/Audio/Recordings/Impromptu-Recordings',
  iv: '07-Attachments/Audio/Recordings/Interview-Recordings',
};

const PREFIX = {
  jam: 'jam',
  tt: 'tt',
  imp: 'impromptu',
  iv: 'interview',
};

const MODULE_LABEL = {
  jam: 'JAM',
  tt: 'Tongue Twisters',
  imp: 'Impromptu',
  iv: 'Interview',
};

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error('Failed to load ' + path);
  return r.json();
}

const [DATA_jam, DATA_tt, DATA_imp, DATA_iv] = await Promise.all([
  loadJSON('./src/data/jam.json'),
  loadJSON('./src/data/tongue-twisters.json'),
  loadJSON('./src/data/impromptu.json'),
  loadJSON('./src/data/interview.json'),
]);

// tabs
document.querySelectorAll('.tabs button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ['jam', 'tt', 'imp', 'iv', 'free'].forEach(t =>
      document.getElementById('tab-' + t).classList.toggle('hidden', t !== b.dataset.tab)
    );
  };
});

// JAM
let jamQ = pickRandom(DATA_jam);
const renderJam = () => { document.getElementById('jamQ').textContent = jamQ; };
makeRecorder('rec-jam', { subpath: PATHS.jam, prefix: 'jam', getLabel: () => jamQ });

// Tongue
let ttLevel = 'easy', ttItem = pickRandom(DATA_tt.easy);
const renderTT = () => {
  document.getElementById('ttFocus').textContent = 'Focus: ' + ttItem.focus;
  document.getElementById('ttQ').textContent = ttItem.text;
};
document.getElementById('ttLevel').onchange = e => {
  ttLevel = e.target.value;
  ttItem = pickRandom(DATA_tt[ttLevel]);
  renderTT();
};
makeRecorder('rec-tt', { subpath: PATHS.tt, prefix: 'tt', getLabel: () => ttLevel + '_' + ttItem.focus });

// Impromptu
const impSel = document.getElementById('impCat');
DATA_imp.forEach((c, i) => {
  const o = document.createElement('option'); o.value = i; o.textContent = c.category; impSel.appendChild(o);
});
let impCatIdx = -1;
const impPool = () => impCatIdx < 0 ? DATA_imp.flatMap(c => c.questions) : DATA_imp[impCatIdx].questions;
let impQ = pickRandom(impPool());
const renderImp = () => { document.getElementById('impQ').textContent = impQ; };
impSel.onchange = e => { impCatIdx = +e.target.value; impQ = pickRandom(impPool()); renderImp(); };
makeRecorder('rec-imp', { subpath: PATHS.imp, prefix: 'impromptu', getLabel: () => impQ });

// Interview
const ivSel = document.getElementById('ivCat');
DATA_iv.forEach((c, i) => {
  const o = document.createElement('option'); o.value = i; o.textContent = c.category; ivSel.appendChild(o);
});
let ivCatIdx = -1;
const ivPool = () => ivCatIdx < 0 ? DATA_iv.flatMap(c => c.questions) : DATA_iv[ivCatIdx].questions;
let ivQ = pickRandom(ivPool());
const renderIv = () => { document.getElementById('ivQ').textContent = ivQ; };
ivSel.onchange = e => { ivCatIdx = +e.target.value; ivQ = pickRandom(ivPool()); renderIv(); };
makeRecorder('rec-iv', { subpath: PATHS.iv, prefix: 'interview', getLabel: () => ivQ });

// Free — custom prompt
const freeTextEl = document.getElementById('freeText');
const freeModuleEl = document.getElementById('freeModule');
const freeQuoteWrap = document.getElementById('freeQuoteWrap');
const freeBadge = document.getElementById('freeBadge');
const freeQ = document.getElementById('freeQ');
let freePrompt = '';

const freeCfg = {
  subpath: PATHS.jam,
  prefix: PREFIX.jam,
  getLabel: () => freePrompt,
  onBeforeStart: () => {
    freePrompt = freeTextEl.value.trim();
    if (!freePrompt) {
      toast('Enter a prompt first.');
      return false;
    }
    syncFreeCfg();
    freeBadge.textContent = MODULE_LABEL[freeModuleEl.value];
    freeQ.textContent = freePrompt;
    freeQuoteWrap.classList.remove('hidden');
    return true;
  },
};

const syncFreeCfg = () => {
  const mod = freeModuleEl.value;
  freeCfg.subpath = PATHS[mod];
  freeCfg.prefix = PREFIX[mod];
};

const renderFree = () => {
  freePrompt = freeTextEl.value.trim();
  if (!freePrompt) {
    freeQuoteWrap.classList.add('hidden');
    freeQ.textContent = '';
    return;
  }
  syncFreeCfg();
  freeBadge.textContent = MODULE_LABEL[freeModuleEl.value];
  freeQ.textContent = freePrompt;
  freeQuoteWrap.classList.remove('hidden');
};

document.getElementById('freeApply').onclick = renderFree;
freeModuleEl.onchange = () => {
  if (freePrompt) renderFree();
};
freeTextEl.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') renderFree();
});

makeRecorder('rec-free', freeCfg);

// Shuffle buttons
document.querySelectorAll('[data-shuffle]').forEach(b => {
  b.onclick = () => {
    const k = b.dataset.shuffle;
    if (k === 'jam') { jamQ = pickRandom(DATA_jam, jamQ); renderJam(); }
    if (k === 'tt') { ttItem = pickRandom(DATA_tt[ttLevel], ttItem); renderTT(); }
    if (k === 'imp') { impQ = pickRandom(impPool(), impQ); renderImp(); }
    if (k === 'iv') { ivQ = pickRandom(ivPool(), ivQ); renderIv(); }
  };
});

renderJam(); renderTT(); renderImp(); renderIv();
wireVaultButtons();
refreshVaultBar();
renderStreak(document.getElementById('streakCard'));