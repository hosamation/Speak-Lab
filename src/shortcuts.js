// Keyboard shortcuts for power users
import { toast } from './util.js';

const SHORTCUTS = {
  'Ctrl+R': 'Start recording',
  'Cmd+R': 'Start recording',
  'Space': 'Stop recording (when active)',
  'Ctrl+S': 'Save to vault',
  'Cmd+S': 'Save to vault',
  'Ctrl+D': 'Download recording',
  'Cmd+D': 'Download recording',
  'Ctrl+/': 'Show shortcuts help',
  'Cmd+/': 'Show shortcuts help',
};

let currentRecorder = null; // Track active recorder

export function registerRecorder(recorderId) {
  currentRecorder = recorderId;
}

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + R: Start recording
    if (modifier && e.key === 'r') {
      e.preventDefault();
      const btn = document.querySelector('[id$="-start"]:not(.hidden)');
      if (btn) {
        btn.click();
        toast('Recording started (Ctrl+R)', 1500);
      }
      return;
    }

    // Space: Stop recording (when active)
    if (e.code === 'Space' && e.target === document.body) {
      const stopBtn = document.querySelector('[id$="-stop"]:not(.hidden)');
      if (stopBtn) {
        e.preventDefault();
        stopBtn.click();
        toast('Recording stopped (Space)', 1500);
      }
      return;
    }

    // Ctrl/Cmd + S: Save to vault
    if (modifier && e.key === 's') {
      e.preventDefault();
      const btn = document.querySelector('[id$="-save"]:not(.hidden)');
      if (btn) {
        btn.click();
        toast('Saving to vault (Ctrl+S)', 1500);
      }
      return;
    }

    // Ctrl/Cmd + D: Download
    if (modifier && e.key === 'd') {
      e.preventDefault();
      const btn = document.querySelector('[id$="-dl"]:not(.hidden)');
      if (btn) {
        btn.click();
        toast('Downloading (Ctrl+D)', 1500);
      }
      return;
    }

    // Ctrl/Cmd + /: Show shortcuts help
    if (modifier && (e.key === '/' || e.key === '?')) {
      e.preventDefault();
      showShortcutsHelp();
      return;
    }
  });
}

function showShortcutsHelp() {
  const shortcuts = Object.entries(SHORTCUTS)
    .map(([key, desc]) => `<div class="shortcut-row"><kbd>${key}</kbd> <span>${desc}</span></div>`)
    .join('');

  const modal = document.createElement('div');
  modal.className = 'shortcuts-modal';
  modal.innerHTML = `
    <div class="shortcuts-content">
      <div class="shortcuts-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="shortcuts-close" aria-label="Close">✕</button>
      </div>
      <div class="shortcuts-list">
        ${shortcuts}
      </div>
      <div class="shortcuts-footer">Press Ctrl+/ (or Cmd+/) to toggle this help.</div>
    </div>
  `;

  const closeBtn = modal.querySelector('.shortcuts-close');
  closeBtn.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}
