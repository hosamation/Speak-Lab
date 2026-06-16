// Main entry: loads data, wires tabs, builds recorders.
import { pickRandom, makeShuffler, toast } from './util.js';
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

// ── JAM (no-repeat shuffler) ──
const jamShuffler = makeShuffler('jam', DATA_jam);
let jamQ = jamShuffler.next();
const renderJam = () => { document.getElementById('jamQ').textContent = jamQ; };
makeRecorder('rec-jam', { subpath: PATHS.jam, prefix: 'jam', getLabel: () => jamQ });

// ── Tongue Twisters (no-repeat per level) ──
let ttLevel = 'easy';
const ttShufflers = {
  easy: makeShuffler('tt_easy', DATA_tt.easy),
  medium: makeShuffler('tt_medium', DATA_tt.medium),
  hard: makeShuffler('tt_hard', DATA_tt.hard),
};
let ttItem = ttShufflers[ttLevel].next();
const renderTT = () => {
  document.getElementById('ttFocus').textContent = 'Focus: ' + ttItem.focus;
  document.getElementById('ttQ').textContent = ttItem.text;
};
document.getElementById('ttLevel').onchange = e => {
  ttLevel = e.target.value;
  ttItem = ttShufflers[ttLevel].next();
  renderTT();
};
makeRecorder('rec-tt', { subpath: PATHS.tt, prefix: 'tt', getLabel: () => ttLevel + '_' + ttItem.focus });

// ── Impromptu (no-repeat per category) ──
const impSel = document.getElementById('impCat');
DATA_imp.forEach((c, i) => {
  const o = document.createElement('option'); o.value = i; o.textContent = c.category; impSel.appendChild(o);
});
let impCatIdx = -1;
const impPool = () => impCatIdx < 0 ? DATA_imp.flatMap(c => c.questions) : DATA_imp[impCatIdx].questions;

// Create shufflers: one for "all" and one per category
const impShufflers = { all: makeShuffler('imp_all', impPool()) };
DATA_imp.forEach((c, i) => {
  impShufflers[i] = makeShuffler(`imp_${i}`, c.questions);
});
const currentImpShuffler = () => impCatIdx < 0 ? impShufflers.all : impShufflers[impCatIdx];

let impQ = currentImpShuffler().next();
const renderImp = () => { document.getElementById('impQ').textContent = impQ; };
impSel.onchange = e => { impCatIdx = +e.target.value; impQ = currentImpShuffler().next(); renderImp(); };
makeRecorder('rec-imp', { subpath: PATHS.imp, prefix: 'impromptu', getLabel: () => impQ });

// ── Interview (no-repeat per category) ──
const ivSel = document.getElementById('ivCat');
DATA_iv.forEach((c, i) => {
  const o = document.createElement('option'); o.value = i; o.textContent = c.category; ivSel.appendChild(o);
});
let ivCatIdx = -1;
const ivPool = () => ivCatIdx < 0 ? DATA_iv.flatMap(c => c.questions) : DATA_iv[ivCatIdx].questions;

const ivShufflers = { all: makeShuffler('iv_all', ivPool()) };
DATA_iv.forEach((c, i) => {
  ivShufflers[i] = makeShuffler(`iv_${i}`, c.questions);
});
const currentIvShuffler = () => ivCatIdx < 0 ? ivShufflers.all : ivShufflers[ivCatIdx];

let ivQ = currentIvShuffler().next();
const renderIv = () => { document.getElementById('ivQ').textContent = ivQ; };
ivSel.onchange = e => { ivCatIdx = +e.target.value; ivQ = currentIvShuffler().next(); renderIv(); };
makeRecorder('rec-iv', { subpath: PATHS.iv, prefix: 'interview', getLabel: () => ivQ });

// ── Free — custom prompt ──
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

// ── Shuffle buttons (use no-repeat shufflers) ──
document.querySelectorAll('[data-shuffle]').forEach(b => {
  b.onclick = () => {
    const k = b.dataset.shuffle;
    if (k === 'jam') { jamQ = jamShuffler.next(); renderJam(); }
    if (k === 'tt') { ttItem = ttShufflers[ttLevel].next(); renderTT(); }
    if (k === 'imp') { impQ = currentImpShuffler().next(); renderImp(); }
    if (k === 'iv') { ivQ = currentIvShuffler().next(); renderIv(); }
  };
});

renderJam(); renderTT(); renderImp(); renderIv();
wireVaultButtons();
refreshVaultBar();
renderStreak(document.getElementById('streakCard'));