// Favourites: save prompts from any module to revisit and practice later.
// Storage: localStorage `sl_favs_v1` = array of { id, module, text, meta, createdAt }.

const KEY = 'sl_favs_v1';

export const MODULE_LABEL = {
  jam: 'JAM',
  tt: 'Tongue Twister',
  imp: 'Impromptu',
  iv: 'Interview',
};

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

export function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function makeId(module, text) {
  return module + '::' + text;
}

export function isFav(module, text) {
  if (!text) return false;
  const id = makeId(module, text);
  return load().some(f => f.id === id);
}

export function toggle(module, text, meta) {
  if (!text) return false;
  const list = load();
  const id = makeId(module, text);
  const idx = list.findIndex(f => f.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    save(list);
    return false; // now un-favourited
  }
  list.unshift({ id, module, text, meta: meta || null, createdAt: Date.now() });
  save(list);
  return true; // now favourited
}

export function removeById(id) {
  save(load().filter(f => f.id !== id));
}

export function clearAll() {
  save([]);
}
