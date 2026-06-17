// ─── Constants ────────────────────────────────────────────────
const GALLERY_TAB = '__gallery__';
const PLUGINS_TAB = '__plugins__';

// ─── State ────────────────────────────────────────────────────
const state = {
  plugins:      [],        // PluginMeta[]
  activePlugin: null,      // folder string | GALLERY_TAB | PLUGINS_TAB | null
  jobs:         {},        // { [folder]: Array<{id, label, dirty}> }
  activeJobId:  {},        // { [folder]: string | null }
  draggedItem:  null,      // { uuid, url, label }
  loaderCache:  {},        // { [folder]: module }
  iframeReady:  false,
  pendingDrop:  null,      // { jobId, item } to send once iframe is ready
  rgSelected:   new Set(), // Set<"folder:uuid"> for root gallery selection
  rgGroups:     [],        // GroupedGalleryItems[]
};

// ─── DOM refs ─────────────────────────────────────────────────
const $               = id => document.getElementById(id);
const tabsEl          = $('tabs');
const jobTabBar       = $('job-tab-bar');
const jobTabsEl       = $('job-tabs');
const layout          = $('layout');
const sidebar         = $('sidebar');
const itemList        = $('item-list');
const toolFrame       = $('tool-frame');
const iframeOverlay   = $('iframe-overlay');
const iframeWrap      = $('iframe-wrap');
const rootGalleryView = $('root-gallery-view');
const pluginsPanelView = $('plugins-panel-view');
const rgContent       = $('rg-content');
const rgCountEl       = $('rg-count');
const rgExportBtn     = $('rg-export');
const emptyState      = $('empty-state');
const btnSettings     = $('btn-plugin-settings');
const settingsModal   = $('settings-modal');
const modalTitle      = $('modal-title');
const settingEnabled  = $('setting-enabled');
const globalFields    = $('global-settings-fields');
const ctxMenu         = $('ctx-menu');
const ctxMenuItems    = $('ctx-menu-items');

// ─── Boot ─────────────────────────────────────────────────────
(async () => {
  await loadPlugins();
  renderTabs();
  setupListeners();
  const first = state.plugins.find(p => p.enabled);
  await activateTab(first?.folder ?? GALLERY_TAB);
})();

// ─── Load plugins from server ─────────────────────────────────
async function loadPlugins() {
  const data = await fetch('/api/plugins').then(r => r.json());
  state.plugins = data;
  for (const p of state.plugins) {
    state.jobs[p.folder]        = [];
    state.activeJobId[p.folder] = null;
  }
}

// ─── Plugin tab bar ───────────────────────────────────────────
function renderTabs() {
  tabsEl.innerHTML = '';
  tabsEl.appendChild(mkPluginTab('Gallery', GALLERY_TAB, true));
  for (const p of state.plugins) {
    tabsEl.appendChild(mkPluginTab(p.name, p.folder, p.enabled));
  }
}

function mkPluginTab(label, folder, enabled) {
  const btn = document.createElement('button');
  btn.className = 'tab'
    + (folder === GALLERY_TAB ? ' gallery-root' : '')
    + (!enabled ? ' disabled' : '');
  btn.textContent = label;
  btn.dataset.folder = folder;
  if (enabled) btn.addEventListener('click', () => activateTab(folder));
  return btn;
}

function setTabActive(folder) {
  tabsEl.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.folder === folder)
  );
  $('tab-plugins').classList.toggle('active', folder === PLUGINS_TAB);
}

// ─── Tab activation ───────────────────────────────────────────
async function activateTab(folder) {
  state.activePlugin = folder;
  setTabActive(folder);

  if (folder === GALLERY_TAB) {
    showGallery();
    await loadRootGallery();
    return;
  }

  if (folder === PLUGINS_TAB) {
    showPluginsPanel();
    return;
  }

  const plugin = state.plugins.find(p => p.folder === folder);
  if (!plugin || !plugin.enabled) return;
  showPluginArea(plugin);
}

function showGallery() {
  rootGalleryView.style.display  = 'flex';
  pluginsPanelView.style.display = 'none';
  iframeWrap.style.display       = 'none';
  emptyState.style.display       = 'none';
  sidebar.classList.add('hidden');
  iframeOverlay.classList.remove('active');
  hideJobTabBar();
  btnSettings.style.display = 'none';
}

