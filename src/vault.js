// IndexedDB-backed File System Access API helpers for saving into a folder.
import { toast } from './util.js';

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('vault-handles', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(k) {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = db.transaction('h', 'readonly').objectStore('h').get(k);
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
}
async function idbSet(k, v) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('h', 'readwrite');
    tx.objectStore('h').put(v, k);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function idbDel(k) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('h', 'readwrite');
    tx.objectStore('h').delete(k);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}

export const fsSupported = 'showDirectoryPicker' in window;
let vaultRoot = null;
export const getVaultRoot = () => vaultRoot;

export async function refreshVaultBar() {
  const status = document.getElementById('vaultStatus');
  const pick = document.getElementById('pickVault');
  const forget = document.getElementById('forgetVault');
  const bar = document.getElementById('vaultBar');

  if (!fsSupported) {
    bar.classList.add('warning-state');
    status.innerHTML = '<span class="warning-icon">⚠️</span> <span class="warning-msg">This browser doesn\'t support direct folder access. Recordings will <b>download</b> — move them to your vault manually.</span>';
    status.className = 'warning-bar-status';
    pick.classList.add('hidden'); forget.classList.add('hidden');
    return;
  }

  bar.classList.remove('warning-state');
  status.className = '';

  const h = await idbGet('vault-root');
  if (h) {
    const p = await h.queryPermission({ mode: 'readwrite' });
    if (p === 'granted') {
      vaultRoot = h;
      status.innerHTML = '✅ Vault connected — recordings save into your folders.';
      pick.textContent = 'Change folder';
      forget.classList.remove('hidden');
      return;
    }
  }
  vaultRoot = null;
  status.textContent = '📁 Connect your vault folder to save recordings directly.';
  pick.textContent = 'Pick vault folder';
  forget.classList.add('hidden');
}

export function wireVaultButtons() {
  document.getElementById('pickVault').onclick = async () => {
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      await idbSet('vault-root', h);
      vaultRoot = h;
      toast('Vault folder connected.');
      refreshVaultBar();
    } catch { toast('Cancelled.'); }
  };
  document.getElementById('forgetVault').onclick = async () => {
    await idbDel('vault-root');
    vaultRoot = null;
    toast('Forgotten.');
    refreshVaultBar();
  };
}

async function ensureDir(root, parts) {
  let d = root;
  for (const p of parts) d = await d.getDirectoryHandle(p, { create: true });
  return d;
}
export async function saveToVault(subpath, filename, blob) {
  if (!vaultRoot) throw new Error('Vault not connected. Pick your vault folder first.');
  if (!blob || blob.size === 0) throw new Error('Recording is empty.');
  if (!filename || !subpath) throw new Error('Invalid filename or path.');
  try {
    const dir = await ensureDir(vaultRoot, subpath.split('/').filter(Boolean));
    const fh = await dir.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
    return subpath + '/' + filename;
  } catch (e) {
    if (e.name === 'NotAllowedError') throw new Error('Permission denied. Try picking the vault folder again.');
    if (e.name === 'QuotaExceededError') throw new Error('Storage quota exceeded.');
    throw e;
  }
}
