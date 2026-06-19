// Practice streak: GitHub-style heatmap persisted in localStorage.
// Speak Lab palette: deep primary → primary → indigo → accent purple.

const STORAGE_KEY = 'sl_streak';
const COOKIE_NAME = 'sl_streak'; // legacy – used only for one-time migration
const WEEKS = 53;
const SCHEMA_VERSION = 2;

const MODULE_LABELS = {
  jam: 'JAM',
  tt: 'Tongue Twisters',
  impromptu: 'Impromptu',
  interview: 'Interview',
  other: 'Other',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ── One-time migration: cookie → localStorage ── */
function migrateCookieIfNeeded() {
  const m = document.cookie.split('; ').find(r => r.startsWith(COOKIE_NAME + '='));
  if (!m) return;
  try {
    const data = JSON.parse(decodeURIComponent(m.slice(COOKIE_NAME.length + 1)));
    if (data && typeof data === 'object' && data.days) {
      const existing = readStorage();
      for (const [k, v] of Object.entries(data.days)) {
        const cur = existing.days[k];
        const prev = typeof cur === 'object' && cur ? cur.total : (cur || 0);
        existing.days[k] = { total: Math.max(prev, v), modules: (typeof cur === 'object' && cur && cur.modules) || {} };
      }
      writeStorage(existing);
    }
  } catch { /* ignore corrupt cookie */ }
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; SameSite=Lax; path=/`;
}

/* ── localStorage read / write with v1→v2 migration ── */
function emptyStore() {
  return { v: SCHEMA_VERSION, days: {}, modules: {}, longest: 0 };
}

function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.days) return emptyStore();
    // Migrate v1 (days[k] = number) → v2 (days[k] = {total, modules})
    if (!data.v || data.v < 2) {
      const migrated = emptyStore();
      for (const [k, v] of Object.entries(data.days)) {
        if (typeof v === 'number') {
          migrated.days[k] = { total: v, modules: {} };
        } else if (v && typeof v === 'object') {
          migrated.days[k] = { total: v.total || 0, modules: v.modules || {} };
        }
      }
      migrated.modules = data.modules || {};
      migrated.longest = data.longest || 0;
      return migrated;
    }
    data.modules = data.modules || {};
    data.longest = data.longest || 0;
    return data;
  } catch { return emptyStore(); }
}

function writeStorage(data) {
  data.v = SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function pruneOld(data) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 400);
  const cut = dayKey(cutoff);
  for (const k of Object.keys(data.days)) {
    if (k < cut) delete data.days[k];
  }
  return data;
}

function level(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function dayTotal(entry) {
  if (!entry) return 0;
  if (typeof entry === 'number') return entry;
  return entry.total || 0;
}

function calcStreak(days) {
  let streak = 0;
  const d = new Date();
  if (!dayTotal(days[dayKey(d)])) d.setDate(d.getDate() - 1);
  while (dayTotal(days[dayKey(d)])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function calcLongest(days) {
  const keys = Object.keys(days).filter(k => dayTotal(days[k])).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const cur = new Date(k);
    if (prev) {
      const diff = Math.round((cur - prev) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = cur;
  }
  return best;
}

let renderTarget = null;

/**
 * Record a practice session.
 * @param {string} moduleKey - jam | tt | impromptu | interview
 * @param {number} durationSec - session length in seconds (optional)
 */
export function recordSession(moduleKey = 'other', durationSec = 0) {
  const data = readStorage();
  const k = dayKey(new Date());
  const cur = data.days[k] || { total: 0, modules: {} };
  cur.total = (cur.total || 0) + 1;
  cur.modules[moduleKey] = (cur.modules[moduleKey] || 0) + 1;
  data.days[k] = cur;

  // Lifetime per-module counters
  data.modules[moduleKey] = data.modules[moduleKey] || { count: 0, totalDuration: 0 };
  data.modules[moduleKey].count += 1;
  data.modules[moduleKey].totalDuration += Math.max(0, Math.round(durationSec));

  pruneOld(data);
  const longestNow = calcLongest(data.days);
  if (longestNow > (data.longest || 0)) data.longest = longestNow;

  writeStorage(data);
  if (renderTarget) renderStreak(renderTarget, data);
}

export function renderStreak(container, dataOverride) {
  if (!container) return;
  renderTarget = container;

  migrateCookieIfNeeded();

  const data = pruneOld(dataOverride || readStorage());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay());
  start.setDate(start.getDate() - (WEEKS - 1) * 7);

  const weeks = [];
  const monthLabels = [];
  let lastMonth = -1;
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const inRange = dayKey(cursor) <= dayKey(end);
      const key = dayKey(cursor);
      const count = inRange ? dayTotal(data.days[key]) : 0;
      col.push({ key, count, date: new Date(cursor), inRange });
      if (r === 0) {
        const m = cursor.getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ col: w, label: MONTHS[m] });
          lastMonth = m;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(col);
  }

  const totalSessions = Object.values(data.days).reduce((a, b) => a + dayTotal(b), 0);
  const activeDays = Object.values(data.days).filter(v => dayTotal(v) > 0).length;
  const streak = calcStreak(data.days);
  const longest = Math.max(data.longest || 0, calcLongest(data.days));

  // Weekly total (last 7 days incl. today)
  let weekTotal = 0;
  const w7 = new Date(today);
  for (let i = 0; i < 7; i++) {
    weekTotal += dayTotal(data.days[dayKey(w7)]);
    w7.setDate(w7.getDate() - 1);
  }

  const monthsHTML = monthLabels
    .filter((m, i) => i === 0 || m.col - monthLabels[i - 1].col >= 2)
    .map(m => `<span class="streak-month" style="grid-column:${m.col + 1}">${m.label}</span>`)
    .join('');

  const cellsHTML = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let r = 0; r < 7; r++) {
      const c = weeks[w][r];
      if (!c.inRange) {
        cellsHTML.push(`<div class="streak-cell empty" style="grid-column:${w + 1};grid-row:${r + 1}"></div>`);
        continue;
      }
      const lvl = level(c.count);
      const label = c.count
        ? `${c.count} session${c.count > 1 ? 's' : ''} on ${DOW[c.date.getDay()]}, ${MONTHS[c.date.getMonth()]} ${c.date.getDate()} ${c.date.getFullYear()}`
        : `No practice on ${DOW[c.date.getDay()]}, ${MONTHS[c.date.getMonth()]} ${c.date.getDate()} ${c.date.getFullYear()}`;
      cellsHTML.push(
        `<div class="streak-cell l${lvl}" style="grid-column:${w + 1};grid-row:${r + 1}" title="${label}" aria-label="${label}"></div>`
      );
    }
  }

  // Per-module breakdown
  const modOrder = ['jam', 'tt', 'impromptu', 'interview'];
  const modHTML = modOrder.map(m => {
    const info = data.modules[m] || { count: 0, totalDuration: 0 };
    const avg = info.count ? Math.round(info.totalDuration / info.count) : 0;
    const avgStr = avg ? `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')}` : '–';
    return `
      <div class="streak-mod">
        <div class="streak-mod-label">${MODULE_LABELS[m]}</div>
        <div class="streak-mod-count">${info.count}</div>
        <div class="streak-mod-avg">avg ${avgStr}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="streak-head">
      <div>
        <h2 class="streak-title">Your practice streak</h2>
        <div class="streak-sub">${totalSessions} session${totalSessions === 1 ? '' : 's'} · ${activeDays} active day${activeDays === 1 ? '' : 's'} · ${weekTotal} this week</div>
      </div>
      <div class="streak-flames">
        <div class="streak-flame" title="${streak} day current streak">
          <span class="streak-flame-emoji">🔥</span>
          <span class="streak-flame-num">${streak}</span>
          <span class="streak-flame-label">current</span>
        </div>
        <div class="streak-flame streak-flame--best" title="${longest} day longest streak">
          <span class="streak-flame-emoji">🏆</span>
          <span class="streak-flame-num">${longest}</span>
          <span class="streak-flame-label">best</span>
        </div>
      </div>
    </div>
    <div class="streak-modules">${modHTML}</div>
    <div class="streak-scroll" role="region" aria-label="Practice heatmap, scroll horizontally">
      <div class="streak-months" style="grid-template-columns:repeat(${WEEKS}, 11px)">${monthsHTML}</div>
      <div class="streak-grid" style="grid-template-columns:repeat(${WEEKS}, 11px)" role="grid" aria-label="Daily practice activity over the last year">${cellsHTML.join('')}</div>
    </div>
    <div class="streak-legend">
      <span>Less</span>
      <div class="streak-cell l0"></div>
      <div class="streak-cell l1"></div>
      <div class="streak-cell l2"></div>
      <div class="streak-cell l3"></div>
      <div class="streak-cell l4"></div>
      <span>More</span>
    </div>
  `;
}