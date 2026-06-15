// Practice streak: GitHub-style heatmap persisted in a cookie.
// Speak Lab palette: deep primary → primary → indigo → accent purple.

const COOKIE_NAME = 'sl_streak';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years
const WEEKS = 53;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readCookie() {
  const m = document.cookie.split('; ').find(r => r.startsWith(COOKIE_NAME + '='));
  if (!m) return { v: 1, days: {} };
  try {
    const data = JSON.parse(decodeURIComponent(m.slice(COOKIE_NAME.length + 1)));
    if (!data || typeof data !== 'object' || !data.days) return { v: 1, days: {} };
    return data;
  } catch { return { v: 1, days: {} }; }
}

let writeTimer = null;
function writeCookie(data) {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const v = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${COOKIE_NAME}=${v}; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; path=/`;
  }, 50);
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
  const data = readCookie();
  const k = dayKey(new Date());
  data.days[k] = (data.days[k] || 0) + 1;
  pruneOld(data);
  writeCookie(data);
  if (renderTarget) renderStreak(renderTarget);
}

export function renderStreak(container) {
  if (!container) return;
  renderTarget = container;
  const data = pruneOld(readCookie());

  // End on today; start aligned to previous Sunday so columns are clean weeks.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));
  // Align start to Sunday
  start.setDate(start.getDate() - start.getDay());

  // Build weeks
  const weeks = [];
  const monthLabels = []; // {col, label}
  let lastMonth = -1;
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const inRange = cursor <= end;
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