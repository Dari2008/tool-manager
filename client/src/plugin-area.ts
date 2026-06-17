import { state, GALLERY_TAB, PLUGINS_TAB, WORKFLOW_TAB } from './state.ts';
import {
  rootGalleryView, pluginsPanelView, workflowView,
  iframeWrap, iframeOverlay, emptyState, sidebar,
  toolFrame, btnSettings, layout, jobTabBar,
} from './dom.ts';
import { renderJobTabs } from './jobs.ts';
import { sendToIframe } from './iframe.ts';
import { loadSidebar } from './sidebar.ts';
import type { PluginMeta } from './types.ts';

// ─── Layout transitions ───────────────────────────────────────

export function showGallery(): void {
  rootGalleryView.style.display  = 'flex';
  pluginsPanelView.style.display = 'none';
  workflowView.style.display     = 'none';
  iframeWrap.style.display       = 'none';
  emptyState.style.display       = 'none';
  sidebar.classList.add('hidden');
  iframeOverlay.classList.remove('active');
  hideJobTabBar();
  btnSettings.style.display = 'none';
}

export function showWorkflowTab(): void {
  rootGalleryView.style.display  = 'none';
  pluginsPanelView.style.display = 'none';
  workflowView.style.display     = 'flex';
  iframeWrap.style.display       = 'none';
  emptyState.style.display       = 'none';
  sidebar.classList.add('hidden');
  iframeOverlay.classList.remove('active');
  hideJobTabBar();
  btnSettings.style.display = 'none';
}

export function showPluginsPanel(): void {
  rootGalleryView.style.display  = 'none';
  pluginsPanelView.style.display = 'flex';
  workflowView.style.display     = 'none';
  iframeWrap.style.display       = 'none';
  emptyState.style.display       = 'none';
  sidebar.classList.add('hidden');
  iframeOverlay.classList.remove('active');
  hideJobTabBar();
  btnSettings.style.display = 'none';
  renderPluginsPanel();
}

export function showPluginArea(plugin: PluginMeta): void {
  rootGalleryView.style.display  = 'none';
  pluginsPanelView.style.display = 'none';
  workflowView.style.display     = 'none';
  iframeWrap.style.display       = '';
  btnSettings.style.display      = '';

  const hasSidebar = plugin.hasSidebar !== false;

  if (hasSidebar) {
    sidebar.classList.remove('hidden');
    iframeOverlay.classList.add('active');
    loadSidebar(plugin);
  } else {
    sidebar.classList.add('hidden');
    iframeOverlay.classList.remove('active');
  }

  const jobs = state.jobs[plugin.folder] ?? [];

  if (!hasSidebar) {
    hideJobTabBar();
    emptyState.style.display = 'none';
    loadPluginIframe(plugin);
    return;
  }

  if (jobs.length === 0) {
    hideJobTabBar();
    emptyState.style.display = 'flex';
    loadPluginIframe(plugin);
  } else {
    emptyState.style.display = 'none';
    const jobId = state.activeJobId[plugin.folder] ?? jobs[0].id;
    state.activeJobId[plugin.folder] = jobId;
    showJobTabBar();
    renderJobTabs(plugin.folder);

    if (toolFrame.dataset.pluginFolder !== plugin.folder) {
      loadPluginIframe(plugin);
    } else {
      sendToIframe({ type: 'load-job', jobId });
    }
  }
}

export function loadPluginIframe(plugin: PluginMeta): void {
  if (toolFrame.dataset.pluginFolder === plugin.folder) return;
  toolFrame.src  = plugin.indexUrl;
  toolFrame.dataset.pluginFolder = plugin.folder;
  state.iframeReady  = false;
  state.pendingDrop  = null;
}

export function showJobTabBar(): void {
  jobTabBar.style.display = 'flex';
  layout.classList.add('with-job-tabs');
}