function showPluginArea(plugin) {
  rootGalleryView.style.display  = 'none';
  pluginsPanelView.style.display = 'none';
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

  const jobs = state.jobs[plugin.folder];

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

function loadPluginIframe(plugin) {
  if (toolFrame.dataset.pluginFolder === plugin.folder) return;
  toolFrame.src = plugin.indexUrl;
  toolFrame.dataset.pluginFolder = plugin.folder;
  state.iframeReady = false;
  state.pendingDrop = null;
}

// ─── Plugins panel ────────────────────────────────────────────
function showPluginsPanel() {
  rootGalleryView.style.display  = 'none';
  pluginsPanelView.style.display = 'flex';
  iframeWrap.style.display       = 'none';
  emptyState.style.display       = 'none';
  sidebar.classList.add('hidden');
  iframeOverlay.classList.remove('active');
  hideJobTabBar();
  btnSettings.style.display = 'none';
  renderPluginsPanel();
}

function renderPluginsPanel() {
  const ppList = $('pp-list');
  ppList.innerHTML = '';
  for (const plugin of state.plugins) {
    ppList.appendChild(buildPluginRow(plugin));
  }
}

function buildPluginRow(plugin) {
  const row = document.createElement('div');
  row.className = 'pp-row';

  const hdr = document.createElement('div');
  hdr.className = 'pp-row-header';

  // Toggle switch
  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'pp-toggle';
  const toggleCb = document.createElement('input');
  toggleCb.type    = 'checkbox';
  toggleCb.checked = plugin.enabled;
  const track = document.createElement('span');
  track.className = 'pp-toggle-track';
  toggleLabel.append(toggleCb, track);
  toggleCb.addEventListener('change', async () => {
    await fetch(`/api/plugins/${plugin.folder}/config`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ enabled: toggleCb.checked }),
    });
    plugin.enabled = toggleCb.checked;
    renderTabs();
    setTabActive(PLUGINS_TAB);
  });

  const nameEl = document.createElement('span');
  nameEl.className   = 'pp-name';
  nameEl.textContent = plugin.name;

  hdr.append(toggleLabel, nameEl);

  const hasSettings = (plugin.globalSettingsSchema ?? []).length > 0;

  if (hasSettings) {
    const expandBtn = document.createElement('button');
    expandBtn.className   = 'pp-expand-btn';
    expandBtn.textContent = '▾ Settings';

    const body = document.createElement('div');
    body.className = 'pp-settings-body';
    body.hidden    = true;

    for (const field of plugin.globalSettingsSchema) {
      const wrap = document.createElement('div');
      wrap.className = 'pp-field';

      const lbl = document.createElement('label');
      lbl.textContent = field.label;

      const inp = document.createElement('input');
      inp.type  = field.type === 'password' ? 'password'
                : field.type === 'number'   ? 'number'
                :                             'text';
      inp.value = String(plugin.globalSettings?.[field.key] ?? field.defaultValue ?? '');
      inp.name  = field.key;

      wrap.append(lbl, inp);
      if (field.description) {
        const desc = document.createElement('div');
        desc.className   = 'pp-desc';
        desc.textContent = field.description;
        wrap.appendChild(desc);
      }
      body.appendChild(wrap);
    }

    const saveRow = document.createElement('div');
    saveRow.className = 'pp-save-row';
    const saveBtn = document.createElement('button');
    saveBtn.className   = 'pp-save-btn';
    saveBtn.textContent = 'Save';
    const status = document.createElement('span');
    status.className = 'pp-status';

    saveBtn.addEventListener('click', async () => {
      const settings = {};
      body.querySelectorAll('input[name]').forEach(inp => {
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
      const open = body.hidden;
      body.hidden = !open;
      expandBtn.textContent = open ? '▴ Settings' : '▾ Settings';
    });

    hdr.appendChild(expandBtn);
    row.append(hdr, body);
  } else {
    const noSet = document.createElement('span');
    noSet.className   = 'pp-no-settings';
    noSet.textContent = 'No settings';
    hdr.appendChild(noSet);
    row.appendChild(hdr);
  }

  return row;
}

// ─── Job tab bar ──────────────────────────────────────────────
function showJobTabBar() {
  jobTabBar.style.display = 'flex';
  layout.classList.add('with-job-tabs');
}
function hideJobTabBar() {
  jobTabBar.style.display = 'none';
  layout.classList.remove('with-job-tabs');
}

function renderJobTabs(folder) {
  jobTabsEl.innerHTML = '';
  const activeId = state.activeJobId[folder];
  for (const job of state.jobs[folder]) {
    jobTabsEl.appendChild(mkJobTab(folder, job, activeId));
  }
}

function mkJobTab(folder, job, activeId) {
  const el = document.createElement('div');
  el.className = 'job-tab'
    + (job.id === activeId ? ' active' : '')
    + (job.dirty ? ' dirty' : '');
  el.dataset.jobId = job.id;

  const lbl = document.createElement('span');
  lbl.textContent = job.label;

  const cls = document.createElement('button');
  cls.className   = 'job-tab-close';
  cls.textContent = '✕';
  cls.title       = 'Close';
  cls.addEventListener('click', e => { e.stopPropagation(); tryCloseJob(folder, job.id); });

  el.append(lbl, cls);
  el.addEventListener('click', () => switchJobTab(folder, job.id));
  return el;
}

async function switchJobTab(folder, jobId) {
  if (state.activeJobId[folder] === jobId) return;
  if (state.iframeReady) {
    sendToIframe({ type: 'request-save' });
    await waitForSave();
  }
  state.activeJobId[folder] = jobId;
  jobTabsEl.querySelectorAll('.job-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.jobId === jobId)
  );
  sendToIframe({ type: 'load-job', jobId });
}

async function tryCloseJob(folder, jobId) {
  const job = state.jobs[folder].find(j => j.id === jobId);
  if (!job) return;

  if (job.dirty) {
    const save = confirm(`"${job.label}" has unsaved changes.\nSave before closing?`);
    if (save) {
      sendToIframe({ type: 'request-save' });
      await waitForSave();
    }
  }
  removeJob(folder, jobId);
}

function removeJob(folder, jobId) {
  const idx = state.jobs[folder].findIndex(j => j.id === jobId);
  if (idx === -1) return;
  state.jobs[folder].splice(idx, 1);

  if (state.jobs[folder].length === 0) {
    state.activeJobId[folder] = null;
    hideJobTabBar();
    emptyState.style.display = 'flex';
  } else {
    const next = state.jobs[folder][Math.max(0, idx - 1)];
    state.activeJobId[folder] = next.id;
    renderJobTabs(folder);
    sendToIframe({ type: 'load-job', jobId: next.id });
  }
}

function waitForSave() {
  return new Promise(resolve => {
    const t = setTimeout(resolve, 3000);
    function h(e) {
      if (e.data?.type === 'saved') {
        clearTimeout(t);
        window.removeEventListener('message', h);
        resolve();
      }
    }
    window.addEventListener('message', h);
  });
}

// ─── Add item to existing job (no new tab) ───────────────────
async function addItemToExistingJob(folder, jobId, item) {
  try {
    const jobRes = await fetch(`/api/jobs/${jobId}`);
    if (jobRes.ok) {
      const job = await jobRes.json();
      const existing = new Set(job.rawImage ?? []);
      if (!existing.has(item.url)) {
        await fetch(`/api/jobs/${jobId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...job, rawImage: [...existing, item.url] }),
        });
      }
    }
  } catch {}
  if (state.iframeReady) sendToIframe({ type: 'add-item', item });
}

// ─── Job creation (first drag or + button) ───────────────────
async function createJobWithItem(item) {
  const folder = state.activePlugin;
  if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB) return;

  let jobId;
  try {
    const res = await fetch('/api/jobs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ imageSettings: folder, rawImage: [item.url], settings: {} }),
    });
    if (!res.ok) return;
    ({ uuid: jobId } = await res.json());
  } catch { return; }

  const job      = { id: jobId, label: item.label, dirty: false };
  const wasEmpty = state.jobs[folder].length === 0;
  state.jobs[folder].push(job);
  state.activeJobId[folder] = jobId;

  if (wasEmpty) {
    showJobTabBar();
    emptyState.style.display = 'none';
  }
  renderJobTabs(folder);

  if (toolFrame.dataset.pluginFolder !== folder) {
    const plugin = state.plugins.find(p => p.folder === folder);
    state.pendingDrop = { jobId, item };
    toolFrame.src = plugin.indexUrl;
    toolFrame.dataset.pluginFolder = folder;
    state.iframeReady = false;
  } else if (!state.iframeReady) {
    state.pendingDrop = { jobId, item };
  } else {
    sendToIframe({ type: 'init', jobId, item });
  }
}

// ─── iframe postMessage bridge ────────────────────────────────
function sendToIframe(msg) {
  try { toolFrame.contentWindow?.postMessage(msg, '*'); } catch {}
}

window.addEventListener('message', e => {
  const msg    = e.data ?? {};
  const folder = state.activePlugin;
  if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB) return;

  switch (msg.type) {
    case 'ready':
      state.iframeReady = true;
      if (state.pendingDrop) {
        sendToIframe({ type: 'init', jobId: state.pendingDrop.jobId, item: state.pendingDrop.item });
        state.pendingDrop = null;
      } else {
        const jobId = state.activeJobId[folder];
        if (jobId) sendToIframe({ type: 'load-job', jobId });
      }
      break;

    case 'dirty-state': {
      const jobId = state.activeJobId[folder];
      const job   = state.jobs[folder]?.find(j => j.id === jobId);
      if (job) {
        job.dirty = !!msg.dirty;
        jobTabsEl.querySelector(`[data-job-id="${jobId}"]`)
          ?.classList.toggle('dirty', job.dirty);
      }
      break;
    }

    case 'saved': {
      const jobId = msg.jobId ?? state.activeJobId[folder];
      const job   = state.jobs[folder]?.find(j => j.id === jobId);
      if (job) {
        job.dirty = false;
        jobTabsEl.querySelector(`[data-job-id="${jobId}"]`)?.classList.remove('dirty');
      }
      break;
    }

    case 'request-new-job':
      if (msg.uuid && msg.url) {
        createJobWithItem({ uuid: msg.uuid, url: msg.url, label: msg.label ?? msg.uuid.slice(0, 8) });
      }
      break;

    case 'gallery-changed':
      loadRootGallery();
      break;
  }
});

// ─── Sidebar ──────────────────────────────────────────────────
async function loadSidebar(plugin) {
  itemList.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const [items, loader] = await Promise.all([
      fetch(`/api/listItems/get?folder=${encodeURIComponent(plugin.folder)}`).then(r => r.json()),
      loadPluginLoader(plugin),
    ]);

    if (!Array.isArray(items) || items.length === 0) {
      itemList.innerHTML = '<div class="empty">No items</div>';
      return;
    }

    itemList.innerHTML = '';
    for (const item of items) {
      const el = loader?.render ? loader.render(item) : defaultListItem(item);
      el.draggable        = true;
      el.dataset.uuid     = item.uuid;
      el.dataset.url      = item.url ?? '';
      el.dataset.label    = item.label ?? item.uuid;
      el.classList.add('list-item');
      el.addEventListener('dragstart', handleDragStart);
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        showSidebarCtxMenu(e.clientX, e.clientY, item);
      });
      itemList.appendChild(el);
    }
  } catch {
    itemList.innerHTML = '<div class="empty">Failed to load</div>';
  }
}

async function loadPluginLoader(plugin) {
  if (state.loaderCache[plugin.folder]) return state.loaderCache[plugin.folder];
  try {
    const mod = await import(plugin.loaderUrl);
    state.loaderCache[plugin.folder] = mod;
    return mod;
  } catch { return null; }
}

function defaultListItem(item) {
  const el = document.createElement('div');
  if (item.thumbnail ?? item.url) {
    const img   = document.createElement('img');
    img.src     = item.thumbnail ?? item.url;
    img.alt     = item.label ?? '';
    img.loading = 'lazy';
    el.appendChild(img);
  }
  const span       = document.createElement('span');
  span.textContent = item.label ?? item.uuid;
  el.appendChild(span);
  return el;
}

// ─── Drag from sidebar ────────────────────────────────────────
function handleDragStart(e) {
  const el = e.currentTarget;
  state.draggedItem = {
    uuid:  el.dataset.uuid,
    url:   el.dataset.url,
    label: el.dataset.label,
  };
  el.classList.add('dragging');
  iframeOverlay.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'copy';
  document.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    iframeOverlay.classList.remove('dragging');
    state.draggedItem = null;
  }, { once: true });
}

// ─── Root Gallery ─────────────────────────────────────────────
async function loadRootGallery() {
  rgContent.innerHTML = '<div class="placeholder">Loading…</div>';
  state.rgSelected.clear();
  updateRgCount();
  try {
    state.rgGroups = await fetch('/api/gallery/all').then(r => r.json());
    renderRgGroups();
  } catch {
    rgContent.innerHTML = '<div class="placeholder">Failed to load gallery.</div>';
  }
}

function renderRgGroups() {
  rgContent.innerHTML = '';
  const hasAny = state.rgGroups.some(g => g.items?.length > 0);
  if (!hasAny) {
    rgContent.innerHTML = '<div class="placeholder">No generated images yet.</div>';
    return;
  }

  for (const group of state.rgGroups) {
    if (!group.items?.length) continue;

    const section = document.createElement('div');
    section.className = 'rg-section';

    const hdr = document.createElement('div');
    hdr.className = 'rg-section-header';
    hdr.innerHTML = `
      <span class="rg-section-title">${group.name}</span>
      <span class="rg-section-count">${group.items.length} image${group.items.length !== 1 ? 's' : ''}</span>`;

    const grid = document.createElement('div');
    grid.className = 'rg-grid';
    for (const item of group.items) grid.appendChild(buildRgCard(group.folder, item));

    section.append(hdr, grid);
    rgContent.appendChild(section);
  }
}

function buildRgCard(folder, item) {
  const card = document.createElement('div');
  card.className   = 'rg-card';
  card.dataset.uuid = item.uuid;

  const cb    = document.createElement('input');
  cb.type     = 'checkbox';
  cb.className = 'rg-checkbox';
  cb.addEventListener('change', () => {
    const key = `${folder}:${item.uuid}`;
    if (cb.checked) state.rgSelected.add(key);
    else            state.rgSelected.delete(key);
    card.classList.toggle('selected', cb.checked);
    updateRgCount();
  });

  const img     = document.createElement('img');
  img.src       = item.thumbnail ?? item.url;
  img.alt       = item.filename ?? item.uuid;
  img.loading   = 'lazy';
  img.addEventListener('click', () => {
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
  });

  const lbl         = document.createElement('div');
  lbl.className     = 'rg-label';
  lbl.textContent   = item.filename ?? item.uuid.slice(0, 8);

  card.append(cb, img, lbl);
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    state.draggedItem = {
      uuid: item.uuid,
      url:  item.url,
      label: item.filename ?? item.uuid.slice(0, 8),
      sourceFolder: folder,
    };
    iframeOverlay.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
    document.addEventListener('dragend', () => {
      state.draggedItem = null;
      iframeOverlay.classList.remove('dragging');
    }, { once: true });
  });

  card.addEventListener('contextmenu', e => {
    e.preventDefault();
    showCtxMenu(e.clientX, e.clientY, folder, item);
  });
  return card;
}

function updateRgCount() {
  const n = state.rgSelected.size;
  rgCountEl.textContent = `${n} selected`;
  $('rg-delete').disabled = n === 0;
  rgExportBtn.disabled    = n === 0;
}

// Extends planItems with output images and jobs that are connected to the given raw image UUIDs.
// Checks settings.activeUrl first, then falls back to job.outputs for orphaned jobs.
async function extendPlanWithRawConnections(planItems, rawUuids, allJobs, allSettings) {
  const deletingUrls = new Set(rawUuids.map(uuid => `/api/images/raw/${uuid}`));
  const jobOutSeen   = new Map(); // jobId → Set<outputId>

  for (const s of allSettings) {
    const rawUrl = s.settings?.activeUrl ?? s.settings?.rawImage;
    if (!rawUrl || !deletingUrls.has(rawUrl)) continue;
    const outId = `output:${s.id}`;
    if (!planItems.has(outId)) {
      planItems.set(outId, {
        id: outId, type: 'Output Image', label: s.id.slice(0, 8),
        imageUrl: `/api/images/shopProductImage/${s.id}`, checked: true,
        onDelete: () => fetch(`/api/settings/shopProductImage/${s.id}`, { method: 'DELETE' }).catch(() => {}),
      });
    }
    const jobId = s.settings?.jobId;
    if (jobId) {
      if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, new Set());
      jobOutSeen.get(jobId).add(s.id);
    }
  }

  const orphaned = allJobs.filter(j => {
    const imgs = Array.isArray(j.rawImage) ? j.rawImage : [];
    return imgs.length > 0 && imgs.every(u => deletingUrls.has(u));
  });

  for (const job of orphaned) {
    const jobId      = job.id;
    const rawCount   = Array.isArray(job.rawImage) ? job.rawImage.length : 0;
    const jobOutputs = Array.isArray(job.outputs) ? job.outputs : [];

    for (const outputId of jobOutputs) {
      const outId = `output:${outputId}`;
      if (!planItems.has(outId)) {
        planItems.set(outId, {
          id: outId, type: 'Output Image', label: outputId.slice(0, 8),
          imageUrl: `/api/images/shopProductImage/${outputId}`, checked: true,
          onDelete: () => fetch(`/api/settings/shopProductImage/${outputId}`, { method: 'DELETE' }).catch(() => {}),
        });
      }
      if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, new Set());
      jobOutSeen.get(jobId).add(outputId);
    }

    const seenOutputs = jobOutSeen.get(jobId) ?? new Set();
    const allCovered  = jobOutputs.length === 0 || jobOutputs.every(id => seenOutputs.has(id));

    if (!planItems.has(`job:${jobId}`)) {
      planItems.set(`job:${jobId}`, {
        id: `job:${jobId}`, type: 'Job', label: `Job ${jobId.slice(0, 8)}`,
        meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
        checked: allCovered,
        onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {}),
      });
    }
  }
}

async function deleteRgSelected() {
  if (!state.rgSelected.size) return;
  const { showDeleteModal } = await import('/client/js/delete-modal.js');

  const toDelete = [...state.rgSelected].map(key => {
    const [folder, uuid] = key.split(':');
    return { folder, uuid };
  });

  const planItems      = new Map();
  const jobDataCache   = new Map(); // jobId → job
  const selectedOutIds = new Set(toDelete.filter(t => t.folder !== 'raw').map(t => t.uuid));
  const rawUuids       = [];

  for (const { folder, uuid } of toDelete) {
    const galleryItem = state.rgGroups.find(g => g.folder === folder)?.items.find(i => i.uuid === uuid);

    if (folder === 'raw') {
      // Raw image: collect for batch connection discovery below
      rawUuids.push(uuid);
      planItems.set(`raw:${uuid}`, {
        id: `raw:${uuid}`, type: 'Raw Image',
        label: galleryItem?.filename ?? uuid.slice(0, 8),
        imageUrl: galleryItem?.thumbnail ?? galleryItem?.url,
        checked: true,
        onDelete: () => fetch(`/api/images/raw/${uuid}`, { method: 'DELETE' }).catch(() => {}),
      });
      continue;
    }

    planItems.set(`output:${uuid}`, {
      id: `output:${uuid}`,
      type: 'Output Image',
      label: galleryItem?.filename ?? uuid.slice(0, 8),
      imageUrl: galleryItem?.thumbnail ?? galleryItem?.url,
      checked: true,
      onDelete: () => fetch(`/api/settings/${folder}/${uuid}`, { method: 'DELETE' }).catch(async () => {
        await fetch(`/api/images/${folder}/${uuid}`, { method: 'DELETE' }).catch(() => {});
      }),
    });

    const entry = await fetch(`/api/settings/${folder}/${uuid}`).then(r => r.json()).catch(() => null);
    if (!entry?.settings) continue;

    const { activeUuid, activeUrl, jobId } = entry.settings;

    if (activeUuid && !planItems.has(`raw:${activeUuid}`)) {
      planItems.set(`raw:${activeUuid}`, {
        id: `raw:${activeUuid}`,
        type: 'Raw Image',
        label: activeUrl?.split('/').pop() ?? activeUuid.slice(0, 8),
        imageUrl: activeUrl,
        checked: false,
        onDelete: () => fetch(`/api/images/raw/${activeUuid}`, { method: 'DELETE' }).catch(() => {}),
      });
    }

    if (jobId && !jobDataCache.has(jobId)) {
      const job = await fetch(`/api/jobs/${jobId}`).then(r => r.json()).catch(() => null);
      if (job) jobDataCache.set(jobId, job);
    }

    if (jobId && !planItems.has(`job:${jobId}`)) {
      const job = jobDataCache.get(jobId);
      const rawCount   = Array.isArray(job?.rawImage) ? job.rawImage.length : 0;
      const jobOutputs = Array.isArray(job?.outputs) ? job.outputs : [];

      for (const outputId of jobOutputs) {
        const otherId = `output:${outputId}`;
        if (!planItems.has(otherId)) {
          planItems.set(otherId, {
            id: otherId,
            type: 'Output Image',
            label: outputId.slice(0, 8),
            imageUrl: `/api/images/${folder}/${outputId}`,
            checked: selectedOutIds.has(outputId),
            onDelete: () => fetch(`/api/settings/${folder}/${outputId}`, { method: 'DELETE' }).catch(() => {}),
          });
        }
      }

      const allOutputsSelected = jobOutputs.length > 0 && jobOutputs.every(id => selectedOutIds.has(id));

      planItems.set(`job:${jobId}`, {
        id: `job:${jobId}`,
        type: 'Job',
        label: `Job ${jobId.slice(0, 8)}`,
        meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
        checked: allOutputsSelected,
        onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {}),
      });
    }
  }

  // Discover outputs + jobs connected to any raw images in the batch
  if (rawUuids.length > 0) {
    const [allJobs, allSettings] = await Promise.all([
      fetch('/api/jobs').then(r => r.json()).catch(() => []),
      fetch('/api/settings/shopProductImage').then(r => r.json()).catch(() => []),
    ]);
    await extendPlanWithRawConnections(planItems, rawUuids, allJobs, allSettings);
  }

  const n = toDelete.length;
  const deletedIds = await showDeleteModal({
    title: n === 1 ? 'Delete Image' : `Delete ${n} Images`,
    items: [...planItems.values()],
  });

  if (!deletedIds.length) return;

  sendToIframe({ type: 'refresh-gallery' });
  toolFrame.dataset.pluginFolder = '';
  await loadRootGallery();
}

async function exportRgSelected() {
  if (!state.rgSelected.size) return;

  const toExport = [];
  for (const key of state.rgSelected) {
    const [folder, uuid] = key.split(':');
    const item = state.rgGroups.find(g => g.folder === folder)?.items.find(i => i.uuid === uuid);
    if (item) toExport.push(item);
  }

  const origText         = rgExportBtn.textContent;
  rgExportBtn.textContent = 'Preparing…';
  rgExportBtn.disabled    = true;

  try {
    const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
    const zip = new JSZip();
    await Promise.all(toExport.map(async item => {
      const res = await fetch(item.url);
      if (!res.ok) return;
      zip.file(item.filename ?? `${item.uuid}.jpg`, await res.blob());
    }));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'gallery-export.zip';
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    rgExportBtn.textContent = origText;
    updateRgCount();
  }
}

// ─── Right-click context menu ─────────────────────────────────
function showCtxMenu(x, y, folder, item) {
  const receivers = state.plugins.filter(p => p.canReceiveExternalItem && p.enabled);
  if (!receivers.length) return;

  ctxMenuItems.innerHTML = '';

  const header       = document.createElement('div');
  header.className   = 'ctx-menu-label';
  header.textContent = 'Open in…';
  ctxMenuItems.appendChild(header);

  const sep       = document.createElement('div');
  sep.className   = 'ctx-menu-separator';
  ctxMenuItems.appendChild(sep);

  for (const p of receivers) {
    const btn         = document.createElement('div');
    btn.className     = 'ctx-menu-item';
    btn.textContent   = p.name;
    btn.addEventListener('click', async () => {
      hideCtxMenu();
      await activateTab(p.folder);
      await createJobWithItem({
        uuid:  item.uuid,
        url:   item.url,
        label: item.filename ?? item.uuid.slice(0, 8),
      });
    });
    ctxMenuItems.appendChild(btn);
  }

  // Delete option
  const sep2 = document.createElement('div');
  sep2.className = 'ctx-menu-separator';
  ctxMenuItems.appendChild(sep2);
  const delBtn = document.createElement('div');
  delBtn.className   = 'ctx-menu-item ctx-menu-danger';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', async () => {
    hideCtxMenu();
    const { showDeleteModal } = await import('/client/js/delete-modal.js');

    const planItems = new Map();
    let   primaryKey;

    if (folder === 'raw') {
      primaryKey = `raw:${item.uuid}`;
      planItems.set(primaryKey, {
        id: primaryKey, type: 'Raw Image',
        label: item.filename ?? item.uuid.slice(0, 8),
        imageUrl: item.thumbnail ?? item.url,
        checked: true,
        onDelete: () => fetch(`/api/images/raw/${item.uuid}`, { method: 'DELETE' }).catch(() => {}),
      });
      const [allJobs, allSettings] = await Promise.all([
        fetch('/api/jobs').then(r => r.json()).catch(() => []),
        fetch('/api/settings/shopProductImage').then(r => r.json()).catch(() => []),
      ]);
      await extendPlanWithRawConnections(planItems, [item.uuid], allJobs, allSettings);
    } else {
      primaryKey = `output:${item.uuid}`;
      planItems.set(primaryKey, {
        id: primaryKey, type: 'Output Image',
        label: item.filename ?? item.uuid.slice(0, 8),
        imageUrl: item.thumbnail ?? item.url,
        checked: true,
        onDelete: () => fetch(`/api/settings/${folder}/${item.uuid}`, { method: 'DELETE' }).catch(async () => {
          await fetch(`/api/images/${folder}/${item.uuid}`, { method: 'DELETE' }).catch(() => {});
        }),
      });

      const entry = await fetch(`/api/settings/${folder}/${item.uuid}`).then(r => r.json()).catch(() => null);
      if (entry?.settings) {
        const { activeUuid, activeUrl, jobId } = entry.settings;
        if (activeUuid) {
          planItems.set(`raw:${activeUuid}`, {
            id: `raw:${activeUuid}`, type: 'Raw Image',
            label: activeUrl?.split('/').pop() ?? activeUuid.slice(0, 8),
            imageUrl: activeUrl, checked: false,
            onDelete: () => fetch(`/api/images/raw/${activeUuid}`, { method: 'DELETE' }).catch(() => {}),
          });
        }
        if (jobId) {
          const job = await fetch(`/api/jobs/${jobId}`).then(r => r.json()).catch(() => null);
          const rawCount   = Array.isArray(job?.rawImage) ? job.rawImage.length : 0;
          const jobOutputs = Array.isArray(job?.outputs) ? job.outputs : [];

          for (const outputId of jobOutputs) {
            const otherId = `output:${outputId}`;
            if (!planItems.has(otherId)) {
              planItems.set(otherId, {
                id: otherId, type: 'Output Image', label: outputId.slice(0, 8),
                imageUrl: `/api/images/${folder}/${outputId}`, checked: false,
                onDelete: () => fetch(`/api/settings/${folder}/${outputId}`, { method: 'DELETE' }).catch(() => {}),
              });
            }
          }

          const isOnlyOutput = jobOutputs.length === 1 && jobOutputs[0] === item.uuid;
          planItems.set(`job:${jobId}`, {
            id: `job:${jobId}`, type: 'Job', label: `Job ${jobId.slice(0, 8)}`,
            meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
            checked: isOnlyOutput,
            onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {}),
          });
        }
      }
    }

    const deletedIds = await showDeleteModal({ title: 'Delete Image', items: [...planItems.values()] });

    if (deletedIds.includes(primaryKey)) {
      sendToIframe({ type: 'refresh-gallery' });
      toolFrame.dataset.pluginFolder = '';
      await loadRootGallery();
    }
  });
  ctxMenuItems.appendChild(delBtn);

  ctxMenu.classList.remove('hidden');
  const mw = ctxMenu.offsetWidth;
  const mh = ctxMenu.offsetHeight;
  ctxMenu.style.left = `${Math.min(x, window.innerWidth  - mw - 8)}px`;
  ctxMenu.style.top  = `${Math.min(y, window.innerHeight - mh - 8)}px`;
}

function hideCtxMenu() { ctxMenu.classList.add('hidden'); }

function showSidebarCtxMenu(x, y, item) {
  ctxMenuItems.innerHTML = '';
  const delBtn = document.createElement('div');
  delBtn.className   = 'ctx-menu-item ctx-menu-danger';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', async () => {
    hideCtxMenu();
    const { showDeleteModal } = await import('/client/js/delete-modal.js');

    const rawUrl  = `/api/images/raw/${item.uuid}`;

    const [allJobs, allSettings] = await Promise.all([
      fetch('/api/jobs').then(r => r.json()).catch(() => []),
      fetch('/api/settings/shopProductImage').then(r => r.json()).catch(() => []),
    ]);

    const planItems  = new Map();
    const jobOutSeen = new Map(); // jobId → Set of output IDs seen

    planItems.set(`raw:${item.uuid}`, {
      id: `raw:${item.uuid}`,
      type: 'Raw Image',
      label: item.label ?? item.filename ?? item.uuid.slice(0, 8),
      imageUrl: item.thumbnail ?? item.url,
      checked: true,
      onDelete: () => fetch(`/api/images/raw/${item.uuid}`, { method: 'DELETE' }).catch(() => {}),
    });

    // Find outputs directly via activeUrl — covers both new and legacy jobs
    for (const s of allSettings) {
      const sRawUrl = s.settings?.activeUrl ?? s.settings?.rawImage;
      if (sRawUrl !== rawUrl) continue;

      const outId = `output:${s.id}`;
      if (!planItems.has(outId)) {
        planItems.set(outId, {
          id: outId,
          type: 'Output Image',
          label: s.id.slice(0, 8),
          imageUrl: `/api/images/shopProductImage/${s.id}`,
          checked: true,
          onDelete: () => fetch(`/api/settings/shopProductImage/${s.id}`, { method: 'DELETE' }).catch(() => {}),
        });
      }

      const jobId = s.settings?.jobId;
      if (jobId) {
        if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, new Set());
        jobOutSeen.get(jobId).add(s.id);
      }
    }

    // Jobs orphaned by deleting this raw image
    const orphaned = allJobs.filter(j => {
      const imgs = Array.isArray(j.rawImage) ? j.rawImage : [];
      return imgs.length > 0 && imgs.every(u => u === rawUrl);
    });

    for (const job of orphaned) {
      const jobId      = job.id;
      const rawCount   = Array.isArray(job.rawImage) ? job.rawImage.length : 0;
      const jobOutputs = Array.isArray(job.outputs) ? job.outputs : [];

      // Fallback: add outputs directly from job.outputs (covers missing/legacy settings files)
      for (const outputId of jobOutputs) {
        const outId = `output:${outputId}`;
        if (!planItems.has(outId)) {
          planItems.set(outId, {
            id: outId,
            type: 'Output Image',
            label: outputId.slice(0, 8),
            imageUrl: `/api/images/shopProductImage/${outputId}`,
            checked: true,
            onDelete: () => fetch(`/api/settings/shopProductImage/${outputId}`, { method: 'DELETE' }).catch(() => {}),
          });
        }
        if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, new Set());
        jobOutSeen.get(jobId).add(outputId);
      }

      const seenOutputs = jobOutSeen.get(jobId) ?? new Set();
      const allCovered  = jobOutputs.length === 0 || jobOutputs.every(id => seenOutputs.has(id));

      if (!planItems.has(`job:${jobId}`)) {
        planItems.set(`job:${jobId}`, {
          id: `job:${jobId}`,
          type: 'Job',
          label: `Job ${jobId.slice(0, 8)}`,
          meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
          checked: allCovered,
          onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {}),
        });
      }
    }

    const deletedIds = await showDeleteModal({ title: 'Delete Raw Image', items: [...planItems.values()] });

    if (deletedIds.some(id => id === `raw:${item.uuid}`)) {
      const p = state.plugins.find(q => q.folder === state.activePlugin);
      if (p) loadSidebar(p);
      sendToIframe({ type: 'refresh-gallery' });
      toolFrame.dataset.pluginFolder = '';
      loadRootGallery();
    }
  });
  ctxMenuItems.appendChild(delBtn);
  ctxMenu.classList.remove('hidden');
  const mw = ctxMenu.offsetWidth;
  const mh = ctxMenu.offsetHeight;
  ctxMenu.style.left = `${Math.min(x, window.innerWidth  - mw - 8)}px`;
  ctxMenu.style.top  = `${Math.min(y, window.innerHeight - mh - 8)}px`;
}

// ─── Plugin global settings modal ─────────────────────────────
let _settingsFolder = null;

function openSettingsModal(folder) {
  const plugin = state.plugins.find(p => p.folder === folder);
  if (!plugin) return;
  _settingsFolder = folder;

  modalTitle.textContent = `${plugin.name} — Settings`;
  settingEnabled.checked = plugin.enabled;
  globalFields.innerHTML = '';

  for (const field of plugin.globalSettingsSchema ?? []) {
    const wrap     = document.createElement('div');
    wrap.className = 'settings-field';

    const lbl          = document.createElement('label');
    lbl.textContent    = field.label;
    lbl.htmlFor        = `gf-${field.key}`;

    const inp   = document.createElement('input');
    inp.id      = `gf-${field.key}`;
    inp.name    = field.key;
    inp.type    = field.type === 'password' ? 'password'
                : field.type === 'number'   ? 'number'
                :                             'text';
    inp.value   = String(plugin.globalSettings?.[field.key] ?? field.defaultValue ?? '');

    wrap.append(lbl, inp);
    if (field.description) {
      const desc         = document.createElement('div');
      desc.className     = 'field-desc';
      desc.textContent   = field.description;
      wrap.appendChild(desc);
    }
    globalFields.appendChild(wrap);
  }

  settingsModal.classList.remove('hidden');
}

async function saveSettings() {
  const folder = _settingsFolder;
  if (!folder) return;

  const settings = {};
  globalFields.querySelectorAll('input[name]').forEach(inp => {
    settings[inp.name] = inp.type === 'number' ? Number(inp.value) : inp.value;
  });

  await fetch(`/api/plugins/${folder}/config`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ enabled: settingEnabled.checked, globalSettings: settings }),
  });

  const plugin = state.plugins.find(p => p.folder === folder);
  if (plugin) {
    plugin.enabled        = settingEnabled.checked;
    plugin.globalSettings = settings;
  }

  settingsModal.classList.add('hidden');
  renderTabs();
  setTabActive(state.activePlugin);
}

// ─── Event wiring ─────────────────────────────────────────────
function setupListeners() {
  // Sidebar refresh
  $('btn-refresh').addEventListener('click', () => {
    const p = state.plugins.find(q => q.folder === state.activePlugin);
    if (p) loadSidebar(p);
  });

  // Plugins tab (right-aligned)
  $('tab-plugins').addEventListener('click', () => activateTab(PLUGINS_TAB));

  // Settings gear (top-right)
  btnSettings.addEventListener('click', () => {
    if (state.activePlugin && state.activePlugin !== GALLERY_TAB && state.activePlugin !== PLUGINS_TAB) {
      openSettingsModal(state.activePlugin);
    }
  });

  // Modal controls
  $('btn-modal-close').addEventListener('click',   () => settingsModal.classList.add('hidden'));
  $('btn-cancel-global').addEventListener('click', () => settingsModal.classList.add('hidden'));
  $('btn-save-global').addEventListener('click',   saveSettings);
  settingsModal.querySelector('.modal-backdrop')
    .addEventListener('click', () => settingsModal.classList.add('hidden'));

  // Root gallery toolbar
  $('rg-select-all').addEventListener('click', () => {
    rgContent.querySelectorAll('.rg-checkbox').forEach(cb => {
      if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    });
  });
  $('rg-deselect').addEventListener('click', () => {
    rgContent.querySelectorAll('.rg-checkbox').forEach(cb => {
      if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); }
    });
  });
  $('rg-delete').addEventListener('click',  deleteRgSelected);
  $('rg-export').addEventListener('click',  exportRgSelected);
  $('rg-refresh').addEventListener('click', loadRootGallery);

  // Overlay captures drops from sidebar over the iframe
  iframeOverlay.addEventListener('dragenter', e => {
    if (!state.draggedItem) return;
    e.preventDefault();
    iframeOverlay.classList.add('drag-over');
  });
  iframeOverlay.addEventListener('dragover', e => {
    if (!state.draggedItem) return;
    e.preventDefault();
  });
  iframeOverlay.addEventListener('dragleave', () => {
    iframeOverlay.classList.remove('drag-over');
  });
  iframeOverlay.addEventListener('drop', e => {
    e.preventDefault();
    iframeOverlay.classList.remove('drag-over');
    if (!state.draggedItem) return;
    const item   = { ...state.draggedItem };
    state.draggedItem = null;
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB) return;
    const activeJobId = state.activeJobId[folder];
    if (activeJobId) {
      // Generated item from same plugin → load its settings
      if (item.sourceFolder === folder) {
        if (state.iframeReady) sendToIframe({ type: 'add-generated-item', uuid: item.uuid });
      } else {
        addItemToExistingJob(folder, activeJobId, item);
      }
    } else {
      createJobWithItem(item);
    }
  });

  // + button in job tab bar: create new empty job
  $('btn-new-job').addEventListener('click', async () => {
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB) return;
    const plugin = state.plugins.find(p => p.folder === folder);
    if (!plugin) return;
    // Save current job before opening a new one
    if (state.iframeReady) {
      sendToIframe({ type: 'request-save' });
      await waitForSave();
    }
    try {
      const res = await fetch('/api/jobs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageSettings: folder, rawImage: [], settings: {} }),
      });
      if (!res.ok) return;
      const { uuid: jobId } = await res.json();
      const job = { id: jobId, label: 'New', dirty: false };
      state.jobs[folder].push(job);
      state.activeJobId[folder] = jobId;
      showJobTabBar();
      emptyState.style.display = 'none';
      renderJobTabs(folder);
      if (toolFrame.dataset.pluginFolder !== folder) {
        state.iframeReady = false;
        toolFrame.src = plugin.indexUrl;
        toolFrame.dataset.pluginFolder = folder;
      } else if (state.iframeReady) {
        sendToIframe({ type: 'load-job', jobId });
      }
    } catch {}
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
