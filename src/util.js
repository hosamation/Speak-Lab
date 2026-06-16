export const pad = n => String(n).padStart(2, '0');
export const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
};
export const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);

/**
 * Legacy pickRandom — still used for one-off randomness where no-repeat isn't needed.
 */
export function pickRandom(arr, not){
  if(arr.length < 2) return arr[0];
  let v;
  do { v = arr[Math.floor(Math.random()*arr.length)]; } while(v === not);
  return v;
}

/**
 * No-repeat shuffler: cycles through every item in `pool` before repeating.
 * State is persisted in localStorage so refreshing the page continues the cycle.
 *
 * Usage:
 *   const shuffler = makeShuffler('jam', DATA_jam);
 *   const q = shuffler.next();            // get next unseen item
 *   shuffler.updatePool(newPool);          // change pool (e.g. level/category switch)
 */
export function makeShuffler(key, pool) {
  const storageKey = `sl_seen_${key}`;

  function loadSeen() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveSeen(seen) {
    localStorage.setItem(storageKey, JSON.stringify(seen));
  }

  let currentPool = pool;
  let seen = loadSeen();

  function next() {
    if (!currentPool || currentPool.length === 0) return undefined;

    // Build list of unseen items (by index)
    const unseen = [];
    for (let i = 0; i < currentPool.length; i++) {
      // For objects (tongue twisters), compare by JSON string; for strings, compare directly
      const item = typeof currentPool[i] === 'string' ? currentPool[i] : JSON.stringify(currentPool[i]);
      if (!seen.includes(item)) unseen.push(i);
    }

    // If all seen, reset the cycle
    if (unseen.length === 0) {
      seen = [];
      saveSeen(seen);
      // All items are unseen again
      for (let i = 0; i < currentPool.length; i++) unseen.push(i);
    }

    // Pick a random unseen item
    const idx = unseen[Math.floor(Math.random() * unseen.length)];
    const picked = currentPool[idx];
    const serialized = typeof picked === 'string' ? picked : JSON.stringify(picked);
    seen.push(serialized);
    saveSeen(seen);

    return picked;
  }

  function updatePool(newPool) {
    currentPool = newPool;
    // When pool changes (e.g. level switch), reload seen but keep it —
    // items already seen in the new pool stay seen until the full cycle completes.
  }

  function resetSeen() {
    seen = [];
    saveSeen(seen);
  }

  return { next, updatePool, resetSeen };
}

const toastEl = document.getElementById('toast');
export function toast(msg, ms = 2200){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), ms);
}
export function downloadBlob(name, blob){
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