export function hideJobTabBar(): void {
  jobTabBar.style.display = 'none';
  layout.classList.remove('with-job-tabs');
}

// ─── Plugins panel ────────────────────────────────────────────

function renderPluginsPanel(): void {
  const ppList = document.getElementById('pp-list')!;
  ppList.innerHTML = '';
  for (const plugin of state.plugins) {
    ppList.appendChild(buildPluginRow(plugin));
  }
}

function buildPluginRow(plugin: PluginMeta): HTMLElement {
  const row = document.createElement('div');
  row.className = 'pp-row';

  const hdr = document.createElement('div');
  hdr.className = 'pp-row-header';

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'pp-toggle';
  const toggleCb    = document.createElement('input');
  toggleCb.type     = 'checkbox';
  toggleCb.checked  = plugin.enabled;
  const track       = document.createElement('span');
  track.className   = 'pp-toggle-track';
  toggleLabel.append(toggleCb, track);
  toggleCb.addEventListener('change', async () => {
    await fetch(`/api/plugins/${plugin.folder}/config`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enabled: toggleCb.checked }),
    });
    plugin.enabled = toggleCb.checked;
    const { renderTabs, setTabActive } = await import('./tabs.ts');
    renderTabs();
    setTabActive(PLUGINS_TAB);
  });

  const nameEl       = document.createElement('span');
  nameEl.className   = 'pp-name';
  nameEl.textContent = plugin.name;
  hdr.append(toggleLabel, nameEl);

  const hasSettings = (plugin.globalSettingsSchema ?? []).length > 0;

  if (hasSettings) {
    const expandBtn       = document.createElement('button');
    expandBtn.className   = 'pp-expand-btn';
    expandBtn.textContent = '▾ Settings';

    const body    = document.createElement('div');
    body.className = 'pp-settings-body';
    body.hidden    = true;

    for (const field of plugin.globalSettingsSchema!) {
      const wrap   = document.createElement('div');
      wrap.className = 'pp-field';
      const lbl    = document.createElement('label');
      lbl.textContent = field.label;
      const inp    = document.createElement('input');
      inp.type     = field.type === 'password' ? 'password'
                   : field.type === 'number'   ? 'number'
                   :                             'text';
      inp.value    = String(plugin.globalSettings?.[field.key] ?? field.defaultValue ?? '');
      inp.name     = field.key;
      wrap.append(lbl, inp);
      if (field.description) {
        const desc       = document.createElement('div');
        desc.className   = 'pp-desc';
        desc.textContent = field.description;
        wrap.appendChild(desc);
      }
      body.appendChild(wrap);
    }

    const saveRow   = document.createElement('div');
    saveRow.className = 'pp-save-row';
    const saveBtn   = document.createElement('button');
    saveBtn.className   = 'pp-save-btn';
    saveBtn.textContent = 'Save';
    const status    = document.createElement('span');
    status.className = 'pp-status';
    saveBtn.addEventListener('click', async () => {
      const settings: Record<string, unknown> = {};
      body.querySelectorAll<HTMLInputElement>('input[name]').forEach(inp => {
        settings[inp.name] = inp.type === 'number' ? Number(inp.value) : inp.value;
      });
      await fetch(`/api/plugins/${plugin.folder}/config`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ globalSettings: settings }),
      });
      plugin.globalSettings = settings;
      status.textContent = 'Saved ✓';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
    saveRow.append(saveBtn, status);
    body.appendChild(saveRow);

    expandBtn.addEventListener('click', () => {
      const open    = body.hidden;
      body.hidden   = !open;
      expandBtn.textContent = open ? '▴ Settings' : '▾ Settings';
    });

    hdr.appendChild(expandBtn);
    row.append(hdr, body);
  } else {
    const noSet       = document.createElement('span');
    noSet.className   = 'pp-no-settings';
    noSet.textContent = 'No settings';
    hdr.appendChild(noSet);
    row.appendChild(hdr);
  }
  return row;
}
