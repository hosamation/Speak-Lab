// Main entry: loads data, wires tabs, builds recorders.
import { pickRandom, makeShuffler, toast } from './util.js';
import { wireVaultButtons, refreshVaultBar } from './vault.js';
import { makeRecorder } from './recorder.js';
import { renderStreak } from './streak.js';
import { setupExportImportUI } from './favourites-export.js';
import { setupSearchUI } from './search.js';
import { setupKeyboardShortcuts } from './shortcuts.js';
import { load as loadFavs, toggle as toggleFav, isFav, removeById as removeFav, clearAll as clearFavs, MODULE_LABEL as FAV_LABEL } from './favourites.js';
import DATA_jam from './data/jam.json';
import DATA_tt from './data/tongue-twisters.json';
import DATA_imp from './data/impromptu.json';
import DATA_iv from './data/interview.json';

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

// tabs
document.querySelectorAll('.tabs button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ['jam', 'tt', 'imp', 'iv', 'free', 'fav'].forEach(t =>
      document.getElementById('tab-' + t).classList.toggle('hidden', t !== b.dataset.tab)
    );
    if (b.dataset.tab === 'fav') renderFavList();
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
  freeCfg.subpath = PATHS[mod] || PATHS.jam;
  freeCfg.prefix = PREFIX[mod] || PREFIX.jam;
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
  syncFreeCfg(); // Ensure path/prefix sync when module changes
  if (freePrompt) renderFree();
};
freeTextEl.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') renderFree();
});

// Initialize with current module before creating recorder
syncFreeCfg();
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

// ── Favourites wiring ──
const favBtns = {
  jam: document.querySelector('[data-fav="jam"]'),
  tt: document.querySelector('[data-fav="tt"]'),
  imp: document.querySelector('[data-fav="imp"]'),
  iv: document.querySelector('[data-fav="iv"]'),
  free: document.querySelector('[data-fav="free"]'),
};

// Returns current { text, meta } for a module — or null if nothing to favourite.
const getCurrent = (module) => {
  switch (module) {
    case 'jam': return jamQ ? { text: jamQ, meta: null } : null;
    case 'tt': return ttItem ? { text: ttItem.text, meta: { focus: ttItem.focus, level: ttLevel } } : null;
    case 'imp': return impQ ? { text: impQ, meta: null } : null;
    case 'iv': return ivQ ? { text: ivQ, meta: null } : null;
    case 'free': {
      const t = freeTextEl.value.trim();
      return t ? { text: t, meta: { targetModule: freeModuleEl.value } } : null;
    }
    default: return null;
  }
};

const updateFavBtn = (module) => {
  const btn = favBtns[module]; if (!btn) return;
  const cur = getCurrent(module);
  const on = !!(cur && isFav(module === 'free' ? (cur.meta?.targetModule || 'jam') : module, cur.text));
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.textContent = on ? '★' : '☆';
};

Object.keys(favBtns).forEach(module => {
  const btn = favBtns[module]; if (!btn) return;
  btn.onclick = () => {
    const cur = getCurrent(module);
    if (!cur) { toast(module === 'free' ? 'Enter a prompt first.' : 'No prompt to save yet.'); return; }
    const saveAs = module === 'free' ? (cur.meta?.targetModule || 'jam') : module;
    const nowOn = toggleFav(saveAs, cur.text, cur.meta);
    toast(nowOn ? `★ Added to favourites (${FAV_LABEL[saveAs]})` : 'Removed from favourites');
    updateFavBtn(module);
    updateFavCount();
    renderFavList();
  };
});

// Re-wrap renderers so they also refresh fav-button state.
const _renderJam = renderJam, _renderTT = renderTT, _renderImp = renderImp, _renderIv = renderIv, _renderFree = renderFree;
const wrapRender = (orig, module) => () => { orig(); updateFavBtn(module); };
const renderJamX = wrapRender(_renderJam, 'jam');
const renderTTX = wrapRender(_renderTT, 'tt');
const renderImpX = wrapRender(_renderImp, 'imp');
const renderIvX = wrapRender(_renderIv, 'iv');
const renderFreeX = wrapRender(_renderFree, 'free');

// Shuffle buttons are already wired above (lines 164-173); wrapped renderers update fav buttons.
document.getElementById('ttLevel').addEventListener('change', () => updateFavBtn('tt'));
impSel.addEventListener('change', () => updateFavBtn('imp'));
ivSel.addEventListener('change', () => updateFavBtn('iv'));
document.getElementById('freeApply').addEventListener('click', () => updateFavBtn('free'));
freeTextEl.addEventListener('input', () => updateFavBtn('free'));
freeModuleEl.addEventListener('change', () => updateFavBtn('free'));

// Switch active tab by data-tab key.
function switchTab(key) {
  const btn = document.querySelector(`.tabs button[data-tab="${key}"]`);
  if (btn) btn.click();
}

