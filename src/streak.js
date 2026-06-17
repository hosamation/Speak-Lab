// Practice streak: GitHub-style heatmap persisted in localStorage.
// Speak Lab palette: deep primary → primary → indigo → accent purple.

const STORAGE_KEY = 'sl_streak';
const COOKIE_NAME = 'sl_streak'; // legacy – used only for one-time migration
const WEEKS = 53;

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
      // Merge into any existing localStorage data (in case both exist)
      const existing = readStorage();
      for (const [k, v] of Object.entries(data.days)) {
        existing.days[k] = Math.max(existing.days[k] || 0, v);
      }
      writeStorage(existing);
    }
  } catch { /* ignore corrupt cookie */ }
  // Delete the old cookie
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; SameSite=Lax; path=/`;
}

/* ── localStorage read / write ── */
function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { v: 1, days: {} };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.days) return { v: 1, days: {} };
    return data;
  } catch { return { v: 1, days: {} }; }
}

function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function pruneOld(data) {
  // Keep only the last ~400 days
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

function calcStreak(days) {
  let streak = 0;
  const d = new Date();
  // If today has nothing yet, start from yesterday so morning visits still show streak
  if (!days[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (days[dayKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

let renderTarget = null;

export function recordSession() {
  const data = readStorage();
  const k = dayKey(new Date());
  data.days[k] = (data.days[k] || 0) + 1;
  pruneOld(data);
  writeStorage(data);
  if (renderTarget) renderStreak(renderTarget, data);
}

export function renderStreak(container, dataOverride) {
  if (!container) return;
  renderTarget = container;

  // Run migration on first render
  migrateCookieIfNeeded();

  const data = pruneOld(dataOverride || readStorage());

  // GitHub-style window: 53 week columns ending in the current week (today included).
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay()); // Sunday of this week
  start.setDate(start.getDate() - (WEEKS - 1) * 7); // back 52 more weeks

  // Build weeks
  const weeks = [];
  const monthLabels = []; // {col, label}
  let lastMonth = -1;
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const inRange = dayKey(cursor) <= dayKey(end);
      const key = dayKey(cursor);
      const count = inRange ? (data.days[key] || 0) : 0;
      col.push({ key, count, date: new Date(cursor), inRange });
      // capture month label at row 0 (top of column)
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

  const totalSessions = Object.values(data.days).reduce((a, b) => a + b, 0);
  const activeDays = Object.keys(data.days).length;
  const streak = calcStreak(data.days);

  // Build HTML
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
        `<div class="streak-cell l${lvl}" style="grid-column:${w + 1};grid-row:${r + 1}" title="${label}"></div>`
      );
    }
  }

  container.innerHTML = `
    <div class="streak-head">
      <div>
        <h2 class="streak-title">Your practice streak</h2>
        <div class="streak-sub">${totalSessions} session${totalSessions === 1 ? '' : 's'} · ${activeDays} active day${activeDays === 1 ? '' : 's'} in the last year</div>
      </div>
      <div class="streak-flame" title="${streak} day streak">
        <span class="streak-flame-emoji">🔥</span>
        <span class="streak-flame-num">${streak}</span>
        <span class="streak-flame-label">day${streak === 1 ? '' : 's'}</span>
      </div>
    </div>
    <div class="streak-scroll">
      <div class="streak-months" style="grid-template-columns:repeat(${WEEKS}, 11px)">${monthsHTML}</div>
      <div class="streak-grid" style="grid-template-columns:repeat(${WEEKS}, 11px)">${cellsHTML.join('')}</div>
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