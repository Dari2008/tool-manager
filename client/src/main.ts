import { state, GALLERY_TAB, PLUGINS_TAB, WORKFLOW_TAB } from './state.ts';
import { renderTabs, setTabActive, registerActivateTab } from './tabs.ts';
import {
  showGallery, showWorkflowTab, showPluginsPanel, showPluginArea, loadPluginIframe,
} from './plugin-area.ts';
import { loadRootGallery, deleteRgSelected, exportRgSelected, updateRgCount } from './gallery.ts';
import { hideCtxMenu } from './ctx-menu.ts';
import { openSettingsModal, saveSettings } from './settings.ts';
import { renderJobTabs, createJobWithItem, addItemToExistingJob, waitForSave } from './jobs.ts';
import { sendToIframe, setupIframeMessageHandler } from './iframe.ts';
import { loadSidebar } from './sidebar.ts';
import { initWorkflow } from './workflow/index.ts';
import {
  tabsEl, iframeOverlay, emptyState, toolFrame,
  settingsModal, btnSettings, ctxMenu,
} from './dom.ts';

// ─── Boot ─────────────────────────────────────────────────────

(async () => {
  const data     = await fetch('/api/plugins').then(r => r.json());
  state.plugins  = data;
  for (const p of state.plugins) {
    state.jobs[p.folder]        = [];
    state.activeJobId[p.folder] = null;
  }

  renderTabs();
  registerActivateTab(activateTab);
  setupIframeMessageHandler(loadRootGallery, createJobWithItem, loadSidebar);
  setupListeners();

  const first = state.plugins.find(p => p.enabled);
  await activateTab(first?.folder ?? GALLERY_TAB);
})();

// ─── Tab activation ───────────────────────────────────────────

export async function activateTab(folder: string): Promise<void> {
  state.activePlugin = folder;
  setTabActive(folder);

  if (folder === GALLERY_TAB) {
    showGallery();
    await loadRootGallery();
    return;
  }
  if (folder === WORKFLOW_TAB) {
    showWorkflowTab();
    await initWorkflow();
    return;
  }
  if (folder === PLUGINS_TAB) {
    showPluginsPanel();
    return;
  }

  const plugin = state.plugins.find(p => p.folder === folder);
  if (!plugin || !plugin.enabled) return;

  // Load job list for this plugin on first visit
  if (!state.jobs[plugin.folder]?.length) {
    try {
      const allJobs = await fetch('/api/jobs').then(r => r.json()) as { id: string; rawImage?: string[]; imageSettings?: string }[];
      const jobs = allJobs.filter(j => j.imageSettings === folder);
      state.jobs[plugin.folder] = jobs.map(j => ({
        id: j.id, label: (j.rawImage?.[0] ?? j.id).split('/').pop()!.slice(0, 12), dirty: false,
      }));
    } catch { /* ignore */ }
  }
  showPluginArea(plugin);
}

// ─── Global event wiring ──────────────────────────────────────

function setupListeners(): void {
  // Sidebar refresh
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    const p = state.plugins.find(q => q.folder === state.activePlugin);
    if (p) loadSidebar(p);
  });

  // Plugins tab (right-aligned)
  document.getElementById('tab-plugins')?.addEventListener('click', () => activateTab(PLUGINS_TAB));

  // Settings gear
  btnSettings.addEventListener('click', () => {
    if (state.activePlugin && state.activePlugin !== GALLERY_TAB && state.activePlugin !== PLUGINS_TAB && state.activePlugin !== WORKFLOW_TAB) {
      openSettingsModal(state.activePlugin);
    }
  });

  // Settings modal
  document.getElementById('btn-modal-close')?.addEventListener('click',   () => settingsModal.classList.add('hidden'));
  document.getElementById('btn-cancel-global')?.addEventListener('click', () => settingsModal.classList.add('hidden'));
  document.getElementById('btn-save-global')?.addEventListener('click',   saveSettings);
  settingsModal.querySelector('.modal-backdrop')?.addEventListener('click', () => settingsModal.classList.add('hidden'));

  // Root gallery toolbar
  document.getElementById('rg-select-all')?.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('#rg-content .rg-checkbox').forEach(cb => {
      if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
  });
  document.getElementById('rg-deselect')?.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('#rg-content .rg-checkbox').forEach(cb => {
      if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
    });
  });
  document.getElementById('rg-delete')?.addEventListener('click',  deleteRgSelected);
  document.getElementById('rg-export')?.addEventListener('click',  exportRgSelected);
  document.getElementById('rg-refresh')?.addEventListener('click', loadRootGallery);

  // Iframe overlay drag-and-drop
  iframeOverlay.addEventListener('dragenter', e => {
    if (!state.draggedItem) return;
    e.preventDefault();
    iframeOverlay.classList.add('drag-over');
  });
  iframeOverlay.addEventListener('dragover', e => { if (!state.draggedItem) return; e.preventDefault(); });
  iframeOverlay.addEventListener('dragleave', () => { iframeOverlay.classList.remove('drag-over'); });
  iframeOverlay.addEventListener('drop', e => {
    e.preventDefault();
    iframeOverlay.classList.remove('drag-over');
    if (!state.draggedItem) return;
    const item   = { ...state.draggedItem };
    state.draggedItem = null;
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;
    const activeJobId = state.activeJobId[folder];
    if (activeJobId) {
      if (item.sourceFolder === folder) {
        if (state.iframeReady) sendToIframe({ type: 'add-generated-item', uuid: item.uuid });
      } else {
        addItemToExistingJob(folder, activeJobId, item);
      }
    } else {
      createJobWithItem(item);
    }
  });

  // + New job button
  document.getElementById('btn-new-job')?.addEventListener('click', async () => {
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;
    const plugin = state.plugins.find(p => p.folder === folder);
    if (!plugin) return;
    if (state.iframeReady) { sendToIframe({ type: 'request-save' }); await waitForSave(); }
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSettings: folder, rawImage: [], settings: {} }),
      });
      if (!res.ok) return;
      const { uuid: jobId } = await res.json() as { uuid: string };
      const job = { id: jobId, label: 'New', dirty: false };
      state.jobs[folder]?.push(job);
      state.activeJobId[folder] = jobId;
      import('./plugin-area.ts').then(m => { m.showJobTabBar(); });
      emptyState.style.display = 'none';
      renderJobTabs(folder);
      if (toolFrame.dataset.pluginFolder !== folder) {
        state.iframeReady = false;
        toolFrame.src = plugin.indexUrl;
        toolFrame.dataset.pluginFolder = folder;
      } else if (state.iframeReady) {
        sendToIframe({ type: 'load-job', jobId });
      }
    } catch { /**/ }
  });

  // Dismiss overlays
  document.addEventListener('click', hideCtxMenu);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hideCtxMenu();
      settingsModal.classList.add('hidden');
    }
  });
}