// Practice a saved favourite — load it back into its module and switch tab.
function practiceFav(fav) {
  switch (fav.module) {
    case 'jam':
      jamQ = fav.text; renderJamX(); switchTab('jam'); break;
    case 'tt':
      ttItem = { text: fav.text, focus: fav.meta?.focus || '' };
      if (fav.meta?.level) {
        ttLevel = fav.meta.level;
        document.getElementById('ttLevel').value = ttLevel;
      }
      renderTTX(); switchTab('tt'); break;
    case 'imp':
      impQ = fav.text; renderImpX(); switchTab('imp'); break;
    case 'iv':
      ivQ = fav.text; renderIvX(); switchTab('iv'); break;
  }
  // Scroll the recorder into view for immediate use.
  setTimeout(() => {
    const card = document.getElementById('tab-' + fav.module);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

// Render the Favourites list.
const favListEl = document.getElementById('favList');
const favEmptyEl = document.getElementById('favEmpty');
const favClearBtn = document.getElementById('favClear');
const favCountEl = document.getElementById('favCount');

function updateFavCount() {
  const n = loadFavs().length;
  if (n > 0) { favCountEl.textContent = n; favCountEl.hidden = false; }
  else { favCountEl.hidden = true; }
}

function renderFavList() {
  const items = loadFavs();
  updateFavCount();
  if (!items.length) {
    favListEl.innerHTML = '';
    favEmptyEl.classList.remove('hidden');
    favClearBtn.classList.add('hidden');
    return;
  }
  favEmptyEl.classList.add('hidden');
  favClearBtn.classList.remove('hidden');
  // Group by module
  const groups = {};
  for (const f of items) (groups[f.module] ||= []).push(f);
  favListEl.innerHTML = Object.keys(groups).map(mod => `
    <div class="fav-group">
      <div class="fav-group-title"><span class="badge">${FAV_LABEL[mod] || mod}</span> <span class="fav-group-count">${groups[mod].length}</span></div>
      <ul class="fav-items">
        ${groups[mod].map(f => `
          <li class="fav-item" data-id="${escapeAttr(f.id)}">
            <div class="fav-text">${escapeHtml(f.text)}${f.meta?.focus ? ` <span class="fav-meta">· focus: ${escapeHtml(f.meta.focus)}</span>` : ''}</div>
            <div class="fav-actions">
              <button class="btn primary fav-practice">▶ Practice</button>
              <button class="btn ghost fav-remove" title="Remove">✕</button>
            </div>
          </li>`).join('')}
      </ul>
    </div>
  `).join('');
  // Wire item actions
  favListEl.querySelectorAll('.fav-item').forEach(li => {
    const id = li.dataset.id;
    const fav = items.find(f => f.id === id);
    if (!fav) return;
    li.querySelector('.fav-practice').onclick = () => practiceFav(fav);
    li.querySelector('.fav-remove').onclick = () => {
      removeFav(id);
      renderFavList();
      // refresh stars in case current question matches
      ['jam', 'tt', 'imp', 'iv', 'free'].forEach(updateFavBtn);
    };
  });
}

favClearBtn.onclick = () => {
  if (!confirm('Remove all favourites?')) return;
  clearFavs();
  renderFavList();
  ['jam', 'tt', 'imp', 'iv', 'free'].forEach(updateFavBtn);
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

renderJamX(); renderTTX(); renderImpX(); renderIvX();
['jam', 'tt', 'imp', 'iv', 'free'].forEach(updateFavBtn);
renderFavList();
wireVaultButtons();
refreshVaultBar();
renderStreak(document.getElementById('streakCard'));

// ── Handle search result clicks ──
// search.js dispatches a 'loadPrompt' event when a user clicks a search result.
document.addEventListener('loadPrompt', (e) => {
  const { module, text } = e.detail;
  switch (module) {
    case 'jam':
      jamQ = text; renderJamX(); switchTab('jam'); break;
    case 'tt': {
      // Try to find the full item from data to get focus/level info
      let found = null;
      for (const lvl of ['easy', 'medium', 'hard']) {
        const item = DATA_tt[lvl].find(t => t.text === text);
        if (item) { found = item; ttLevel = lvl; document.getElementById('ttLevel').value = lvl; break; }
      }
      ttItem = found || { text, focus: '' };
      renderTTX(); switchTab('tt'); break;
    }
    case 'imp':
      impQ = text; renderImpX(); switchTab('imp'); break;
    case 'iv':
      ivQ = text; renderIvX(); switchTab('iv'); break;
  }
});

// Initialize enhancements
setupExportImportUI();
setupSearchUI();
setupKeyboardShortcuts();

// Refresh favourites UI when import completes
document.addEventListener('favouritesChanged', () => {
  renderFavList();
  ['jam', 'tt', 'imp', 'iv', 'free'].forEach(updateFavBtn);
});