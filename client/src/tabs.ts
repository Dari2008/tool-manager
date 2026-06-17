import { state, GALLERY_TAB, PLUGINS_TAB, WORKFLOW_TAB } from './state.ts';
import { tabsEl } from './dom.ts';
import type { PluginMeta } from './types.ts';

export function renderTabs(): void {
  tabsEl.innerHTML = '';
  tabsEl.appendChild(mkPluginTab('Gallery',  GALLERY_TAB,  true));
  tabsEl.appendChild(mkPluginTab('Workflow', WORKFLOW_TAB, true));
  for (const p of state.plugins) {
    tabsEl.appendChild(mkPluginTab(p.name, p.folder, p.enabled));
  }
}

export function mkPluginTab(label: string, folder: string, enabled: boolean): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'tab'
    + (folder === GALLERY_TAB || folder === WORKFLOW_TAB ? ' gallery-root' : '')
    + (!enabled ? ' disabled' : '');
  btn.textContent  = label;
  btn.dataset.folder = folder;
  if (enabled) btn.addEventListener('click', () => activateTabDynamic(folder));
  return btn;
}

export function setTabActive(folder: string | null): void {
  tabsEl.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', (t as HTMLElement).dataset.folder === folder)
  );
  const pluginsBtn = document.getElementById('tab-plugins');
  pluginsBtn?.classList.toggle('active', folder === PLUGINS_TAB);
}

// Resolved dynamically to avoid circular deps with plugin-area.ts
let _activateTab: ((folder: string) => Promise<void>) | null = null;

export function registerActivateTab(fn: (folder: string) => Promise<void>): void {
  _activateTab = fn;
}

function activateTabDynamic(folder: string): void {
  _activateTab?.(folder);
}
