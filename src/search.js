// Prompt search and filter: find prompts across all modules
import DATA_jam from './data/jam.json';
import DATA_tt from './data/tongue-twisters.json';
import DATA_imp from './data/impromptu.json';
import DATA_iv from './data/interview.json';

/**
 * Simple fuzzy search: checks if all query chars appear in text in order
 */
function fuzzyMatch(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Search across all prompt modules
 * Returns array of { module, text, meta, score }
 */
export function searchPrompts(query) {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();
  const results = [];

  // Search JAM
  DATA_jam.forEach(text => {
    if (fuzzyMatch(q, text)) {
      results.push({ module: 'jam', text, meta: null, score: text.length });
    }
  });

  // Search Tongue Twisters
  ['easy', 'medium', 'hard'].forEach(level => {
    DATA_tt[level].forEach(item => {
      if (fuzzyMatch(q, item.text)) {
        results.push({ module: 'tt', text: item.text, meta: { focus: item.focus, level }, score: item.text.length });
      }
    });
  });

  // Search Impromptu
  DATA_imp.forEach(cat => {
    cat.questions.forEach(text => {
      if (fuzzyMatch(q, text)) {
        results.push({ module: 'imp', text, meta: { category: cat.category }, score: text.length });
      }
    });
  });

  // Search Interview
  DATA_iv.forEach(cat => {
    cat.questions.forEach(text => {
      if (fuzzyMatch(q, text)) {
        results.push({ module: 'iv', text, meta: { category: cat.category }, score: text.length });
      }
    });
  });

  // Sort by score (shorter = better match)
  return results.sort((a, b) => a.score - b.score);
}

/**
 * Highlight search query in text
 */
export function highlightMatch(text, query) {
  if (!query) return text;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const parts = [];
  let lastIdx = 0;
  let qi = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti > lastIdx) {
        parts.push({ text: text.slice(lastIdx, ti), highlight: false });
      }
      parts.push({ text: text[ti], highlight: true });
      lastIdx = ti + 1;
      qi++;
    }
  }
  if (lastIdx < text.length) {
    parts.push({ text: text.slice(lastIdx), highlight: false });
  }

  return parts.map(p =>
    p.highlight ? `<mark>${p.text}</mark>` : p.text
  ).join('');
}

/**
 * Setup search UI in the app
 */
export function setupSearchUI() {
  const tabsEl = document.querySelector('.tabs');
  if (!tabsEl || document.getElementById('searchBar')) return;

  // Create search bar
  const searchBar = document.createElement('div');
  searchBar.id = 'searchBar';
  searchBar.className = 'search-bar';
  searchBar.innerHTML = `
    <input type="text" id="searchInput" placeholder="Search all prompts..." class="search-input" />
    <div id="searchResults" class="search-results hidden"></div>
  `;
  tabsEl.parentElement.insertBefore(searchBar, tabsEl.nextElementSibling);

  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length < 2) {
      searchResults.classList.add('hidden');
      return;
    }

    const results = searchPrompts(query);
    if (!results.length) {
      searchResults.innerHTML = '<div class="search-empty">No prompts found.</div>';
      searchResults.classList.remove('hidden');
      return;
    }

    const html = results.slice(0, 10).map(r => `
      <div class="search-result" data-module="${r.module}" data-text="${escapeAttr(r.text)}">
        <div class="search-result-module">${r.meta?.category || r.meta?.level || r.module.toUpperCase()}</div>
        <div class="search-result-text">${highlightMatch(r.text, query)}</div>
      </div>
    `).join('');
    searchResults.innerHTML = html;
    searchResults.classList.remove('hidden');

    // Wire click handlers
    searchResults.querySelectorAll('.search-result').forEach(el => {
      el.onclick = () => {
        const module = el.dataset.module;
        const text = el.dataset.text;
        loadPromptInModule(module, text);
        searchInput.value = '';
        searchResults.classList.add('hidden');
      };
    });
  });

  // Close search on escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults.classList.add('hidden');
    }
  });
}

/**
 * Load a prompt into its module and switch tab
 */
function loadPromptInModule(module, text) {
  // This function is called from app.js context, so we dispatch a custom event
  const event = new CustomEvent('loadPrompt', { detail: { module, text } });
  document.dispatchEvent(event);
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
