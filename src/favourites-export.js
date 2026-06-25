// Favourites export/import: backup and restore saved prompts
import { load as loadFavs, save as saveFavs } from './favourites.js';
import { toast, downloadBlob } from './util.js';

export function exportFavourites() {
  const favs = loadFavs();
  if (!favs.length) {
    toast('No favourites to export.');
    return;
  }
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: favs.length,
    favourites: favs,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `speak-lab-favourites-${new Date().toISOString().split('T')[0]}.json`;
  downloadBlob(filename, blob);
  toast(`Exported ${favs.length} favourite(s).`);
}

export function importFavourites(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.favourites || !Array.isArray(data.favourites)) {
          throw new Error('Invalid export format.');
        }
        const existing = loadFavs();
        const merged = [...existing];
        let added = 0;
        for (const fav of data.favourites) {
          if (!merged.find(f => f.id === fav.id)) {
            merged.push(fav);
            added++;
          }
        }
        saveFavs(merged);
        toast(`Imported ${added} new favourite(s).`);
        // Notify app to refresh the favourites UI
        document.dispatchEvent(new CustomEvent('favouritesChanged'));
        resolve(added);
      } catch (err) {
        toast(`Import failed: ${err.message}`);
        reject(err);
      }
    };
    reader.onerror = () => {
      toast('Failed to read file.');
      reject(new Error('File read error'));
    };
    reader.readAsText(file);
  });
}

export function setupExportImportUI() {
  const favListEl = document.getElementById('favList');
  if (!favListEl) return;

  // Create export/import buttons container if it doesn't exist
  const favClearBtn = document.getElementById('favClear');
  if (favClearBtn && !document.getElementById('favExportBtn')) {
    const btnContainer = favClearBtn.parentElement;

    const exportBtn = document.createElement('button');
    exportBtn.id = 'favExportBtn';
    exportBtn.className = 'btn ghost';
    exportBtn.title = 'Export favourites as JSON';
    exportBtn.textContent = '⬇️ Export';
    exportBtn.onclick = exportFavourites;
    btnContainer.insertBefore(exportBtn, favClearBtn);

    const importBtn = document.createElement('button');
    importBtn.id = 'favImportBtn';
    importBtn.className = 'btn ghost';
    importBtn.title = 'Import favourites from JSON';
    importBtn.textContent = '⬆️ Import';
    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) importFavourites(file);
      };
      input.click();
    };
    btnContainer.insertBefore(importBtn, favClearBtn);
  }
}
