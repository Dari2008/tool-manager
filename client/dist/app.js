var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// client/src/state.ts
var GALLERY_TAB, PLUGINS_TAB, WORKFLOW_TAB, state;
var init_state = __esm({
  "client/src/state.ts"() {
    GALLERY_TAB = "__gallery__";
    PLUGINS_TAB = "__plugins__";
    WORKFLOW_TAB = "__workflow__";
    state = {
      plugins: [],
      activePlugin: null,
      jobs: {},
      activeJobId: {},
      draggedItem: null,
      loaderCache: {},
      iframeReady: false,
      pendingDrop: null,
      rgSelected: /* @__PURE__ */ new Set(),
      rgGroups: []
    };
  }
});

// client/src/dom.ts
function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found in DOM`);
  return el;
}
var tabsEl, jobTabBar, jobTabsEl, layout, sidebar, itemList, toolFrame, iframeOverlay, iframeWrap, rootGalleryView, pluginsPanelView, workflowView, rgContent, rgCountEl, rgExportBtn, emptyState, btnSettings, settingsModal, modalTitle, settingEnabled, globalFields, ctxMenu, ctxMenuItems;
var init_dom = __esm({
  "client/src/dom.ts"() {
    tabsEl = $("tabs");
    jobTabBar = $("job-tab-bar");
    jobTabsEl = $("job-tabs");
    layout = $("layout");
    sidebar = $("sidebar");
    itemList = $("item-list");
    toolFrame = $("tool-frame");
    iframeOverlay = $("iframe-overlay");
    iframeWrap = $("iframe-wrap");
    rootGalleryView = $("root-gallery-view");
    pluginsPanelView = $("plugins-panel-view");
    workflowView = $("workflow-view");
    rgContent = $("rg-content");
    rgCountEl = $("rg-count");
    rgExportBtn = $("rg-export");
    emptyState = $("empty-state");
    btnSettings = $("btn-plugin-settings");
    settingsModal = $("settings-modal");
    modalTitle = $("modal-title");
    settingEnabled = $("setting-enabled");
    globalFields = $("global-settings-fields");
    ctxMenu = $("ctx-menu");
    ctxMenuItems = $("ctx-menu-items");
  }
});

// client/src/tabs.ts
var tabs_exports = {};
__export(tabs_exports, {
  mkPluginTab: () => mkPluginTab,
  registerActivateTab: () => registerActivateTab,
  renderTabs: () => renderTabs,
  setTabActive: () => setTabActive
});
function renderTabs() {
  tabsEl.innerHTML = "";
  tabsEl.appendChild(mkPluginTab("Gallery", GALLERY_TAB, true));
  tabsEl.appendChild(mkPluginTab("Workflow", WORKFLOW_TAB, true));
  for (const p2 of state.plugins) {
    tabsEl.appendChild(mkPluginTab(p2.name, p2.folder, p2.enabled));
  }
}
function mkPluginTab(label, folder, enabled) {
  const btn = document.createElement("button");
  btn.className = "tab" + (folder === GALLERY_TAB || folder === WORKFLOW_TAB ? " gallery-root" : "") + (!enabled ? " disabled" : "");
  btn.textContent = label;
  btn.dataset.folder = folder;
  if (enabled) btn.addEventListener("click", () => activateTabDynamic(folder));
  return btn;
}
function setTabActive(folder) {
  tabsEl.querySelectorAll(".tab").forEach(
    (t) => t.classList.toggle("active", t.dataset.folder === folder)
  );
  const pluginsBtn = document.getElementById("tab-plugins");
  pluginsBtn?.classList.toggle("active", folder === PLUGINS_TAB);
}
function registerActivateTab(fn) {
  _activateTab = fn;
}
function activateTabDynamic(folder) {
  _activateTab?.(folder);
}
var _activateTab;
var init_tabs = __esm({
  "client/src/tabs.ts"() {
    init_state();
    init_dom();
    _activateTab = null;
  }
});

// client/src/iframe.ts
function sendToIframe(msg) {
  try {
    toolFrame.contentWindow?.postMessage(msg, "*");
  } catch {
  }
}
function setupIframeMessageHandler(loadRootGallery2, createJobWithItem2, loadSidebar2) {
  window.addEventListener("message", (e) => {
    const msg = e.data ?? {};
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;
    switch (msg.type) {
      case "ready":
        state.iframeReady = true;
        if (state.pendingDrop) {
          sendToIframe({ type: "init", jobId: state.pendingDrop.jobId, item: state.pendingDrop.item });
          state.pendingDrop = null;
        } else {
          const jobId = state.activeJobId[folder];
          if (jobId) sendToIframe({ type: "load-job", jobId });
        }
        break;
      case "dirty-state": {
        const jobId = state.activeJobId[folder];
        const job = state.jobs[folder]?.find((j) => j.id === jobId);
        if (job) {
          job.dirty = !!msg.dirty;
          jobTabsEl.querySelector(`[data-job-id="${jobId}"]`)?.classList.toggle("dirty", job.dirty);
        }
        break;
      }
      case "saved": {
        const jobId = msg.jobId ?? state.activeJobId[folder];
        const job = state.jobs[folder]?.find((j) => j.id === jobId);
        if (job) {
          job.dirty = false;
          jobTabsEl.querySelector(`[data-job-id="${jobId}"]`)?.classList.remove("dirty");
        }
        break;
      }
      case "request-new-job":
        if (msg.uuid && msg.url) {
          createJobWithItem2({
            uuid: msg.uuid,
            url: msg.url,
            label: msg.label ?? msg.uuid.slice(0, 8)
          });
        }
        break;
      case "gallery-changed":
        loadRootGallery2();
        break;
      case "refresh-sidebar":
        loadSidebar2({ folder });
        break;
    }
  });
}
var init_iframe = __esm({
  "client/src/iframe.ts"() {
    init_state();
    init_dom();
  }
});

// client/src/jobs.ts
function renderJobTabs(folder) {
  jobTabsEl.innerHTML = "";
  const activeId2 = state.activeJobId[folder];
  for (const job of state.jobs[folder] ?? []) {
    jobTabsEl.appendChild(mkJobTab(folder, job, activeId2));
  }
}
function mkJobTab(folder, job, activeId2) {
  const el = document.createElement("div");
  el.className = "job-tab" + (job.id === activeId2 ? " active" : "") + (job.dirty ? " dirty" : "");
  el.dataset.jobId = job.id;
  const lbl = document.createElement("span");
  lbl.textContent = job.label;
  const cls = document.createElement("button");
  cls.className = "job-tab-close";
  cls.textContent = "\u2715";
  cls.title = "Close";
  cls.addEventListener("click", (e) => {
    e.stopPropagation();
    tryCloseJob(folder, job.id);
  });
  el.append(lbl, cls);
  el.addEventListener("click", () => switchJobTab(folder, job.id));
  return el;
}
async function switchJobTab(folder, jobId) {
  if (state.activeJobId[folder] === jobId) return;
  if (state.iframeReady) {
    sendToIframe({ type: "request-save" });
    await waitForSave();
  }
  state.activeJobId[folder] = jobId;
  jobTabsEl.querySelectorAll(".job-tab").forEach(
    (t) => t.classList.toggle("active", t.dataset.jobId === jobId)
  );
  sendToIframe({ type: "load-job", jobId });
}
async function tryCloseJob(folder, jobId) {
  const job = state.jobs[folder]?.find((j) => j.id === jobId);
  if (!job) return;
  if (job.dirty) {
    const save = confirm(`"${job.label}" has unsaved changes.
Save before closing?`);
    if (save) {
      sendToIframe({ type: "request-save" });
      await waitForSave();
    }
  }
  removeJob(folder, jobId);
}
function removeJob(folder, jobId) {
  const idx = state.jobs[folder]?.findIndex((j) => j.id === jobId) ?? -1;
  if (idx === -1) return;
  state.jobs[folder].splice(idx, 1);
  if (state.jobs[folder].length === 0) {
    state.activeJobId[folder] = null;
    hideJobTabBar();
    emptyState.style.display = "flex";
  } else {
    const next = state.jobs[folder][Math.max(0, idx - 1)];
    state.activeJobId[folder] = next.id;
    renderJobTabs(folder);
    sendToIframe({ type: "load-job", jobId: next.id });
  }
}
function waitForSave() {
  return new Promise((resolve2) => {
    const t = setTimeout(resolve2, 3e3);
    function h2(e) {
      if (e.data?.type === "saved") {
        clearTimeout(t);
        window.removeEventListener("message", h2);
        resolve2();
      }
    }
    window.addEventListener("message", h2);
  });
}
async function createJobWithItem(item) {
  const folder = state.activePlugin;
  if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;
  let jobId;
  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageSettings: folder, rawImage: [item.url], settings: {} })
    });
    if (!res.ok) return;
    ({ uuid: jobId } = await res.json());
  } catch {
    return;
  }
  const job = { id: jobId, label: item.label, dirty: false };
  const wasEmpty = (state.jobs[folder] ?? []).length === 0;
  if (!state.jobs[folder]) state.jobs[folder] = [];
  state.jobs[folder].push(job);
  state.activeJobId[folder] = jobId;
  if (wasEmpty) {
    showJobTabBar();
    emptyState.style.display = "none";
  }
  renderJobTabs(folder);
  const plugin = state.plugins.find((p2) => p2.folder === folder);
  if (!plugin) return;
  if (toolFrame.dataset.pluginFolder !== folder) {
    state.pendingDrop = { jobId, item };
    toolFrame.src = plugin.indexUrl;
    toolFrame.dataset.pluginFolder = folder;
    state.iframeReady = false;
  } else if (!state.iframeReady) {
    state.pendingDrop = { jobId, item };
  } else {
    sendToIframe({ type: "init", jobId, item });
  }
}
async function addItemToExistingJob(folder, jobId, item) {
  try {
    const jobRes = await fetch(`/api/jobs/${jobId}`);
    if (jobRes.ok) {
      const job = await jobRes.json();
      const existing = new Set(job.rawImage ?? []);
      if (!existing.has(item.url)) {
        await fetch(`/api/jobs/${jobId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...job, rawImage: [...existing, item.url] })
        });
      }
    }
  } catch {
  }
  if (state.iframeReady) sendToIframe({ type: "add-item", item });
}
var init_jobs = __esm({
  "client/src/jobs.ts"() {
    init_state();
    init_dom();
    init_iframe();
    init_plugin_area();
  }
});

// client/src/ui/delete-modal.ts
var delete_modal_exports = {};
__export(delete_modal_exports, {
  showDeleteModal: () => showDeleteModal
});
function injectCss() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement("style");
  s.textContent = MODAL_CSS;
  document.head.appendChild(s);
}
async function showDeleteModal({
  title = "Delete",
  items = []
} = {}) {
  injectCss();
  return new Promise((resolve2) => {
    const checkedMap = new Map(items.map((i) => [i.id, i.checked !== false]));
    const imgCardMap = /* @__PURE__ */ new Map();
    const backdrop = mk("div", "dm-backdrop");
    const modal = mk("div", "dm-modal");
    const header = mk("div", "dm-header");
    const titleEl = mk("div", "dm-title");
    titleEl.textContent = title;
    const closeBtn = mk("button", "dm-close");
    closeBtn.textContent = "\u2715";
    closeBtn.title = "Cancel";
    header.append(titleEl, closeBtn);
    const tabsEl3 = mk("div", "dm-tabs");
    const tabItems = mkTab("Items", "items", true);
    const tabImages = mkTab("Images", "images", false);
    tabsEl3.append(tabItems, tabImages);
    const body = mk("div", "dm-body");
    const panelItems = mk("div", "dm-panel active");
    panelItems.dataset.panel = "items";
    const panelImages = mk("div", "dm-panel");
    panelImages.dataset.panel = "images";
    body.append(panelItems, panelImages);
    const footer = mk("div", "dm-footer");
    const selAllBtn = mkBtn("Select All");
    const deselBtn = mkBtn("Deselect All");
    const spacer = mk("div", "dm-spacer");
    const cancelBtn = mkBtn("Cancel");
    const confirmBtn = mkBtn("Delete Selected", "dm-btn-danger");
    footer.append(selAllBtn, deselBtn, spacer, cancelBtn, confirmBtn);
    modal.append(header, tabsEl3, body, footer);
    backdrop.appendChild(modal);
    function syncImg(id, val) {
      const e = imgCardMap.get(id);
      if (!e) return;
      e.cb.checked = val;
      e.card.classList.toggle("checked", val);
    }
    function syncRow(id, val) {
      const row = panelItems.querySelector(`.dm-row[data-id="${CSS.escape(id)}"]`);
      const cb = row?.querySelector(".dm-row-cb");
      if (cb) cb.checked = val;
    }
    for (const item of items) {
      const row = mk("div", "dm-row");
      row.dataset.id = item.id;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "dm-row-cb";
      cb.checked = checkedMap.get(item.id) ?? true;
      cb.addEventListener("change", () => {
        checkedMap.set(item.id, cb.checked);
        syncImg(item.id, cb.checked);
      });
      const info = mk("div", "dm-row-info");
      const typeEl = mk("div", "dm-row-type");
      typeEl.textContent = item.type;
      const labelEl = mk("div", "dm-row-label");
      labelEl.textContent = item.label;
      labelEl.title = item.label;
      info.append(typeEl, labelEl);
      if (item.meta) {
        const m = mk("div", "dm-row-meta");
        m.textContent = item.meta;
        info.appendChild(m);
      }
      row.append(cb, info);
      panelItems.appendChild(row);
    }
    if (!items.length) {
      panelImages.innerHTML = '<div class="dm-img-empty">No items.</div>';
    } else {
      const grid = mk("div", "dm-img-grid");
      for (const item of items) {
        const card = mk("div", "dm-img-card" + (checkedMap.get(item.id) ? " checked" : ""));
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "dm-img-cb";
        cb.checked = checkedMap.get(item.id) ?? true;
        cb.addEventListener("change", (e) => {
          e.stopPropagation();
          checkedMap.set(item.id, cb.checked);
          card.classList.toggle("checked", cb.checked);
          syncRow(item.id, cb.checked);
        });
        if (item.imageUrl) {
          const img = document.createElement("img");
          img.src = item.imageUrl;
          img.alt = item.label;
          img.loading = "lazy";
          img.addEventListener("click", () => {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change"));
          });
          card.appendChild(img);
        } else {
          const ph = mk("div", "dm-img-placeholder");
          ph.addEventListener("click", () => {
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event("change"));
          });
          const ic = mk("div", "dm-img-placeholder-icon");
          ic.textContent = "\u{1F4C4}";
          const tl = mk("div", "dm-img-placeholder-type");
          tl.textContent = item.type;
          ph.append(ic, tl);
          card.appendChild(ph);
        }
        const lbl = mk("div", "dm-img-label");
        lbl.textContent = item.label;
        card.append(cb, lbl);
        grid.appendChild(card);
        imgCardMap.set(item.id, { card, cb });
      }
      panelImages.appendChild(grid);
    }
    [tabItems, tabImages].forEach((tab) => {
      tab.addEventListener("click", () => {
        tabsEl3.querySelectorAll(".dm-tab").forEach((t) => t.classList.toggle("active", t === tab));
        body.querySelectorAll(".dm-panel").forEach(
          (p2) => p2.classList.toggle("active", p2.dataset.panel === tab.dataset.tab)
        );
      });
    });
    selAllBtn.addEventListener("click", () => {
      items.forEach((i) => {
        checkedMap.set(i.id, true);
        syncImg(i.id, true);
      });
      panelItems.querySelectorAll(".dm-row-cb").forEach((cb) => {
        cb.checked = true;
      });
    });
    deselBtn.addEventListener("click", () => {
      items.forEach((i) => {
        checkedMap.set(i.id, false);
        syncImg(i.id, false);
      });
      panelItems.querySelectorAll(".dm-row-cb").forEach((cb) => {
        cb.checked = false;
      });
    });
    function doCancel() {
      backdrop.remove();
      document.removeEventListener("keydown", onEsc);
      resolve2([]);
    }
    function onEsc(e) {
      if (e.key === "Escape") doCancel();
    }
    closeBtn.addEventListener("click", doCancel);
    cancelBtn.addEventListener("click", doCancel);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) doCancel();
    });
    document.addEventListener("keydown", onEsc);
    confirmBtn.addEventListener("click", async () => {
      confirmBtn.textContent = "Deleting\u2026";
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      closeBtn.disabled = true;
      const toDelete = items.filter((i) => checkedMap.get(i.id));
      for (const item of toDelete) {
        try {
          await item.onDelete();
        } catch {
        }
      }
      backdrop.remove();
      document.removeEventListener("keydown", onEsc);
      resolve2(toDelete.map((i) => i.id));
    });
    document.body.appendChild(backdrop);
  });
}
function mk(tag, cls) {
  const el = document.createElement(tag);
  el.className = cls;
  return el;
}
function mkTab(label, key, active) {
  const btn = mk("button", "dm-tab" + (active ? " active" : ""));
  btn.textContent = label;
  btn.dataset.tab = key;
  return btn;
}
function mkBtn(label, extra = "") {
  const btn = mk("button", "dm-btn" + (extra ? " " + extra : ""));
  btn.textContent = label;
  return btn;
}
var MODAL_CSS, _cssInjected;
var init_delete_modal = __esm({
  "client/src/ui/delete-modal.ts"() {
    MODAL_CSS = `
.dm-backdrop {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.dm-modal {
  background: var(--surface, #25252b); border: 1px solid var(--border, #3a3a45);
  border-radius: var(--radius, 8px); width: 520px; max-width: 100%;
  max-height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 8px 48px rgba(0,0,0,.7);
}
.dm-header { display: flex; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border, #3a3a45); flex-shrink: 0; }
.dm-title  { flex: 1; font-size: 15px; font-weight: 600; color: var(--text, #e4e4f0); }
.dm-close  { background: none; border: none; color: var(--text-dim, #888899); cursor: pointer; font-size: 18px; padding: 0 2px; line-height: 1; }
.dm-close:hover { color: var(--text, #e4e4f0); }
.dm-tabs   { display: flex; border-bottom: 1px solid var(--border, #3a3a45); flex-shrink: 0; }
.dm-tab    { padding: 8px 16px; border: none; background: transparent; color: var(--text-dim, #888899); cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .15s, border-color .15s; }
.dm-tab.active { color: var(--text, #e4e4f0); border-bottom-color: var(--accent, #6c63ff); }
.dm-tab:hover:not(.active) { color: var(--text, #e4e4f0); }
.dm-body   { flex: 1; overflow-y: auto; min-height: 0; }
.dm-panel  { display: none; padding: 4px 12px 8px; }
.dm-panel.active { display: block; }
.dm-row    { display: flex; align-items: flex-start; gap: 10px; padding: 9px 4px; border-bottom: 1px solid var(--border, #3a3a45); }
.dm-row:last-child { border-bottom: none; }
.dm-row-cb { margin-top: 3px; flex-shrink: 0; accent-color: var(--accent, #6c63ff); cursor: pointer; width: 15px; height: 15px; }
.dm-row-info { flex: 1; min-width: 0; }
.dm-row-type { font-size: 10px; color: var(--text-dim, #888899); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
.dm-row-label { font-size: 13px; color: var(--text, #e4e4f0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-row-meta { font-size: 11px; color: var(--text-dim, #888899); margin-top: 2px; }
.dm-img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; padding: 4px; }
.dm-img-empty { padding: 32px; text-align: center; color: var(--text-dim, #888899); font-size: 13px; }
.dm-img-card { position: relative; border: 2px solid transparent; border-radius: var(--radius, 8px); overflow: hidden; cursor: pointer; background: var(--surface2, #2e2e36); transition: border-color .12s; }
.dm-img-card.checked { border-color: var(--accent, #6c63ff); }
.dm-img-card img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.dm-img-cb { position: absolute; top: 5px; left: 5px; accent-color: var(--accent, #6c63ff); cursor: pointer; width: 15px; height: 15px; }
.dm-img-label { padding: 3px 6px; font-size: 10px; color: var(--text-dim, #888899); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-img-placeholder { width: 100%; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--text-dim, #888899); }
.dm-img-placeholder-icon { font-size: 28px; line-height: 1; }
.dm-img-placeholder-type { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
.dm-footer { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border, #3a3a45); flex-shrink: 0; }
.dm-spacer { flex: 1; }
.dm-btn { padding: 6px 13px; border: 1px solid var(--border, #3a3a45); border-radius: 6px; background: transparent; color: var(--text, #e4e4f0); cursor: pointer; font-size: 13px; transition: background .12s; }
.dm-btn:hover { background: var(--surface2, #2e2e36); }
.dm-btn:disabled { opacity: .45; cursor: not-allowed; }
.dm-btn-danger { color: var(--danger, #e05c5c); border-color: var(--danger, #e05c5c); }
.dm-btn-danger:hover { background: rgba(224,92,92,.12); }
`;
    _cssInjected = false;
  }
});

// client/src/gallery.ts
async function loadRootGallery() {
  rgContent.innerHTML = '<div class="placeholder">Loading\u2026</div>';
  state.rgSelected.clear();
  updateRgCount();
  try {
    state.rgGroups = await fetch("/api/gallery/all").then((r) => r.json());
    renderRgGroups();
  } catch {
    rgContent.innerHTML = '<div class="placeholder">Failed to load gallery.</div>';
  }
}
function renderRgGroups() {
  rgContent.innerHTML = "";
  const hasAny = state.rgGroups.some((g) => g.items?.length > 0);
  if (!hasAny) {
    rgContent.innerHTML = '<div class="placeholder">No generated images yet.</div>';
    return;
  }
  for (const group of state.rgGroups) {
    if (!group.items?.length) continue;
    const section = document.createElement("div");
    section.className = "rg-section";
    const hdr = document.createElement("div");
    hdr.className = "rg-section-header";
    hdr.innerHTML = `
      <span class="rg-section-title">${group.name}</span>
      <span class="rg-section-count">${group.items.length} image${group.items.length !== 1 ? "s" : ""}</span>`;
    const grid = document.createElement("div");
    grid.className = "rg-grid";
    for (const item of group.items) grid.appendChild(buildRgCard(group.folder, item));
    section.append(hdr, grid);
    rgContent.appendChild(section);
  }
}
function buildRgCard(folder, item) {
  const card = document.createElement("div");
  card.className = "rg-card";
  card.dataset.uuid = item.uuid;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "rg-checkbox";
  cb.addEventListener("change", () => {
    const key = `${folder}:${item.uuid}`;
    if (cb.checked) state.rgSelected.add(key);
    else state.rgSelected.delete(key);
    card.classList.toggle("selected", cb.checked);
    updateRgCount();
  });
  const img = document.createElement("img");
  img.src = item.thumbnail ?? item.url;
  img.alt = item.filename ?? item.uuid;
  img.loading = "lazy";
  img.addEventListener("click", () => {
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event("change"));
  });
  const lbl = document.createElement("div");
  lbl.className = "rg-label";
  lbl.textContent = item.filename ?? item.uuid.slice(0, 8);
  card.append(cb, img, lbl);
  card.draggable = true;
  card.addEventListener("dragstart", (e) => {
    state.draggedItem = { uuid: item.uuid, url: item.url, label: item.filename ?? item.uuid.slice(0, 8), sourceFolder: folder };
    iframeOverlay.classList.add("dragging");
    e.dataTransfer.effectAllowed = "copy";
    document.addEventListener("dragend", () => {
      state.draggedItem = null;
      iframeOverlay.classList.remove("dragging");
    }, { once: true });
  });
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    Promise.resolve().then(() => (init_ctx_menu(), ctx_menu_exports)).then((m) => m.showCtxMenu(e.clientX, e.clientY, folder, item));
  });
  return card;
}
function updateRgCount() {
  const n = state.rgSelected.size;
  rgCountEl.textContent = `${n} selected`;
  document.getElementById("rg-delete").disabled = n === 0;
  rgExportBtn.disabled = n === 0;
}
async function extendPlanWithRawConnections(planItems, rawUuids, allJobs, allSettings) {
  const deletingUrls = new Set(rawUuids.map((uuid) => `/api/images/raw/${uuid}`));
  const jobOutSeen = /* @__PURE__ */ new Map();
  for (const s of allSettings) {
    const rawUrl = s.settings?.activeUrl ?? s.settings?.rawImage;
    if (!rawUrl || !deletingUrls.has(rawUrl)) continue;
    const outId = `output:${s.id}`;
    if (!planItems.has(outId)) {
      planItems.set(outId, {
        id: outId,
        type: "Output Image",
        label: s.id.slice(0, 8),
        imageUrl: `/api/images/shopProductImage/${s.id}`,
        checked: true,
        onDelete: () => fetch(`/api/settings/shopProductImage/${s.id}`, { method: "DELETE" }).then(() => {
        })
      });
    }
    const jobId = s.settings?.jobId;
    if (jobId) {
      if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, /* @__PURE__ */ new Set());
      jobOutSeen.get(jobId).add(s.id);
    }
  }
  const orphaned = allJobs.filter((j) => {
    const imgs = Array.isArray(j.rawImage) ? j.rawImage : [];
    return imgs.length > 0 && imgs.every((u) => deletingUrls.has(u));
  });
  for (const job of orphaned) {
    const jobId = job.id;
    const rawCount = Array.isArray(job.rawImage) ? job.rawImage.length : 0;
    const jobOutputs = Array.isArray(job.outputs) ? job.outputs : [];
    for (const outputId of jobOutputs) {
      const outId = `output:${outputId}`;
      if (!planItems.has(outId)) {
        planItems.set(outId, {
          id: outId,
          type: "Output Image",
          label: outputId.slice(0, 8),
          imageUrl: `/api/images/shopProductImage/${outputId}`,
          checked: true,
          onDelete: () => fetch(`/api/settings/shopProductImage/${outputId}`, { method: "DELETE" }).then(() => {
          })
        });
      }
      if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, /* @__PURE__ */ new Set());
      jobOutSeen.get(jobId).add(outputId);
    }
    const seenOutputs = jobOutSeen.get(jobId) ?? /* @__PURE__ */ new Set();
    const allCovered = jobOutputs.length === 0 || jobOutputs.every((id) => seenOutputs.has(id));
    if (!planItems.has(`job:${jobId}`)) {
      planItems.set(`job:${jobId}`, {
        id: `job:${jobId}`,
        type: "Job",
        label: `Job ${jobId.slice(0, 8)}`,
        meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? "s" : ""})` : void 0,
        checked: allCovered,
        onDelete: () => fetch(`/api/jobs/${jobId}`, { method: "DELETE" }).then(() => {
        })
      });
    }
  }
}
async function deleteRgSelected() {
  if (!state.rgSelected.size) return;
  const { showDeleteModal: showDeleteModal2 } = await Promise.resolve().then(() => (init_delete_modal(), delete_modal_exports));
  const toDelete = [...state.rgSelected].map((key) => {
    const [folder, ...rest] = key.split(":");
    return { folder, uuid: rest.join(":") };
  });
  const planItems = /* @__PURE__ */ new Map();
  const jobDataCache = /* @__PURE__ */ new Map();
  const selectedOutIds = new Set(toDelete.filter((t) => t.folder !== "raw").map((t) => t.uuid));
  const rawUuids = [];
  for (const { folder, uuid } of toDelete) {
    const galleryItem = state.rgGroups.find((g) => g.folder === folder)?.items.find((i) => i.uuid === uuid);
    if (folder === "raw") {
      rawUuids.push(uuid);
      planItems.set(`raw:${uuid}`, {
        id: `raw:${uuid}`,
        type: "Raw Image",
        label: galleryItem?.filename ?? uuid.slice(0, 8),
        imageUrl: galleryItem?.thumbnail ?? galleryItem?.url,
        checked: true,
        onDelete: () => fetch(`/api/images/raw/${uuid}`, { method: "DELETE" }).then(() => {
        })
      });
      continue;
    }
    planItems.set(`output:${uuid}`, {
      id: `output:${uuid}`,
      type: "Output Image",
      label: galleryItem?.filename ?? uuid.slice(0, 8),
      imageUrl: galleryItem?.thumbnail ?? galleryItem?.url,
      checked: true,
      onDelete: () => fetch(`/api/settings/${folder}/${uuid}`, { method: "DELETE" }).then(() => {
      })
    });
    const entry = await fetch(`/api/settings/${folder}/${uuid}`).then((r) => r.json()).catch(() => null);
    if (!entry?.settings) continue;
    const { activeUuid, activeUrl, jobId } = entry.settings;
    if (activeUuid && !planItems.has(`raw:${activeUuid}`)) {
      planItems.set(`raw:${activeUuid}`, {
        id: `raw:${activeUuid}`,
        type: "Raw Image",
        label: activeUrl?.split("/").pop() ?? activeUuid.slice(0, 8),
        imageUrl: activeUrl,
        checked: false,
        onDelete: () => fetch(`/api/images/raw/${activeUuid}`, { method: "DELETE" }).then(() => {
        })
      });
    }
    if (jobId && !jobDataCache.has(jobId)) {
      const job = await fetch(`/api/jobs/${jobId}`).then((r) => r.json()).catch(() => null);
      if (job) jobDataCache.set(jobId, job);
    }
    if (jobId && !planItems.has(`job:${jobId}`)) {
      const job = jobDataCache.get(jobId);
      const rawCount = Array.isArray(job?.rawImage) ? job.rawImage.length : 0;
      const jobOutputs = Array.isArray(job?.outputs) ? job.outputs : [];
      for (const outputId of jobOutputs) {
        const otherId = `output:${outputId}`;
        if (!planItems.has(otherId)) {
          planItems.set(otherId, {
            id: otherId,
            type: "Output Image",
            label: outputId.slice(0, 8),
            imageUrl: `/api/images/${folder}/${outputId}`,
            checked: selectedOutIds.has(outputId),
            onDelete: () => fetch(`/api/settings/${folder}/${outputId}`, { method: "DELETE" }).then(() => {
            })
          });
        }
      }
      const allOutputsSelected = jobOutputs.length > 0 && jobOutputs.every((id) => selectedOutIds.has(id));
      planItems.set(`job:${jobId}`, {
        id: `job:${jobId}`,
        type: "Job",
        label: `Job ${jobId.slice(0, 8)}`,
        meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? "s" : ""})` : void 0,
        checked: allOutputsSelected,
        onDelete: () => fetch(`/api/jobs/${jobId}`, { method: "DELETE" }).then(() => {
        })
      });
    }
  }
  if (rawUuids.length > 0) {
    const [allJobs, allSettings] = await Promise.all([
      fetch("/api/jobs").then((r) => r.json()).catch(() => []),
      fetch("/api/settings/shopProductImage").then((r) => r.json()).catch(() => [])
    ]);
    await extendPlanWithRawConnections(planItems, rawUuids, allJobs, allSettings);
  }
  const n = toDelete.length;
  const deletedIds = await showDeleteModal2({
    title: n === 1 ? "Delete Image" : `Delete ${n} Images`,
    items: [...planItems.values()]
  });
  if (!deletedIds.length) return;
  sendToIframe({ type: "refresh-gallery" });
  toolFrame.dataset.pluginFolder = "";
  await loadRootGallery();
}
async function exportRgSelected() {
  if (!state.rgSelected.size) return;
  const toExport = [];
  for (const key of state.rgSelected) {
    const [folder, uuid] = key.split(":");
    const item = state.rgGroups.find((g) => g.folder === folder)?.items.find((i) => i.uuid === uuid);
    if (item) toExport.push(item);
  }
  const origText = rgExportBtn.textContent;
  rgExportBtn.textContent = "Preparing\u2026";
  rgExportBtn.disabled = true;
  try {
    const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
    const zip = new JSZip();
    await Promise.all(toExport.map(async (item) => {
      const res = await fetch(item.url);
      if (!res.ok) return;
      zip.file(item.filename ?? `${item.uuid}.jpg`, await res.blob());
    }));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gallery-export.zip";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    rgExportBtn.textContent = origText ?? "Export Selected";
    updateRgCount();
  }
}
var init_gallery = __esm({
  "client/src/gallery.ts"() {
    init_state();
    init_dom();
    init_iframe();
  }
});

// client/src/ctx-menu.ts
var ctx_menu_exports = {};
__export(ctx_menu_exports, {
  hideCtxMenu: () => hideCtxMenu,
  showCtxMenu: () => showCtxMenu,
  showSidebarCtxMenu: () => showSidebarCtxMenu
});
function hideCtxMenu() {
  ctxMenu.classList.add("hidden");
}
async function showCtxMenu(x, y, folder, item) {
  const receivers = state.plugins.filter((p2) => p2.canReceiveExternalItem && p2.enabled);
  if (!receivers.length) return;
  ctxMenuItems.innerHTML = "";
  const header = document.createElement("div");
  header.className = "ctx-menu-label";
  header.textContent = "Open in\u2026";
  ctxMenuItems.appendChild(header);
  ctxMenuItems.appendChild(mkSep());
  for (const p2 of receivers) {
    const btn = document.createElement("div");
    btn.className = "ctx-menu-item";
    btn.textContent = p2.name;
    btn.addEventListener("click", async () => {
      hideCtxMenu();
      const { activateTab: activateTab2 } = await Promise.resolve().then(() => (init_main(), main_exports));
      await activateTab2(p2.folder);
      await createJobWithItem({ uuid: item.uuid, url: item.url, label: item.filename ?? item.uuid.slice(0, 8) });
    });
    ctxMenuItems.appendChild(btn);
  }
  ctxMenuItems.appendChild(mkSep());
  const delBtn = document.createElement("div");
  delBtn.className = "ctx-menu-item ctx-menu-danger";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", async () => {
    hideCtxMenu();
    const { showDeleteModal: showDeleteModal2 } = await Promise.resolve().then(() => (init_delete_modal(), delete_modal_exports));
    const planItems = /* @__PURE__ */ new Map();
    let primaryKey;
    if (folder === "raw") {
      primaryKey = `raw:${item.uuid}`;
      planItems.set(primaryKey, {
        id: primaryKey,
        type: "Raw Image",
        label: item.filename ?? item.uuid.slice(0, 8),
        imageUrl: item.thumbnail ?? item.url,
        checked: true,
        onDelete: () => fetch(`/api/images/raw/${item.uuid}`, { method: "DELETE" }).then(() => {
        })
      });
      const [allJobs, allSettings] = await Promise.all([
        fetch("/api/jobs").then((r) => r.json()).catch(() => []),
        fetch("/api/settings/shopProductImage").then((r) => r.json()).catch(() => [])
      ]);
      await extendPlanWithRawConnections(planItems, [item.uuid], allJobs, allSettings);
    } else {
      primaryKey = `output:${item.uuid}`;
      planItems.set(primaryKey, {
        id: primaryKey,
        type: "Output Image",
        label: item.filename ?? item.uuid.slice(0, 8),
        imageUrl: item.thumbnail ?? item.url,
        checked: true,
        onDelete: () => fetch(`/api/settings/${folder}/${item.uuid}`, { method: "DELETE" }).then(() => {
        })
      });
      const entry = await fetch(`/api/settings/${folder}/${item.uuid}`).then((r) => r.json()).catch(() => null);
      if (entry?.settings) {
        const { activeUuid, activeUrl, jobId } = entry.settings;
        if (activeUuid) {
          planItems.set(`raw:${activeUuid}`, {
            id: `raw:${activeUuid}`,
            type: "Raw Image",
            label: activeUrl?.split("/").pop() ?? activeUuid.slice(0, 8),
            imageUrl: activeUrl,
            checked: false,
            onDelete: () => fetch(`/api/images/raw/${activeUuid}`, { method: "DELETE" }).then(() => {
            })
          });
        }
        if (jobId) {
          const job = await fetch(`/api/jobs/${jobId}`).then((r) => r.json()).catch(() => null);
          const rawCount = Array.isArray(job?.rawImage) ? job.rawImage.length : 0;
          const jobOutputs = Array.isArray(job?.outputs) ? job.outputs : [];
          for (const outputId of jobOutputs) {
            const otherId = `output:${outputId}`;
            if (!planItems.has(otherId)) {
              planItems.set(otherId, {
                id: otherId,
                type: "Output Image",
                label: outputId.slice(0, 8),
                imageUrl: `/api/images/${folder}/${outputId}`,
                checked: false,
                onDelete: () => fetch(`/api/settings/${folder}/${outputId}`, { method: "DELETE" }).then(() => {
                })
              });
            }
          }
          const isOnlyOutput = jobOutputs.length === 1 && jobOutputs[0] === item.uuid;
          planItems.set(`job:${jobId}`, {
            id: `job:${jobId}`,
            type: "Job",
            label: `Job ${jobId.slice(0, 8)}`,
            meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? "s" : ""})` : void 0,
            checked: isOnlyOutput,
            onDelete: () => fetch(`/api/jobs/${jobId}`, { method: "DELETE" }).then(() => {
            })
          });
        }
      }
    }
    const deletedIds = await showDeleteModal2({ title: "Delete Image", items: [...planItems.values()] });
    if (deletedIds.includes(primaryKey)) {
      sendToIframe({ type: "refresh-gallery" });
      toolFrame.dataset.pluginFolder = "";
      await loadRootGallery();
    }
  });
  ctxMenuItems.appendChild(delBtn);
  positionMenu(x, y);
}
function showSidebarCtxMenu(x, y, item) {
  ctxMenuItems.innerHTML = "";
  const delBtn = document.createElement("div");
  delBtn.className = "ctx-menu-item ctx-menu-danger";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", async () => {
    hideCtxMenu();
    const { showDeleteModal: showDeleteModal2 } = await Promise.resolve().then(() => (init_delete_modal(), delete_modal_exports));
    const rawUrl = `/api/images/raw/${item.uuid}`;
    const [allJobs, allSettings] = await Promise.all([
      fetch("/api/jobs").then((r) => r.json()).catch(() => []),
      fetch("/api/settings/shopProductImage").then((r) => r.json()).catch(() => [])
    ]);
    const planItems = /* @__PURE__ */ new Map();
    const jobOutSeen = /* @__PURE__ */ new Map();
    planItems.set(`raw:${item.uuid}`, {
      id: `raw:${item.uuid}`,
      type: "Raw Image",
      label: item.label ?? item.filename ?? item.uuid.slice(0, 8),
      imageUrl: item.thumbnail ?? item.url,
      checked: true,
      onDelete: () => fetch(`/api/images/raw/${item.uuid}`, { method: "DELETE" }).then(() => {
      })
    });
    for (const s of allSettings) {
      const sRawUrl = s.settings?.activeUrl ?? s.settings?.rawImage;
      if (sRawUrl !== rawUrl) continue;
      const outId = `output:${s.id}`;
      if (!planItems.has(outId)) {
        planItems.set(outId, {
          id: outId,
          type: "Output Image",
          label: s.id.slice(0, 8),
          imageUrl: `/api/images/shopProductImage/${s.id}`,
          checked: true,
          onDelete: () => fetch(`/api/settings/shopProductImage/${s.id}`, { method: "DELETE" }).then(() => {
          })
        });
      }
      const jobId = s.settings?.jobId;
      if (jobId) {
        if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, /* @__PURE__ */ new Set());
        jobOutSeen.get(jobId).add(s.id);
      }
    }
    const orphaned = allJobs.filter((j) => {
      const imgs = Array.isArray(j.rawImage) ? j.rawImage : [];
      return imgs.length > 0 && imgs.every((u) => u === rawUrl);
    });
    for (const job of orphaned) {
      const jobId = job.id;
      const rawCount = Array.isArray(job.rawImage) ? job.rawImage.length : 0;
      const jobOutputs = Array.isArray(job.outputs) ? job.outputs : [];
      for (const outputId of jobOutputs) {
        const outId = `output:${outputId}`;
        if (!planItems.has(outId)) {
          planItems.set(outId, {
            id: outId,
            type: "Output Image",
            label: outputId.slice(0, 8),
            imageUrl: `/api/images/shopProductImage/${outputId}`,
            checked: true,
            onDelete: () => fetch(`/api/settings/shopProductImage/${outputId}`, { method: "DELETE" }).then(() => {
            })
          });
        }
        if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, /* @__PURE__ */ new Set());
        jobOutSeen.get(jobId).add(outputId);
      }
      const seenOutputs = jobOutSeen.get(jobId) ?? /* @__PURE__ */ new Set();
      const allCovered = jobOutputs.length === 0 || jobOutputs.every((id) => seenOutputs.has(id));
      if (!planItems.has(`job:${jobId}`)) {
        planItems.set(`job:${jobId}`, {
          id: `job:${jobId}`,
          type: "Job",
          label: `Job ${jobId.slice(0, 8)}`,
          meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? "s" : ""})` : void 0,
          checked: allCovered,
          onDelete: () => fetch(`/api/jobs/${jobId}`, { method: "DELETE" }).then(() => {
          })
        });
      }
    }
    const deletedIds = await showDeleteModal2({ title: "Delete Raw Image", items: [...planItems.values()] });
    if (deletedIds.some((id) => id === `raw:${item.uuid}`)) {
      const p2 = state.plugins.find((q) => q.folder === state.activePlugin);
      if (p2) loadSidebar(p2);
      sendToIframe({ type: "refresh-gallery" });
      toolFrame.dataset.pluginFolder = "";
      loadRootGallery();
    }
  });
  ctxMenuItems.appendChild(delBtn);
  positionMenu(x, y);
}
function mkSep() {
  const sep = document.createElement("div");
  sep.className = "ctx-menu-separator";
  return sep;
}
function positionMenu(x, y) {
  ctxMenu.classList.remove("hidden");
  const mw = ctxMenu.offsetWidth;
  const mh = ctxMenu.offsetHeight;
  ctxMenu.style.left = `${Math.min(x, window.innerWidth - mw - 8)}px`;
  ctxMenu.style.top = `${Math.min(y, window.innerHeight - mh - 8)}px`;
}
var init_ctx_menu = __esm({
  "client/src/ctx-menu.ts"() {
    init_state();
    init_dom();
    init_iframe();
    init_gallery();
    init_jobs();
    init_sidebar();
  }
});

// client/src/sidebar.ts
async function loadSidebar(plugin) {
  itemList.innerHTML = '<div class="loading">Loading\u2026</div>';
  try {
    const [items, loader] = await Promise.all([
      fetch(`/api/listItems/get?folder=${encodeURIComponent(plugin.folder)}`).then((r) => r.json()),
      loadPluginLoader(plugin)
    ]);
    if (!Array.isArray(items) || items.length === 0) {
      itemList.innerHTML = '<div class="empty">No items</div>';
      return;
    }
    itemList.innerHTML = "";
    for (const item of items) {
      const loader_ = loader;
      const el = loader_?.render ? loader_.render(item) : defaultListItem(item);
      el.draggable = true;
      el.dataset.uuid = item.uuid;
      el.dataset.url = item.url ?? "";
      el.dataset.label = item.label ?? item.uuid;
      el.classList.add("list-item");
      el.addEventListener("dragstart", handleDragStart);
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        Promise.resolve().then(() => (init_ctx_menu(), ctx_menu_exports)).then((m) => m.showSidebarCtxMenu(
          e.clientX,
          e.clientY,
          item
        ));
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
  } catch {
    return null;
  }
}
function defaultListItem(item) {
  const el = document.createElement("div");
  const src = item.thumbnail ?? item.url;
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = item.label ?? "";
    img.loading = "lazy";
    el.appendChild(img);
  }
  const span = document.createElement("span");
  span.textContent = item.label ?? item.uuid;
  el.appendChild(span);
  return el;
}
function handleDragStart(e) {
  const drag = e;
  const el = drag.currentTarget;
  state.draggedItem = {
    uuid: el.dataset.uuid,
    url: el.dataset.url,
    label: el.dataset.label
  };
  el.classList.add("dragging");
  const overlay = document.getElementById("iframe-overlay");
  overlay?.classList.add("dragging");
  drag.dataTransfer.effectAllowed = "copy";
  document.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    overlay?.classList.remove("dragging");
    state.draggedItem = null;
  }, { once: true });
}
var init_sidebar = __esm({
  "client/src/sidebar.ts"() {
    init_state();
    init_dom();
  }
});

// client/src/plugin-area.ts
var plugin_area_exports = {};
__export(plugin_area_exports, {
  hideJobTabBar: () => hideJobTabBar,
  loadPluginIframe: () => loadPluginIframe,
  showGallery: () => showGallery,
  showJobTabBar: () => showJobTabBar,
  showPluginArea: () => showPluginArea,
  showPluginsPanel: () => showPluginsPanel,
  showWorkflowTab: () => showWorkflowTab
});
function showGallery() {
  rootGalleryView.style.display = "flex";
  pluginsPanelView.style.display = "none";
  workflowView.style.display = "none";
  iframeWrap.style.display = "none";
  emptyState.style.display = "none";
  sidebar.classList.add("hidden");
  iframeOverlay.classList.remove("active");
  hideJobTabBar();
  btnSettings.style.display = "none";
}
function showWorkflowTab() {
  rootGalleryView.style.display = "none";
  pluginsPanelView.style.display = "none";
  workflowView.style.display = "flex";
  iframeWrap.style.display = "none";
  emptyState.style.display = "none";
  sidebar.classList.add("hidden");
  iframeOverlay.classList.remove("active");
  hideJobTabBar();
  btnSettings.style.display = "none";
}
function showPluginsPanel() {
  rootGalleryView.style.display = "none";
  pluginsPanelView.style.display = "flex";
  workflowView.style.display = "none";
  iframeWrap.style.display = "none";
  emptyState.style.display = "none";
  sidebar.classList.add("hidden");
  iframeOverlay.classList.remove("active");
  hideJobTabBar();
  btnSettings.style.display = "none";
  renderPluginsPanel();
}
function showPluginArea(plugin) {
  rootGalleryView.style.display = "none";
  pluginsPanelView.style.display = "none";
  workflowView.style.display = "none";
  iframeWrap.style.display = "";
  btnSettings.style.display = "";
  const hasSidebar = plugin.hasSidebar !== false;
  if (hasSidebar) {
    sidebar.classList.remove("hidden");
    iframeOverlay.classList.add("active");
    loadSidebar(plugin);
  } else {
    sidebar.classList.add("hidden");
    iframeOverlay.classList.remove("active");
  }
  const jobs = state.jobs[plugin.folder] ?? [];
  if (!hasSidebar) {
    hideJobTabBar();
    emptyState.style.display = "none";
    loadPluginIframe(plugin);
    return;
  }
  if (jobs.length === 0) {
    hideJobTabBar();
    emptyState.style.display = "flex";
    loadPluginIframe(plugin);
  } else {
    emptyState.style.display = "none";
    const jobId = state.activeJobId[plugin.folder] ?? jobs[0].id;
    state.activeJobId[plugin.folder] = jobId;
    showJobTabBar();
    renderJobTabs(plugin.folder);
    if (toolFrame.dataset.pluginFolder !== plugin.folder) {
      loadPluginIframe(plugin);
    } else {
      sendToIframe({ type: "load-job", jobId });
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
function showJobTabBar() {
  jobTabBar.style.display = "flex";
  layout.classList.add("with-job-tabs");
}
function hideJobTabBar() {
  jobTabBar.style.display = "none";
  layout.classList.remove("with-job-tabs");
}
function renderPluginsPanel() {
  const ppList = document.getElementById("pp-list");
  ppList.innerHTML = "";
  for (const plugin of state.plugins) {
    ppList.appendChild(buildPluginRow(plugin));
  }
}
function buildPluginRow(plugin) {
  const row = document.createElement("div");
  row.className = "pp-row";
  const hdr = document.createElement("div");
  hdr.className = "pp-row-header";
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "pp-toggle";
  const toggleCb = document.createElement("input");
  toggleCb.type = "checkbox";
  toggleCb.checked = plugin.enabled;
  const track2 = document.createElement("span");
  track2.className = "pp-toggle-track";
  toggleLabel.append(toggleCb, track2);
  toggleCb.addEventListener("change", async () => {
    await fetch(`/api/plugins/${plugin.folder}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: toggleCb.checked })
    });
    plugin.enabled = toggleCb.checked;
    const { renderTabs: renderTabs2, setTabActive: setTabActive2 } = await Promise.resolve().then(() => (init_tabs(), tabs_exports));
    renderTabs2();
    setTabActive2(PLUGINS_TAB);
  });
  const nameEl = document.createElement("span");
  nameEl.className = "pp-name";
  nameEl.textContent = plugin.name;
  hdr.append(toggleLabel, nameEl);
  const hasSettings = (plugin.globalSettingsSchema ?? []).length > 0;
  if (hasSettings) {
    const expandBtn = document.createElement("button");
    expandBtn.className = "pp-expand-btn";
    expandBtn.textContent = "\u25BE Settings";
    const body = document.createElement("div");
    body.className = "pp-settings-body";
    body.hidden = true;
    for (const field of plugin.globalSettingsSchema) {
      const wrap = document.createElement("div");
      wrap.className = "pp-field";
      const lbl = document.createElement("label");
      lbl.textContent = field.label;
      const inp = document.createElement("input");
      inp.type = field.type === "password" ? "password" : field.type === "number" ? "number" : "text";
      inp.value = String(plugin.globalSettings?.[field.key] ?? field.defaultValue ?? "");
      inp.name = field.key;
      wrap.append(lbl, inp);
      if (field.description) {
        const desc = document.createElement("div");
        desc.className = "pp-desc";
        desc.textContent = field.description;
        wrap.appendChild(desc);
      }
      body.appendChild(wrap);
    }
    const saveRow = document.createElement("div");
    saveRow.className = "pp-save-row";
    const saveBtn = document.createElement("button");
    saveBtn.className = "pp-save-btn";
    saveBtn.textContent = "Save";
    const status = document.createElement("span");
    status.className = "pp-status";
    saveBtn.addEventListener("click", async () => {
      const settings = {};
      body.querySelectorAll("input[name]").forEach((inp) => {
        settings[inp.name] = inp.type === "number" ? Number(inp.value) : inp.value;
      });
      await fetch(`/api/plugins/${plugin.folder}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalSettings: settings })
      });
      plugin.globalSettings = settings;
      status.textContent = "Saved \u2713";
      setTimeout(() => {
        status.textContent = "";
      }, 2e3);
    });
    saveRow.append(saveBtn, status);
    body.appendChild(saveRow);
    expandBtn.addEventListener("click", () => {
      const open = body.hidden;
      body.hidden = !open;
      expandBtn.textContent = open ? "\u25B4 Settings" : "\u25BE Settings";
    });
    hdr.appendChild(expandBtn);
    row.append(hdr, body);
  } else {
    const noSet = document.createElement("span");
    noSet.className = "pp-no-settings";
    noSet.textContent = "No settings";
    hdr.appendChild(noSet);
    row.appendChild(hdr);
  }
  return row;
}
var init_plugin_area = __esm({
  "client/src/plugin-area.ts"() {
    init_state();
    init_dom();
    init_jobs();
    init_iframe();
    init_sidebar();
  }
});

// client/src/settings.ts
function openSettingsModal(folder) {
  const plugin = state.plugins.find((p2) => p2.folder === folder);
  if (!plugin) return;
  _settingsFolder = folder;
  modalTitle.textContent = `${plugin.name} \u2014 Settings`;
  settingEnabled.checked = plugin.enabled;
  globalFields.innerHTML = "";
  for (const field of plugin.globalSettingsSchema ?? []) {
    const wrap = document.createElement("div");
    wrap.className = "settings-field";
    const lbl = document.createElement("label");
    lbl.textContent = field.label;
    lbl.htmlFor = `gf-${field.key}`;
    const inp = document.createElement("input");
    inp.id = `gf-${field.key}`;
    inp.name = field.key;
    inp.type = field.type === "password" ? "password" : field.type === "number" ? "number" : "text";
    inp.value = String(plugin.globalSettings?.[field.key] ?? field.defaultValue ?? "");
    wrap.append(lbl, inp);
    if (field.description) {
      const desc = document.createElement("div");
      desc.className = "field-desc";
      desc.textContent = field.description;
      wrap.appendChild(desc);
    }
    globalFields.appendChild(wrap);
  }
  settingsModal.classList.remove("hidden");
}
async function saveSettings() {
  const folder = _settingsFolder;
  if (!folder) return;
  const settings = {};
  globalFields.querySelectorAll("input[name]").forEach((inp) => {
    settings[inp.name] = inp.type === "number" ? Number(inp.value) : inp.value;
  });
  await fetch(`/api/plugins/${folder}/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: settingEnabled.checked, globalSettings: settings })
  });
  const plugin = state.plugins.find((p2) => p2.folder === folder);
  if (plugin) {
    plugin.enabled = settingEnabled.checked;
    plugin.globalSettings = settings;
  }
  settingsModal.classList.add("hidden");
  const { renderTabs: renderTabs2, setTabActive: setTabActive2 } = await Promise.resolve().then(() => (init_tabs(), tabs_exports));
  renderTabs2();
  setTabActive2(state.activePlugin);
}
var _settingsFolder;
var init_settings = __esm({
  "client/src/settings.ts"() {
    init_state();
    init_dom();
    _settingsFolder = null;
  }
});

// node_modules/uuid/dist/stringify.js
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
var byteToHex;
var init_stringify = __esm({
  "node_modules/uuid/dist/stringify.js"() {
    byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).slice(1));
    }
  }
});

// node_modules/uuid/dist/rng.js
function rng() {
  if (!getRandomValues) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
    getRandomValues = crypto.getRandomValues.bind(crypto);
  }
  return getRandomValues(rnds8);
}
var getRandomValues, rnds8;
var init_rng = __esm({
  "node_modules/uuid/dist/rng.js"() {
    rnds8 = new Uint8Array(16);
  }
});

// node_modules/uuid/dist/native.js
var randomUUID, native_default;
var init_native = __esm({
  "node_modules/uuid/dist/native.js"() {
    randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    native_default = { randomUUID };
  }
});

// node_modules/uuid/dist/v4.js
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  return _v4(options, buf, offset);
}
var v4_default;
var init_v4 = __esm({
  "node_modules/uuid/dist/v4.js"() {
    init_native();
    init_rng();
    init_stringify();
    v4_default = v4;
  }
});

// node_modules/uuid/dist/index.js
var init_dist = __esm({
  "node_modules/uuid/dist/index.js"() {
    init_v4();
  }
});

// node_modules/@baklavajs/events/dist/esm/subscribable.js
var Subscribable;
var init_subscribable = __esm({
  "node_modules/@baklavajs/events/dist/esm/subscribable.js"() {
    Subscribable = class {
      constructor() {
        this.listenerMap = /* @__PURE__ */ new Map();
        this._listeners = [];
        this.proxyMap = /* @__PURE__ */ new Map();
        this.proxies = [];
      }
      get listeners() {
        return this._listeners.concat(this.proxies.flatMap((getListeners) => getListeners()));
      }
      /**
       * Subscribe to the event / hook
       * @param token A token that can be used to unsubscribe from the event / hook later on
       * @param callback A callback that will be invoked when the event / hook occurs
       */
      subscribe(token, callback) {
        if (this.listenerMap.has(token)) {
          console.warn("Already subscribed. Unsubscribing for you.\nPlease check that you don't accidentally use the same token twice to register two different handlers for the same event/hook.");
          this.unsubscribe(token);
        }
        this.listenerMap.set(token, callback);
        this._listeners.push(callback);
      }
      /**
       * Remove a listener
       * @param token The token that was specified when subscribing to the listener.
       * An invalid token does not result in an error.
       */
      unsubscribe(token) {
        if (this.listenerMap.has(token)) {
          const callback = this.listenerMap.get(token);
          this.listenerMap.delete(token);
          const i = this._listeners.indexOf(callback);
          if (i >= 0) {
            this._listeners.splice(i, 1);
          }
        }
      }
      /** This function is only used internally for proxies */
      registerProxy(token, getListeners) {
        if (this.proxyMap.has(token)) {
          console.warn("Already subscribed. Unsubscribing for you.\nPlease check that you don't accidentally use the same token twice to register two different proxies for the same event/hook.");
          this.unregisterProxy(token);
        }
        this.proxyMap.set(token, getListeners);
        this.proxies.push(getListeners);
      }
      /** This function is only used internally for proxies */
      unregisterProxy(token) {
        if (!this.proxyMap.has(token)) {
          return;
        }
        const getListeners = this.proxyMap.get(token);
        this.proxyMap.delete(token);
        const i = this.proxies.indexOf(getListeners);
        if (i >= 0) {
          this.proxies.splice(i, 1);
        }
      }
    };
  }
});

// node_modules/@baklavajs/events/dist/esm/event.js
var BaklavaEvent, PreventableBaklavaEvent;
var init_event = __esm({
  "node_modules/@baklavajs/events/dist/esm/event.js"() {
    init_subscribable();
    BaklavaEvent = class extends Subscribable {
      constructor(entity) {
        super();
        this.entity = entity;
      }
      /**
       * Invoke all listeners
       * @param data The data to invoke the listeners with.
       */
      emit(data) {
        this.listeners.forEach((l) => l(data, this.entity));
      }
    };
    PreventableBaklavaEvent = class extends Subscribable {
      constructor(entity) {
        super();
        this.entity = entity;
      }
      /**
       * Invoke all listeners.
       * @param data The data to invoke all listeners with
       * @returns An object, where the `prevented` field is `true` when one of the listeners requested to prevent the event, otherwise `false`
       */
      emit(data) {
        let prevented = false;
        const prevent = () => [prevented = true];
        for (const l of Array.from(this.listeners.values())) {
          l(data, prevent, this.entity);
          if (prevented) {
            return { prevented: true };
          }
        }
        return { prevented: false };
      }
    };
  }
});

// node_modules/@baklavajs/events/dist/esm/hook.js
var DynamicSequentialHook, SequentialHook, ParallelHook;
var init_hook = __esm({
  "node_modules/@baklavajs/events/dist/esm/hook.js"() {
    init_subscribable();
    DynamicSequentialHook = class extends Subscribable {
      execute(data, entity) {
        let currentValue = data;
        for (const callback of this.listeners) {
          currentValue = callback(currentValue, entity);
        }
        return currentValue;
      }
    };
    SequentialHook = class extends DynamicSequentialHook {
      constructor(entity) {
        super();
        this.entity = entity;
      }
      execute(data) {
        return super.execute(data, this.entity);
      }
    };
    ParallelHook = class extends Subscribable {
      constructor(entity) {
        super();
        this.entity = entity;
      }
      execute(data) {
        const results = [];
        for (const callback of this.listeners) {
          results.push(callback(data, this.entity));
        }
        return results;
      }
    };
  }
});

// node_modules/@baklavajs/events/dist/esm/proxy.js
function createProxy() {
  const token = Symbol();
  const listeners = /* @__PURE__ */ new Map();
  const targets = /* @__PURE__ */ new Set();
  const register = (key, subscribable) => {
    if (subscribable instanceof Subscribable) {
      subscribable.registerProxy(token, () => {
        var _a, _b;
        return (_b = (_a = listeners.get(key)) === null || _a === void 0 ? void 0 : _a.listeners) !== null && _b !== void 0 ? _b : [];
      });
    }
  };
  const addSubscribable = (key) => {
    const subscribable = new Subscribable();
    listeners.set(key, subscribable);
    targets.forEach((t) => register(key, t[key]));
  };
  const addTarget = (target) => {
    targets.add(target);
    for (const key of listeners.keys()) {
      register(key, target[key]);
    }
  };
  const removeTarget = (target) => {
    for (const key of listeners.keys()) {
      if (target[key] instanceof Subscribable) {
        target[key].unregisterProxy(token);
      }
    }
    targets.delete(target);
  };
  const destroy = () => {
    targets.forEach((t) => removeTarget(t));
    listeners.clear();
  };
  return new Proxy({}, {
    get(target, key) {
      if (key === "addTarget") {
        return addTarget;
      } else if (key === "removeTarget") {
        return removeTarget;
      } else if (key === "destroy") {
        return destroy;
      }
      if (typeof key !== "string" || key.startsWith("_")) {
        return target[key];
      }
      if (!listeners.has(key)) {
        addSubscribable(key);
      }
      return listeners.get(key);
    }
  });
}
var init_proxy = __esm({
  "node_modules/@baklavajs/events/dist/esm/proxy.js"() {
    init_subscribable();
  }
});

// node_modules/@baklavajs/events/dist/esm/types.js
var init_types = __esm({
  "node_modules/@baklavajs/events/dist/esm/types.js"() {
  }
});

// node_modules/@baklavajs/events/dist/esm/index.js
var init_esm = __esm({
  "node_modules/@baklavajs/events/dist/esm/index.js"() {
    init_event();
    init_hook();
    init_proxy();
    init_subscribable();
    init_types();
  }
});

// node_modules/@baklavajs/core/dist/esm/connection.js
var Connection, DummyConnection;
var init_connection = __esm({
  "node_modules/@baklavajs/core/dist/esm/connection.js"() {
    init_dist();
    init_esm();
    Connection = class {
      constructor(from, to) {
        this.destructed = false;
        this.events = {
          destruct: new BaklavaEvent(this)
        };
        if (!from || !to) {
          throw new Error("Cannot initialize connection with null/undefined for 'from' or 'to' values");
        }
        this.id = v4_default();
        this.from = from;
        this.to = to;
        this.from.connectionCount++;
        this.to.connectionCount++;
      }
      destruct() {
        this.events.destruct.emit();
        this.from.connectionCount--;
        this.to.connectionCount--;
        this.destructed = true;
      }
    };
    DummyConnection = class {
      constructor(from, to) {
        if (!from || !to) {
          throw new Error("Cannot initialize connection with null/undefined for 'from' or 'to' values");
        }
        this.id = v4_default();
        this.from = from;
        this.to = to;
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/utils.js
function mapValues(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}
var init_utils = __esm({
  "node_modules/@baklavajs/core/dist/esm/utils.js"() {
  }
});

// node_modules/@baklavajs/core/dist/esm/node.js
var AbstractNode, Node;
var init_node = __esm({
  "node_modules/@baklavajs/core/dist/esm/node.js"() {
    init_dist();
    init_esm();
    init_utils();
    AbstractNode = class {
      constructor() {
        this._title = "";
        this.id = v4_default();
        this.events = {
          loaded: new BaklavaEvent(this),
          beforeAddInput: new PreventableBaklavaEvent(this),
          addInput: new BaklavaEvent(this),
          beforeRemoveInput: new PreventableBaklavaEvent(this),
          removeInput: new BaklavaEvent(this),
          beforeAddOutput: new PreventableBaklavaEvent(this),
          addOutput: new BaklavaEvent(this),
          beforeRemoveOutput: new PreventableBaklavaEvent(this),
          removeOutput: new BaklavaEvent(this),
          beforeTitleChanged: new PreventableBaklavaEvent(this),
          titleChanged: new BaklavaEvent(this),
          update: new BaklavaEvent(this)
        };
        this.hooks = {
          beforeLoad: new SequentialHook(this),
          afterSave: new SequentialHook(this)
        };
      }
      /**
       * The graph instance the node is placed in.
       * `undefined` if the node hasn't been placed in a graph yet.
       */
      get graph() {
        return this.graphInstance;
      }
      /** Customizable display name of the node. */
      get title() {
        return this._title;
      }
      set title(v) {
        if (!this.events.beforeTitleChanged.emit(v).prevented) {
          this._title = v;
          this.events.titleChanged.emit(v);
        }
      }
      /**
       * Add an input interface to the node
       * @param key Key of the input
       * @param input The input instance
       * @returns True when the input was added, otherwise false (prevented by an event handler)
       */
      addInput(key, input) {
        return this.addInterface("input", key, input);
      }
      /**
       * Add an output interface to the node
       * @param key Key of the output
       * @param output The output instance
       * @returns True when the output was added, otherwise false (prevented by an event handler)
       */
      addOutput(key, output) {
        return this.addInterface("output", key, output);
      }
      /**
       * Remove an existing input
       * @param key Key of the input.
       */
      removeInput(key) {
        return this.removeInterface("input", key);
      }
      /**
       * Remove an existing output
       * @param key Key of the output.
       */
      removeOutput(key) {
        return this.removeInterface("output", key);
      }
      /**
       * This function will automatically be called as soon as the node is added to a graph.
       * @param editor Graph instance
       */
      registerGraph(graph) {
        this.graphInstance = graph;
      }
      load(state2) {
        this.hooks.beforeLoad.execute(state2);
        this.id = state2.id;
        this._title = state2.title;
        Object.entries(state2.inputs).forEach(([k, v]) => {
          if (this.inputs[k]) {
            this.inputs[k].load(v);
            this.inputs[k].nodeId = this.id;
          }
        });
        Object.entries(state2.outputs).forEach(([k, v]) => {
          if (this.outputs[k]) {
            this.outputs[k].load(v);
            this.outputs[k].nodeId = this.id;
          }
        });
        this.events.loaded.emit(this);
      }
      save() {
        const inputStates = mapValues(this.inputs, (intf) => intf.save());
        const outputStates = mapValues(this.outputs, (intf) => intf.save());
        const state2 = {
          type: this.type,
          id: this.id,
          title: this.title,
          inputs: inputStates,
          outputs: outputStates
        };
        return this.hooks.afterSave.execute(state2);
      }
      /**
       * @virtual
       * Override this method to execute logic when the node is placed inside a graph
       */
      onPlaced() {
      }
      /**
       * @virtual
       * Override this method to perform cleanup when the node is deleted
       */
      onDestroy() {
      }
      initializeIo() {
        Object.entries(this.inputs).forEach(([key, intf]) => this.initializeIntf("input", key, intf));
        Object.entries(this.outputs).forEach(([key, intf]) => this.initializeIntf("output", key, intf));
      }
      initializeIntf(type, key, intf) {
        intf.isInput = type === "input";
        intf.nodeId = this.id;
        intf.events.setValue.subscribe(this, () => this.events.update.emit({ type, name: key, intf }));
      }
      addInterface(type, key, intf) {
        const beforeEvent = type === "input" ? this.events.beforeAddInput : this.events.beforeAddOutput;
        const afterEvent = type === "input" ? this.events.addInput : this.events.addOutput;
        const ioObject = type === "input" ? this.inputs : this.outputs;
        if (beforeEvent.emit(intf).prevented) {
          return false;
        }
        ioObject[key] = intf;
        this.initializeIntf(type, key, intf);
        afterEvent.emit(intf);
        return true;
      }
      removeInterface(type, key) {
        const beforeEvent = type === "input" ? this.events.beforeRemoveInput : this.events.beforeRemoveOutput;
        const afterEvent = type === "input" ? this.events.removeInput : this.events.removeOutput;
        const io = type === "input" ? this.inputs[key] : this.outputs[key];
        if (!io || beforeEvent.emit(io).prevented) {
          return false;
        }
        if (io.connectionCount > 0) {
          if (this.graphInstance) {
            const connections = this.graphInstance.connections.filter((c) => c.from === io || c.to === io);
            connections.forEach((c) => {
              this.graphInstance.removeConnection(c);
            });
          } else {
            throw new Error("Interface is connected, but no graph instance is specified. Unable to delete interface");
          }
        }
        io.events.setValue.unsubscribe(this);
        if (type === "input") {
          delete this.inputs[key];
        } else {
          delete this.outputs[key];
        }
        afterEvent.emit(io);
        return true;
      }
    };
    Node = class extends AbstractNode {
      load(state2) {
        super.load(state2);
      }
      save() {
        return super.save();
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/defineNode.js
function defineNode(definition) {
  return class extends Node {
    constructor() {
      var _a, _b;
      super();
      this.type = definition.type;
      this.inputs = {};
      this.outputs = {};
      this.calculate = definition.calculate ? (inputs, globalValues) => {
        return definition.calculate.call(this, inputs, globalValues);
      } : void 0;
      this._title = (_a = definition.title) !== null && _a !== void 0 ? _a : definition.type;
      this.executeFactory("input", definition.inputs);
      this.executeFactory("output", definition.outputs);
      (_b = definition.onCreate) === null || _b === void 0 ? void 0 : _b.call(this);
    }
    onPlaced() {
      var _a;
      (_a = definition.onPlaced) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    onDestroy() {
      var _a;
      (_a = definition.onDestroy) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    executeFactory(type, factory) {
      Object.keys(factory || {}).forEach((k) => {
        const intf = factory[k]();
        if (type === "input") {
          this.addInput(k, intf);
        } else {
          this.addOutput(k, intf);
        }
      });
    }
  };
}
var init_defineNode = __esm({
  "node_modules/@baklavajs/core/dist/esm/defineNode.js"() {
    init_node();
  }
});

// node_modules/@baklavajs/core/dist/esm/dynamicNode.js
var init_dynamicNode = __esm({
  "node_modules/@baklavajs/core/dist/esm/dynamicNode.js"() {
    init_node();
  }
});

// node_modules/@baklavajs/core/dist/esm/nodeInterface.js
var NodeInterface;
var init_nodeInterface = __esm({
  "node_modules/@baklavajs/core/dist/esm/nodeInterface.js"() {
    init_dist();
    init_esm();
    NodeInterface = class {
      set connectionCount(v) {
        this._connectionCount = v;
        this.events.setConnectionCount.emit(v);
      }
      get connectionCount() {
        return this._connectionCount;
      }
      set value(v) {
        if (this.events.beforeSetValue.emit(v).prevented) {
          return;
        }
        this._value = v;
        this.events.setValue.emit(v);
      }
      get value() {
        return this._value;
      }
      constructor(name, value) {
        this.id = v4_default();
        this.nodeId = "";
        this.port = true;
        this.hidden = false;
        this.events = {
          setConnectionCount: new BaklavaEvent(this),
          beforeSetValue: new PreventableBaklavaEvent(this),
          setValue: new BaklavaEvent(this),
          updated: new BaklavaEvent(this)
        };
        this.hooks = {
          load: new SequentialHook(this),
          save: new SequentialHook(this)
        };
        this._connectionCount = 0;
        this.name = name;
        this._value = value;
      }
      load(state2) {
        this.id = state2.id;
        this.templateId = state2.templateId;
        this.value = state2.value;
        this.hooks.load.execute(state2);
      }
      save() {
        const state2 = {
          id: this.id,
          templateId: this.templateId,
          value: this.value
        };
        return this.hooks.save.execute(state2);
      }
      setComponent(value) {
        this.component = value;
        return this;
      }
      setPort(value) {
        this.port = value;
        return this;
      }
      setHidden(value) {
        this.hidden = value;
        return this;
      }
      use(middleware, ...args) {
        middleware(this, ...args);
        return this;
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/graphInterface.js
var GRAPH_INPUT_NODE_TYPE, GRAPH_OUTPUT_NODE_TYPE, GraphInterfaceNode, GraphInputNode, GraphOutputNode;
var init_graphInterface = __esm({
  "node_modules/@baklavajs/core/dist/esm/graphInterface.js"() {
    init_dist();
    init_node();
    init_nodeInterface();
    GRAPH_INPUT_NODE_TYPE = "__baklava_SubgraphInputNode";
    GRAPH_OUTPUT_NODE_TYPE = "__baklava_SubgraphOutputNode";
    GraphInterfaceNode = class extends Node {
      constructor() {
        super();
        this.graphInterfaceId = v4_default();
      }
      onPlaced() {
        super.onPlaced();
        this.initializeIo();
      }
      save() {
        return {
          ...super.save(),
          graphInterfaceId: this.graphInterfaceId
        };
      }
      load(state2) {
        super.load(state2);
        this.graphInterfaceId = state2.graphInterfaceId;
      }
    };
    GraphInputNode = class extends GraphInterfaceNode {
      constructor() {
        super(...arguments);
        this.type = GRAPH_INPUT_NODE_TYPE;
        this.inputs = {
          name: new NodeInterface("Name", "Input")
        };
        this.outputs = {
          placeholder: new NodeInterface("Value", void 0)
        };
      }
      static isGraphInputNode(v) {
        return v.type === GRAPH_INPUT_NODE_TYPE;
      }
    };
    GraphOutputNode = class extends GraphInterfaceNode {
      constructor() {
        super(...arguments);
        this.type = GRAPH_OUTPUT_NODE_TYPE;
        this.inputs = {
          name: new NodeInterface("Name", "Output"),
          placeholder: new NodeInterface("Value", void 0)
        };
        this.outputs = {
          output: new NodeInterface("Output", void 0).setHidden(true)
        };
        this.calculate = ({ placeholder }) => ({
          output: placeholder
        });
      }
      static isGraphOutputNode(v) {
        return v.type === GRAPH_OUTPUT_NODE_TYPE;
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/graph.js
var Graph;
var init_graph = __esm({
  "node_modules/@baklavajs/core/dist/esm/graph.js"() {
    init_dist();
    init_esm();
    init_connection();
    init_graphInterface();
    Graph = class {
      /** List of all nodes in this graph */
      get nodes() {
        return this._nodes;
      }
      /** List of all connections in this graph */
      get connections() {
        return this._connections;
      }
      /** Whether the graph is currently in the process of loading a saved graph */
      get loading() {
        return this._loading;
      }
      /** Whether the graph is currently in the process of destroying itself */
      get destroying() {
        return this._destroying;
      }
      get inputs() {
        const inputNodes = this.nodes.filter((n) => n.type === GRAPH_INPUT_NODE_TYPE);
        return inputNodes.map((n) => ({
          id: n.graphInterfaceId,
          name: n.inputs.name.value,
          nodeId: n.id,
          nodeInterfaceId: n.outputs.placeholder.id
        }));
      }
      get outputs() {
        const outputNodes = this.nodes.filter((n) => n.type === GRAPH_OUTPUT_NODE_TYPE);
        return outputNodes.map((n) => ({
          id: n.graphInterfaceId,
          name: n.inputs.name.value,
          nodeId: n.id,
          nodeInterfaceId: n.outputs.output.id
        }));
      }
      constructor(editor, template) {
        this.id = v4_default();
        this.activeTransactions = 0;
        this._nodes = [];
        this._connections = [];
        this._loading = false;
        this._destroying = false;
        this.events = {
          beforeAddNode: new PreventableBaklavaEvent(this),
          addNode: new BaklavaEvent(this),
          beforeRemoveNode: new PreventableBaklavaEvent(this),
          removeNode: new BaklavaEvent(this),
          beforeAddConnection: new PreventableBaklavaEvent(this),
          addConnection: new BaklavaEvent(this),
          checkConnection: new PreventableBaklavaEvent(this),
          beforeRemoveConnection: new PreventableBaklavaEvent(this),
          removeConnection: new BaklavaEvent(this)
        };
        this.hooks = {
          save: new SequentialHook(this),
          load: new SequentialHook(this),
          checkConnection: new ParallelHook(this)
        };
        this.nodeEvents = createProxy();
        this.nodeHooks = createProxy();
        this.connectionEvents = createProxy();
        this.editor = editor;
        this.template = template;
        editor.registerGraph(this);
      }
      /**
       * Add a node to the list of nodes.
       * @param node Instance of a node
       * @returns Instance of the node or undefined if the node was not added
       */
      addNode(node) {
        if (this.events.beforeAddNode.emit(node).prevented) {
          return;
        }
        this.nodeEvents.addTarget(node.events);
        this.nodeHooks.addTarget(node.hooks);
        node.registerGraph(this);
        this._nodes.push(node);
        node = this.nodes.find((n) => n.id === node.id);
        node.onPlaced();
        this.events.addNode.emit(node);
        return node;
      }
      /**
       * Removes a node from the list.
       * Will also remove all connections from and to the node.
       * @param node Reference to a node in the list.
       */
      removeNode(node) {
        if (this.nodes.includes(node)) {
          if (this.events.beforeRemoveNode.emit(node).prevented) {
            return;
          }
          const interfaces = [...Object.values(node.inputs), ...Object.values(node.outputs)];
          this.connections.filter((c) => interfaces.includes(c.from) || interfaces.includes(c.to)).forEach((c) => this.removeConnection(c));
          this._nodes.splice(this.nodes.indexOf(node), 1);
          this.events.removeNode.emit(node);
          node.onDestroy();
          this.nodeEvents.removeTarget(node.events);
          this.nodeHooks.removeTarget(node.hooks);
        }
      }
      /**
       * Add a connection to the list of connections.
       * @param from Start interface for the connection
       * @param to Target interface for the connection
       * @returns The created connection. If no connection could be created, returns `undefined`.
       */
      addConnection(from, to) {
        const checkConnectionResult = this.checkConnection(from, to);
        if (!checkConnectionResult.connectionAllowed) {
          return void 0;
        }
        if (this.events.beforeAddConnection.emit({ from, to }).prevented) {
          return;
        }
        for (const connectionToRemove of checkConnectionResult.connectionsInDanger) {
          const instance = this.connections.find((c2) => c2.id === connectionToRemove.id);
          if (instance) {
            this.removeConnection(instance);
          }
        }
        const c = new Connection(checkConnectionResult.dummyConnection.from, checkConnectionResult.dummyConnection.to);
        this.internalAddConnection(c);
        return c;
      }
      /**
       * Remove a connection from the list of connections.
       * @param connection Connection instance that should be removed.
       */
      removeConnection(connection) {
        if (this.connections.includes(connection)) {
          if (this.events.beforeRemoveConnection.emit(connection).prevented) {
            return;
          }
          connection.destruct();
          this._connections.splice(this.connections.indexOf(connection), 1);
          this.events.removeConnection.emit(connection);
          this.connectionEvents.removeTarget(connection.events);
        }
      }
      /**
       * Checks, whether a connection between two node interfaces would be valid.
       * @param from The starting node interface (must be an output interface)
       * @param to The target node interface (must be an input interface)
       * @returns Whether the connection is allowed or not.
       */
      checkConnection(from, to) {
        if (!from || !to) {
          return { connectionAllowed: false };
        }
        const fromNode = this.findNodeById(from.nodeId);
        const toNode = this.findNodeById(to.nodeId);
        if (fromNode && toNode && fromNode === toNode) {
          return { connectionAllowed: false };
        }
        if (from.isInput && !to.isInput) {
          const tmp = from;
          from = to;
          to = tmp;
        }
        if (from.isInput || !to.isInput) {
          return { connectionAllowed: false };
        }
        if (this.connections.some((c) => c.from === from && c.to === to)) {
          return { connectionAllowed: false };
        }
        if (this.events.checkConnection.emit({ from, to }).prevented) {
          return { connectionAllowed: false };
        }
        const hookResults = this.hooks.checkConnection.execute({ from, to });
        if (hookResults.some((hr) => !hr.connectionAllowed)) {
          return { connectionAllowed: false };
        }
        const connectionsInDanger = Array.from(new Set(hookResults.flatMap((hr) => hr.connectionsInDanger)));
        return {
          connectionAllowed: true,
          dummyConnection: new DummyConnection(from, to),
          connectionsInDanger
        };
      }
      /**
       * Finds the NodeInterface with the provided id, as long as it exists in this graph
       * @param id id of the NodeInterface to find
       * @returns The NodeInterface if found, otherwise undefined
       */
      findNodeInterface(id) {
        for (const node of this.nodes) {
          for (const k in node.inputs) {
            const nodeInput = node.inputs[k];
            if (nodeInput.id === id) {
              return nodeInput;
            }
          }
          for (const k in node.outputs) {
            const nodeOutput = node.outputs[k];
            if (nodeOutput.id === id) {
              return nodeOutput;
            }
          }
        }
      }
      /**
       * Finds the Node with the provided id, as long as it exists in this graph
       * @param id id of the Node to find
       * @returns The Node if found, otherwise undefined
       */
      findNodeById(id) {
        return this.nodes.find((n) => n.id === id);
      }
      /**
       * Load a state
       * @param state State to load
       * @returns An array of warnings that occured during loading. If the array is empty, the state was successfully loaded.
       */
      load(state2) {
        try {
          this._loading = true;
          const warnings = [];
          for (let i = this.connections.length - 1; i >= 0; i--) {
            this.removeConnection(this.connections[i]);
          }
          for (let i = this.nodes.length - 1; i >= 0; i--) {
            this.removeNode(this.nodes[i]);
          }
          this.id = state2.id;
          for (const n of state2.nodes) {
            const nodeInformation = this.editor.nodeTypes.get(n.type);
            if (!nodeInformation) {
              warnings.push(`Node type ${n.type} is not registered`);
              continue;
            }
            const node = new nodeInformation.type();
            this.addNode(node);
            node.load(n);
          }
          for (const c of state2.connections) {
            const fromIf = this.findNodeInterface(c.from);
            const toIf = this.findNodeInterface(c.to);
            if (!fromIf) {
              warnings.push(`Could not find interface with id ${c.from}`);
              continue;
            } else if (!toIf) {
              warnings.push(`Could not find interface with id ${c.to}`);
              continue;
            } else {
              const conn = new Connection(fromIf, toIf);
              conn.id = c.id;
              this.internalAddConnection(conn);
            }
          }
          this.hooks.load.execute(state2);
          return warnings;
        } finally {
          this._loading = false;
        }
      }
      /**
       * Save a state
       * @returns Current state
       */
      save() {
        const state2 = {
          id: this.id,
          nodes: this.nodes.map((n) => n.save()),
          connections: this.connections.map((c) => ({
            id: c.id,
            from: c.from.id,
            to: c.to.id
          })),
          inputs: this.inputs,
          outputs: this.outputs
        };
        return this.hooks.save.execute(state2);
      }
      destroy() {
        this._destroying = true;
        for (const n of this.nodes) {
          this.removeNode(n);
        }
        this.editor.unregisterGraph(this);
      }
      internalAddConnection(c) {
        this.connectionEvents.addTarget(c.events);
        this._connections.push(c);
        this.events.addConnection.emit(c);
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/graphNode.js
function getGraphNodeTypeString(template) {
  return GRAPH_NODE_TYPE_PREFIX + template.id;
}
function createGraphNodeType(template) {
  return class GraphNode extends AbstractNode {
    constructor() {
      super(...arguments);
      this.type = getGraphNodeTypeString(template);
      this.inputs = {};
      this.outputs = {};
      this.template = template;
      this.calculate = async (inputs, context) => {
        var _a;
        if (!this.subgraph) {
          throw new Error(`GraphNode ${this.id}: calculate called without subgraph being initialized`);
        }
        if (!context.engine || typeof context.engine !== "object") {
          throw new Error(`GraphNode ${this.id}: calculate called but no engine provided in context`);
        }
        const graphInputs = context.engine.getInputValues(this.subgraph);
        for (const input of this.subgraph.inputs) {
          graphInputs.set(input.nodeInterfaceId, inputs[input.id]);
        }
        const result = await context.engine.runGraph(this.subgraph, graphInputs, context.globalValues);
        const outputs = {};
        for (const output of this.subgraph.outputs) {
          outputs[output.id] = (_a = result.get(output.nodeId)) === null || _a === void 0 ? void 0 : _a.get("output");
        }
        outputs._calculationResults = result;
        return outputs;
      };
    }
    get title() {
      return this._title;
    }
    set title(v) {
      this.template.name = v;
    }
    load(state2) {
      if (!this.subgraph) {
        throw new Error("Cannot load a graph node without a graph");
      }
      if (!this.template) {
        throw new Error("Unable to load graph node without graph template");
      }
      this.subgraph.load(state2.graphState);
      super.load(state2);
    }
    save() {
      if (!this.subgraph) {
        throw new Error("Cannot save a graph node without a graph");
      }
      const state2 = super.save();
      return {
        ...state2,
        graphState: this.subgraph.save()
      };
    }
    onPlaced() {
      this.template.events.updated.subscribe(this, () => this.initialize());
      this.template.events.nameChanged.subscribe(this, (name) => {
        this._title = name;
      });
      this.initialize();
    }
    onDestroy() {
      var _a;
      this.template.events.updated.unsubscribe(this);
      this.template.events.nameChanged.unsubscribe(this);
      (_a = this.subgraph) === null || _a === void 0 ? void 0 : _a.destroy();
    }
    initialize() {
      if (this.subgraph) {
        this.subgraph.destroy();
      }
      this.subgraph = this.template.createGraph();
      this._title = this.template.name;
      this.updateInterfaces();
      this.events.update.emit(null);
    }
    updateInterfaces() {
      if (!this.subgraph) {
        throw new Error("Trying to update interfaces without graph instance");
      }
      for (const graphInput of this.subgraph.inputs) {
        if (!(graphInput.id in this.inputs)) {
          this.addInput(graphInput.id, this.createProxyInterface(graphInput, true));
        } else {
          this.inputs[graphInput.id].name = graphInput.name;
        }
      }
      for (const k of Object.keys(this.inputs)) {
        if (!this.subgraph.inputs.some((gi) => gi.id === k)) {
          this.removeInput(k);
        }
      }
      for (const graphOutput of this.subgraph.outputs) {
        if (!(graphOutput.id in this.outputs)) {
          this.addOutput(graphOutput.id, this.createProxyInterface(graphOutput, false));
        } else {
          this.outputs[graphOutput.id].name = graphOutput.name;
        }
      }
      for (const k of Object.keys(this.outputs)) {
        if (!this.subgraph.outputs.some((gi) => gi.id === k)) {
          this.removeOutput(k);
        }
      }
      this.addOutput("_calculationResults", new NodeInterface("_calculationResults", void 0).setHidden(true));
    }
    /**
     * When we create a interface in the graph node, we hide certain properties of the interface in the subgraph.
     * For example, the `type` property or the `allowMultipleConnections` property.
     * These properties should be proxied to the subgraph interface, so they behave the same as the original interface.
     */
    createProxyInterface(graphInterface, isInput) {
      const newInterface = new NodeInterface(graphInterface.name, void 0);
      return new Proxy(newInterface, {
        get: (target, prop) => {
          var _a, _b, _c;
          if (PROXY_INTERFACE_SKIP_PROPERTIES.includes(prop) || prop in target || typeof prop === "string" && prop.startsWith("__v_")) {
            return Reflect.get(target, prop);
          }
          let placeholderIntfId;
          if (isInput) {
            const subgraphInterfaceNode = (_a = this.subgraph) === null || _a === void 0 ? void 0 : _a.nodes.find((n) => GraphInputNode.isGraphInputNode(n) && n.graphInterfaceId === graphInterface.id);
            placeholderIntfId = subgraphInterfaceNode === null || subgraphInterfaceNode === void 0 ? void 0 : subgraphInterfaceNode.outputs.placeholder.id;
          } else {
            const subgraphInterfaceNode = (_b = this.subgraph) === null || _b === void 0 ? void 0 : _b.nodes.find((n) => GraphOutputNode.isGraphOutputNode(n) && n.graphInterfaceId === graphInterface.id);
            placeholderIntfId = subgraphInterfaceNode === null || subgraphInterfaceNode === void 0 ? void 0 : subgraphInterfaceNode.inputs.placeholder.id;
          }
          const conn = (_c = this.subgraph) === null || _c === void 0 ? void 0 : _c.connections.find((c) => {
            var _a2;
            return placeholderIntfId === ((_a2 = isInput ? c.from : c.to) === null || _a2 === void 0 ? void 0 : _a2.id);
          });
          const intf = isInput ? conn === null || conn === void 0 ? void 0 : conn.to : conn === null || conn === void 0 ? void 0 : conn.from;
          if (intf) {
            return Reflect.get(intf, prop);
          }
          return void 0;
        }
      });
    }
  };
}
var GRAPH_NODE_TYPE_PREFIX, PROXY_INTERFACE_SKIP_PROPERTIES;
var init_graphNode = __esm({
  "node_modules/@baklavajs/core/dist/esm/graphNode.js"() {
    init_graphInterface();
    init_node();
    init_nodeInterface();
    GRAPH_NODE_TYPE_PREFIX = "__baklava_GraphNode-";
    PROXY_INTERFACE_SKIP_PROPERTIES = [
      "component",
      "connectionCount",
      "events",
      "hidden",
      "hooks",
      "id",
      "isInput",
      "name",
      "nodeId",
      "port",
      "templateId",
      "value"
    ];
  }
});

// node_modules/@baklavajs/core/dist/esm/graphTemplate.js
var GraphTemplate;
var init_graphTemplate = __esm({
  "node_modules/@baklavajs/core/dist/esm/graphTemplate.js"() {
    init_dist();
    init_esm();
    init_graph();
    init_utils();
    init_graphNode();
    init_graphInterface();
    GraphTemplate = class _GraphTemplate {
      /** Create a new GraphTemplate from the nodes and connections inside the graph instance */
      static fromGraph(graph, editor) {
        return new _GraphTemplate(graph.save(), editor);
      }
      /** Get the name of the graph template */
      get name() {
        return this._name;
      }
      /** Set the name of the graph template */
      set name(v) {
        this._name = v;
        this.events.nameChanged.emit(v);
        const nt = this.editor.nodeTypes.get(getGraphNodeTypeString(this));
        if (nt) {
          nt.title = v;
        }
      }
      /** List of all inputs to the graph template */
      get inputs() {
        const inputNodes = this.nodes.filter((n) => n.type === GRAPH_INPUT_NODE_TYPE);
        return inputNodes.map((n) => ({
          id: n.graphInterfaceId,
          name: n.inputs.name.value,
          nodeId: n.id,
          nodeInterfaceId: n.outputs.placeholder.id
        }));
      }
      /** List of all outputs of the graph template */
      get outputs() {
        const outputNodes = this.nodes.filter((n) => n.type === GRAPH_OUTPUT_NODE_TYPE);
        return outputNodes.map((n) => ({
          id: n.graphInterfaceId,
          name: n.inputs.name.value,
          nodeId: n.id,
          nodeInterfaceId: n.outputs.output.id
        }));
      }
      constructor(state2, editor) {
        this.id = v4_default();
        this._name = "Subgraph";
        this.events = {
          nameChanged: new BaklavaEvent(this),
          updated: new BaklavaEvent(this)
        };
        this.hooks = {
          beforeLoad: new SequentialHook(this),
          afterSave: new SequentialHook(this)
        };
        this.editor = editor;
        if (state2.id) {
          this.id = state2.id;
        }
        if (state2.name) {
          this._name = state2.name;
        }
        this.update(state2);
      }
      /** Update the state of the graph template with the provided state */
      update(state2) {
        this.nodes = state2.nodes;
        this.connections = state2.connections;
        this.events.updated.emit();
      }
      save() {
        return {
          id: this.id,
          name: this.name,
          nodes: this.nodes,
          connections: this.connections,
          inputs: this.inputs,
          outputs: this.outputs
        };
      }
      /**
       * Create a new graph instance from this template
       * or load the state into the provided graph instance.
       */
      createGraph(graph) {
        const idMap = /* @__PURE__ */ new Map();
        const createNewId = (oldId) => {
          const newId = v4_default();
          idMap.set(oldId, newId);
          return newId;
        };
        const getNewId = (oldId) => {
          const newId = idMap.get(oldId);
          if (!newId) {
            throw new Error(`Unable to create graph from template: Could not map old id ${oldId} to new id`);
          }
          return newId;
        };
        const mapNodeInterfaceIds = (interfaceStates) => {
          return mapValues(interfaceStates, (intf) => {
            const clonedIntf = {
              id: createNewId(intf.id),
              templateId: intf.id,
              value: intf.value
            };
            return clonedIntf;
          });
        };
        const nodes = this.nodes.map((n) => ({
          ...n,
          id: createNewId(n.id),
          inputs: mapNodeInterfaceIds(n.inputs),
          outputs: mapNodeInterfaceIds(n.outputs)
        }));
        const connections = this.connections.map((c) => ({
          id: createNewId(c.id),
          from: getNewId(c.from),
          to: getNewId(c.to)
        }));
        const inputs = this.inputs.map((i) => ({
          id: i.id,
          name: i.name,
          nodeId: getNewId(i.nodeId),
          nodeInterfaceId: getNewId(i.nodeInterfaceId)
        }));
        const outputs = this.outputs.map((o) => ({
          id: o.id,
          name: o.name,
          nodeId: getNewId(o.nodeId),
          nodeInterfaceId: getNewId(o.nodeInterfaceId)
        }));
        const clonedState = {
          id: v4_default(),
          nodes,
          connections,
          inputs,
          outputs
        };
        if (!graph) {
          graph = new Graph(this.editor);
        }
        const warnings = graph.load(clonedState);
        warnings.forEach((w) => console.warn(w));
        graph.template = this;
        return graph;
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/editor.js
var Editor;
var init_editor = __esm({
  "node_modules/@baklavajs/core/dist/esm/editor.js"() {
    init_esm();
    init_graph();
    init_graphNode();
    init_graphTemplate();
    init_graphInterface();
    Editor = class {
      /** List of all registered node types */
      get nodeTypes() {
        return this._nodeTypes;
      }
      /** The root graph */
      get graph() {
        return this._graph;
      }
      /** List of all registered graph templates (subgraphs) */
      get graphTemplates() {
        return this._graphTemplates;
      }
      /** Set of all graphs in the editor, including subgraphs */
      get graphs() {
        return this._graphs;
      }
      /** Whether the editor is currently in the process of loading a saved graph */
      get loading() {
        return this._loading;
      }
      constructor() {
        this.events = {
          loaded: new BaklavaEvent(this),
          beforeRegisterNodeType: new PreventableBaklavaEvent(this),
          registerNodeType: new BaklavaEvent(this),
          beforeUnregisterNodeType: new PreventableBaklavaEvent(this),
          unregisterNodeType: new BaklavaEvent(this),
          beforeAddGraphTemplate: new PreventableBaklavaEvent(this),
          addGraphTemplate: new BaklavaEvent(this),
          beforeRemoveGraphTemplate: new PreventableBaklavaEvent(this),
          removeGraphTemplate: new BaklavaEvent(this),
          registerGraph: new BaklavaEvent(this),
          unregisterGraph: new BaklavaEvent(this)
        };
        this.hooks = {
          save: new SequentialHook(this),
          load: new SequentialHook(this)
        };
        this.graphTemplateEvents = createProxy();
        this.graphTemplateHooks = createProxy();
        this.graphEvents = createProxy();
        this.graphHooks = createProxy();
        this.nodeEvents = createProxy();
        this.nodeHooks = createProxy();
        this.connectionEvents = createProxy();
        this._graphs = /* @__PURE__ */ new Set();
        this._nodeTypes = /* @__PURE__ */ new Map();
        this._graph = new Graph(this);
        this._graphTemplates = [];
        this._loading = false;
        this.registerNodeType(GraphInputNode);
        this.registerNodeType(GraphOutputNode);
      }
      /**
       * Register a new node type
       * @param type Actual type / constructor of the node
       * @param options Optionally specify a title and/or a category for this node
       */
      registerNodeType(type, options) {
        var _a, _b;
        if (this.events.beforeRegisterNodeType.emit({ type, options }).prevented) {
          return;
        }
        const nodeInstance = new type();
        this._nodeTypes.set(nodeInstance.type, {
          type,
          category: (_a = options === null || options === void 0 ? void 0 : options.category) !== null && _a !== void 0 ? _a : "default",
          title: (_b = options === null || options === void 0 ? void 0 : options.title) !== null && _b !== void 0 ? _b : nodeInstance.title
        });
        this.events.registerNodeType.emit({ type, options });
      }
      /**
       * Unregister an existing node type. Will also remove all the nodes of this type in all graphs.
       * @param type String type or node constructor, from which the type will be detected
       */
      unregisterNodeType(type) {
        const stringType = typeof type === "string" ? type : new type().type;
        if (this.nodeTypes.has(stringType)) {
          if (this.events.beforeUnregisterNodeType.emit(stringType).prevented) {
            return;
          }
          this._nodeTypes.delete(stringType);
          this.events.unregisterNodeType.emit(stringType);
        }
      }
      addGraphTemplate(template) {
        if (this.events.beforeAddGraphTemplate.emit(template).prevented) {
          return;
        }
        this._graphTemplates.push(template);
        this.graphTemplateEvents.addTarget(template.events);
        this.graphTemplateHooks.addTarget(template.hooks);
        const nt = createGraphNodeType(template);
        this.registerNodeType(nt, { category: "Subgraphs", title: template.name });
        this.events.addGraphTemplate.emit(template);
      }
      removeGraphTemplate(template) {
        if (this.graphTemplates.includes(template)) {
          if (this.events.beforeRemoveGraphTemplate.emit(template).prevented) {
            return;
          }
          const graphNodeType = getGraphNodeTypeString(template);
          for (const g of [this.graph, ...this.graphs.values()]) {
            const nodesToRemove = g.nodes.filter((n) => n.type === graphNodeType);
            for (const n of nodesToRemove) {
              g.removeNode(n);
            }
          }
          this.unregisterNodeType(graphNodeType);
          this._graphTemplates.splice(this._graphTemplates.indexOf(template), 1);
          this.graphTemplateEvents.removeTarget(template.events);
          this.graphTemplateHooks.removeTarget(template.hooks);
          this.events.removeGraphTemplate.emit(template);
        }
      }
      registerGraph(graph) {
        this.graphEvents.addTarget(graph.events);
        this.graphHooks.addTarget(graph.hooks);
        this.nodeEvents.addTarget(graph.nodeEvents);
        this.nodeHooks.addTarget(graph.nodeHooks);
        this.connectionEvents.addTarget(graph.connectionEvents);
        this.events.registerGraph.emit(graph);
        this._graphs.add(graph);
      }
      unregisterGraph(graph) {
        this.graphEvents.removeTarget(graph.events);
        this.graphHooks.removeTarget(graph.hooks);
        this.nodeEvents.removeTarget(graph.nodeEvents);
        this.nodeHooks.removeTarget(graph.nodeHooks);
        this.connectionEvents.removeTarget(graph.connectionEvents);
        this.events.unregisterGraph.emit(graph);
        this._graphs.delete(graph);
      }
      /**
       * Load a state
       * @param state State to load
       * @returns An array of warnings that occured during loading. If the array is empty, the state was successfully loaded.
       */
      load(state2) {
        try {
          this._loading = true;
          state2 = this.hooks.load.execute(state2);
          while (this.graphTemplates.length > 0) {
            this.removeGraphTemplate(this.graphTemplates[0]);
          }
          state2.graphTemplates.forEach((tState) => {
            const template = new GraphTemplate(tState, this);
            this.addGraphTemplate(template);
          });
          const warnings = this._graph.load(state2.graph);
          this.events.loaded.emit();
          warnings.forEach((w) => console.warn(w));
          return warnings;
        } finally {
          this._loading = false;
        }
      }
      /**
       * Save a state
       * @returns Current state
       */
      save() {
        const state2 = {
          graph: this.graph.save(),
          graphTemplates: this.graphTemplates.map((t) => t.save())
        };
        return this.hooks.save.execute(state2);
      }
    };
  }
});

// node_modules/@baklavajs/core/dist/esm/engine.js
var init_engine = __esm({
  "node_modules/@baklavajs/core/dist/esm/engine.js"() {
  }
});

// node_modules/@baklavajs/core/dist/esm/eventDataTypes.js
var init_eventDataTypes = __esm({
  "node_modules/@baklavajs/core/dist/esm/eventDataTypes.js"() {
  }
});

// node_modules/@baklavajs/core/dist/esm/index.js
var init_esm2 = __esm({
  "node_modules/@baklavajs/core/dist/esm/index.js"() {
    init_connection();
    init_defineNode();
    init_dynamicNode();
    init_editor();
    init_engine();
    init_eventDataTypes();
    init_graph();
    init_graphInterface();
    init_graphNode();
    init_graphTemplate();
    init_node();
    init_nodeInterface();
  }
});

// node_modules/@vue/shared/dist/shared.esm-bundler.js
// @__NO_SIDE_EFFECTS__
function makeMap(str) {
  const map2 = /* @__PURE__ */ Object.create(null);
  for (const key of str.split(",")) map2[key] = 1;
  return (val) => val in map2;
}
function normalizeStyle(value) {
  if (isArray(value)) {
    const res = {};
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const normalized = isString(item) ? parseStringStyle(item) : normalizeStyle(item);
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key];
        }
      }
    }
    return res;
  } else if (isString(value) || isObject(value)) {
    return value;
  }
}
function parseStringStyle(cssText) {
  const ret = {};
  cssText.replace(styleCommentRE, "").split(listDelimiterRE).forEach((item) => {
    if (item) {
      const tmp = item.split(propertyDelimiterRE);
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
    }
  });
  return ret;
}
function normalizeClass(value) {
  let res = "";
  if (isString(value)) {
    res = value;
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i]);
      if (normalized) {
        res += normalized + " ";
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + " ";
      }
    }
  }
  return res.trim();
}
function includeBooleanAttr(value) {
  return !!value || value === "";
}
function looseCompareArrays(a, b) {
  if (a.length !== b.length) return false;
  let equal = true;
  for (let i = 0; equal && i < a.length; i++) {
    equal = looseEqual(a[i], b[i]);
  }
  return equal;
}
function looseEqual(a, b) {
  if (a === b) return true;
  let aValidType = isDate(a);
  let bValidType = isDate(b);
  if (aValidType || bValidType) {
    return aValidType && bValidType ? a.getTime() === b.getTime() : false;
  }
  aValidType = isSymbol(a);
  bValidType = isSymbol(b);
  if (aValidType || bValidType) {
    return a === b;
  }
  aValidType = isArray(a);
  bValidType = isArray(b);
  if (aValidType || bValidType) {
    return aValidType && bValidType ? looseCompareArrays(a, b) : false;
  }
  aValidType = isObject(a);
  bValidType = isObject(b);
  if (aValidType || bValidType) {
    if (!aValidType || !bValidType) {
      return false;
    }
    const aKeysCount = Object.keys(a).length;
    const bKeysCount = Object.keys(b).length;
    if (aKeysCount !== bKeysCount) {
      return false;
    }
    for (const key in a) {
      const aHasKey = a.hasOwnProperty(key);
      const bHasKey = b.hasOwnProperty(key);
      if (aHasKey && !bHasKey || !aHasKey && bHasKey || !looseEqual(a[key], b[key])) {
        return false;
      }
    }
  }
  return String(a) === String(b);
}
var EMPTY_OBJ, EMPTY_ARR, NOOP, NO, isOn, isModelListener, extend, remove, hasOwnProperty, hasOwn, isArray, isMap, isSet, isDate, isFunction, isString, isSymbol, isObject, isPromise, objectToString, toTypeString, toRawType, isPlainObject, isIntegerKey, isReservedProp, isBuiltInDirective, cacheStringFunction, camelizeRE, camelize, hyphenateRE, hyphenate, capitalize, toHandlerKey, hasChanged, invokeArrayFns, def, looseToNumber, toNumber, _globalThis, getGlobalThis, listDelimiterRE, propertyDelimiterRE, styleCommentRE, HTML_TAGS, SVG_TAGS, MATH_TAGS, isHTMLTag, isSVGTag, isMathMLTag, specialBooleanAttrs, isSpecialBooleanAttr, isBooleanAttr, isRef, toDisplayString, replacer, stringifySymbol;
var init_shared_esm_bundler = __esm({
  "node_modules/@vue/shared/dist/shared.esm-bundler.js"() {
    EMPTY_OBJ = true ? Object.freeze({}) : {};
    EMPTY_ARR = true ? Object.freeze([]) : [];
    NOOP = () => {
    };
    NO = () => false;
    isOn = (key) => key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && // uppercase letter
    (key.charCodeAt(2) > 122 || key.charCodeAt(2) < 97);
    isModelListener = (key) => key.startsWith("onUpdate:");
    extend = Object.assign;
    remove = (arr, el) => {
      const i = arr.indexOf(el);
      if (i > -1) {
        arr.splice(i, 1);
      }
    };
    hasOwnProperty = Object.prototype.hasOwnProperty;
    hasOwn = (val, key) => hasOwnProperty.call(val, key);
    isArray = Array.isArray;
    isMap = (val) => toTypeString(val) === "[object Map]";
    isSet = (val) => toTypeString(val) === "[object Set]";
    isDate = (val) => toTypeString(val) === "[object Date]";
    isFunction = (val) => typeof val === "function";
    isString = (val) => typeof val === "string";
    isSymbol = (val) => typeof val === "symbol";
    isObject = (val) => val !== null && typeof val === "object";
    isPromise = (val) => {
      return (isObject(val) || isFunction(val)) && isFunction(val.then) && isFunction(val.catch);
    };
    objectToString = Object.prototype.toString;
    toTypeString = (value) => objectToString.call(value);
    toRawType = (value) => {
      return toTypeString(value).slice(8, -1);
    };
    isPlainObject = (val) => toTypeString(val) === "[object Object]";
    isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
    isReservedProp = /* @__PURE__ */ makeMap(
      // the leading comma is intentional so empty string "" is also included
      ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
    );
    isBuiltInDirective = /* @__PURE__ */ makeMap(
      "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
    );
    cacheStringFunction = (fn) => {
      const cache = /* @__PURE__ */ Object.create(null);
      return ((str) => {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
      });
    };
    camelizeRE = /-\w/g;
    camelize = cacheStringFunction(
      (str) => {
        return str.replace(camelizeRE, (c) => c.slice(1).toUpperCase());
      }
    );
    hyphenateRE = /\B([A-Z])/g;
    hyphenate = cacheStringFunction(
      (str) => str.replace(hyphenateRE, "-$1").toLowerCase()
    );
    capitalize = cacheStringFunction((str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });
    toHandlerKey = cacheStringFunction(
      (str) => {
        const s = str ? `on${capitalize(str)}` : ``;
        return s;
      }
    );
    hasChanged = (value, oldValue) => !Object.is(value, oldValue);
    invokeArrayFns = (fns, ...arg) => {
      for (let i = 0; i < fns.length; i++) {
        fns[i](...arg);
      }
    };
    def = (obj, key, value, writable = false) => {
      Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: false,
        writable,
        value
      });
    };
    looseToNumber = (val) => {
      const n = parseFloat(val);
      return isNaN(n) ? val : n;
    };
    toNumber = (val) => {
      const n = isString(val) ? Number(val) : NaN;
      return isNaN(n) ? val : n;
    };
    getGlobalThis = () => {
      return _globalThis || (_globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    };
    listDelimiterRE = /;(?![^(]*\))/g;
    propertyDelimiterRE = /:([^]+)/;
    styleCommentRE = /\/\*[^]*?\*\//g;
    HTML_TAGS = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot";
    SVG_TAGS = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view";
    MATH_TAGS = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics";
    isHTMLTag = /* @__PURE__ */ makeMap(HTML_TAGS);
    isSVGTag = /* @__PURE__ */ makeMap(SVG_TAGS);
    isMathMLTag = /* @__PURE__ */ makeMap(MATH_TAGS);
    specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
    isSpecialBooleanAttr = /* @__PURE__ */ makeMap(specialBooleanAttrs);
    isBooleanAttr = /* @__PURE__ */ makeMap(
      specialBooleanAttrs + `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,inert,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`
    );
    isRef = (val) => {
      return !!(val && val["__v_isRef"] === true);
    };
    toDisplayString = (val) => {
      return isString(val) ? val : val == null ? "" : isArray(val) || isObject(val) && (val.toString === objectToString || !isFunction(val.toString)) ? isRef(val) ? toDisplayString(val.value) : JSON.stringify(val, replacer, 2) : String(val);
    };
    replacer = (_key, val) => {
      if (isRef(val)) {
        return replacer(_key, val.value);
      } else if (isMap(val)) {
        return {
          [`Map(${val.size})`]: [...val.entries()].reduce(
            (entries, [key, val2], i) => {
              entries[stringifySymbol(key, i) + " =>"] = val2;
              return entries;
            },
            {}
          )
        };
      } else if (isSet(val)) {
        return {
          [`Set(${val.size})`]: [...val.values()].map((v) => stringifySymbol(v))
        };
      } else if (isSymbol(val)) {
        return stringifySymbol(val);
      } else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
        return String(val);
      }
      return val;
    };
    stringifySymbol = (v, i = "") => {
      var _a;
      return (
        // Symbol.description in es2019+ so we need to cast here to pass
        // the lib: es2016 check
        isSymbol(v) ? `Symbol(${(_a = v.description) != null ? _a : i})` : v
      );
    };
  }
});

// node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
function warn(msg, ...args) {
  console.warn(`[Vue warn] ${msg}`, ...args);
}
function getCurrentScope() {
  return activeEffectScope;
}
function onScopeDispose(fn, failSilently = false) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn);
  } else if (!failSilently) {
    warn(
      `onScopeDispose() is called when there is no active effect scope to be associated with.`
    );
  }
}
function batch(sub, isComputed = false) {
  sub.flags |= 8;
  if (isComputed) {
    sub.next = batchedComputed;
    batchedComputed = sub;
    return;
  }
  sub.next = batchedSub;
  batchedSub = sub;
}
function startBatch() {
  batchDepth++;
}
function endBatch() {
  if (--batchDepth > 0) {
    return;
  }
  if (batchedComputed) {
    let e = batchedComputed;
    batchedComputed = void 0;
    while (e) {
      const next = e.next;
      e.next = void 0;
      e.flags &= -9;
      e = next;
    }
  }
  let error;
  while (batchedSub) {
    let e = batchedSub;
    batchedSub = void 0;
    while (e) {
      const next = e.next;
      e.next = void 0;
      e.flags &= -9;
      if (e.flags & 1) {
        try {
          ;
          e.trigger();
        } catch (err) {
          if (!error) error = err;
        }
      }
      e = next;
    }
  }
  if (error) throw error;
}
function prepareDeps(sub) {
  for (let link = sub.deps; link; link = link.nextDep) {
    link.version = -1;
    link.prevActiveLink = link.dep.activeLink;
    link.dep.activeLink = link;
  }
}
function cleanupDeps(sub) {
  let head;
  let tail = sub.depsTail;
  let link = tail;
  while (link) {
    const prev = link.prevDep;
    if (link.version === -1) {
      if (link === tail) tail = prev;
      removeSub(link);
      removeDep(link);
    } else {
      head = link;
    }
    link.dep.activeLink = link.prevActiveLink;
    link.prevActiveLink = void 0;
    link = prev;
  }
  sub.deps = head;
  sub.depsTail = tail;
}
function isDirty(sub) {
  for (let link = sub.deps; link; link = link.nextDep) {
    if (link.dep.version !== link.version || link.dep.computed && (refreshComputed(link.dep.computed) || link.dep.version !== link.version)) {
      return true;
    }
  }
  if (sub._dirty) {
    return true;
  }
  return false;
}
function refreshComputed(computed3) {
  if (computed3.flags & 4 && !(computed3.flags & 16)) {
    return;
  }
  computed3.flags &= -17;
  if (computed3.globalVersion === globalVersion) {
    return;
  }
  computed3.globalVersion = globalVersion;
  if (!computed3.isSSR && computed3.flags & 128 && (!computed3.deps && !computed3._dirty || !isDirty(computed3))) {
    return;
  }
  computed3.flags |= 2;
  const dep = computed3.dep;
  const prevSub = activeSub;
  const prevShouldTrack = shouldTrack;
  activeSub = computed3;
  shouldTrack = true;
  try {
    prepareDeps(computed3);
    const value = computed3.fn(computed3._value);
    if (dep.version === 0 || hasChanged(value, computed3._value)) {
      computed3.flags |= 128;
      computed3._value = value;
      dep.version++;
    }
  } catch (err) {
    dep.version++;
    throw err;
  } finally {
    activeSub = prevSub;
    shouldTrack = prevShouldTrack;
    cleanupDeps(computed3);
    computed3.flags &= -3;
  }
}
function removeSub(link, soft = false) {
  const { dep, prevSub, nextSub } = link;
  if (prevSub) {
    prevSub.nextSub = nextSub;
    link.prevSub = void 0;
  }
  if (nextSub) {
    nextSub.prevSub = prevSub;
    link.nextSub = void 0;
  }
  if (dep.subsHead === link) {
    dep.subsHead = nextSub;
  }
  if (dep.subs === link) {
    dep.subs = prevSub;
    if (!prevSub && dep.computed) {
      dep.computed.flags &= -5;
      for (let l = dep.computed.deps; l; l = l.nextDep) {
        removeSub(l, true);
      }
    }
  }
  if (!soft && !--dep.sc && dep.map) {
    dep.map.delete(dep.key);
  }
}
function removeDep(link) {
  const { prevDep, nextDep } = link;
  if (prevDep) {
    prevDep.nextDep = nextDep;
    link.prevDep = void 0;
  }
  if (nextDep) {
    nextDep.prevDep = prevDep;
    link.nextDep = void 0;
  }
}
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === void 0 ? true : last;
}
function cleanupEffect(e) {
  const { cleanup } = e;
  e.cleanup = void 0;
  if (cleanup) {
    const prevSub = activeSub;
    activeSub = void 0;
    try {
      cleanup();
    } finally {
      activeSub = prevSub;
    }
  }
}
function addSub(link) {
  link.dep.sc++;
  if (link.sub.flags & 4) {
    const computed3 = link.dep.computed;
    if (computed3 && !link.dep.subs) {
      computed3.flags |= 4 | 16;
      for (let l = computed3.deps; l; l = l.nextDep) {
        addSub(l);
      }
    }
    const currentTail = link.dep.subs;
    if (currentTail !== link) {
      link.prevSub = currentTail;
      if (currentTail) currentTail.nextSub = link;
    }
    if (link.dep.subsHead === void 0) {
      link.dep.subsHead = link;
    }
    link.dep.subs = link;
  }
}
function track(target, type, key) {
  if (shouldTrack && activeSub) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = new Dep());
      dep.map = depsMap;
      dep.key = key;
    }
    if (true) {
      dep.track({
        target,
        type,
        key
      });
    } else {
      dep.track();
    }
  }
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    globalVersion++;
    return;
  }
  const run = (dep) => {
    if (dep) {
      if (true) {
        dep.trigger({
          target,
          type,
          key,
          newValue,
          oldValue,
          oldTarget
        });
      } else {
        dep.trigger();
      }
    }
  };
  startBatch();
  if (type === "clear") {
    depsMap.forEach(run);
  } else {
    const targetIsArray = isArray(target);
    const isArrayIndex = targetIsArray && isIntegerKey(key);
    if (targetIsArray && key === "length") {
      const newLength = Number(newValue);
      depsMap.forEach((dep, key2) => {
        if (key2 === "length" || key2 === ARRAY_ITERATE_KEY || !isSymbol(key2) && key2 >= newLength) {
          run(dep);
        }
      });
    } else {
      if (key !== void 0 || depsMap.has(void 0)) {
        run(depsMap.get(key));
      }
      if (isArrayIndex) {
        run(depsMap.get(ARRAY_ITERATE_KEY));
      }
      switch (type) {
        case "add":
          if (!targetIsArray) {
            run(depsMap.get(ITERATE_KEY));
            if (isMap(target)) {
              run(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          } else if (isArrayIndex) {
            run(depsMap.get("length"));
          }
          break;
        case "delete":
          if (!targetIsArray) {
            run(depsMap.get(ITERATE_KEY));
            if (isMap(target)) {
              run(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          }
          break;
        case "set":
          if (isMap(target)) {
            run(depsMap.get(ITERATE_KEY));
          }
          break;
      }
    }
  }
  endBatch();
}
function getDepFromReactive(object, key) {
  const depMap = targetMap.get(object);
  return depMap && depMap.get(key);
}
function reactiveReadArray(array) {
  const raw = /* @__PURE__ */ toRaw(array);
  if (raw === array) return raw;
  track(raw, "iterate", ARRAY_ITERATE_KEY);
  return /* @__PURE__ */ isShallow(array) ? raw : raw.map(toReactive);
}
function shallowReadArray(arr) {
  track(arr = /* @__PURE__ */ toRaw(arr), "iterate", ARRAY_ITERATE_KEY);
  return arr;
}
function toWrapped(target, item) {
  if (/* @__PURE__ */ isReadonly(target)) {
    return /* @__PURE__ */ isReactive(target) ? toReadonly(toReactive(item)) : toReadonly(item);
  }
  return toReactive(item);
}
function iterator(self2, method, wrapValue) {
  const arr = shallowReadArray(self2);
  const iter = arr[method]();
  if (arr !== self2 && !/* @__PURE__ */ isShallow(self2)) {
    iter._next = iter.next;
    iter.next = () => {
      const result = iter._next();
      if (!result.done) {
        result.value = wrapValue(result.value);
      }
      return result;
    };
  }
  return iter;
}
function apply(self2, method, fn, thisArg, wrappedRetFn, args) {
  const arr = shallowReadArray(self2);
  const needsWrap = arr !== self2 && !/* @__PURE__ */ isShallow(self2);
  const methodFn = arr[method];
  if (methodFn !== arrayProto[method]) {
    const result2 = methodFn.apply(self2, args);
    return needsWrap ? toReactive(result2) : result2;
  }
  let wrappedFn = fn;
  if (arr !== self2) {
    if (needsWrap) {
      wrappedFn = function(item, index) {
        return fn.call(this, toWrapped(self2, item), index, self2);
      };
    } else if (fn.length > 2) {
      wrappedFn = function(item, index) {
        return fn.call(this, item, index, self2);
      };
    }
  }
  const result = methodFn.call(arr, wrappedFn, thisArg);
  return needsWrap && wrappedRetFn ? wrappedRetFn(result) : result;
}
function reduce(self2, method, fn, args) {
  const arr = shallowReadArray(self2);
  const needsWrap = arr !== self2 && !/* @__PURE__ */ isShallow(self2);
  let wrappedFn = fn;
  let wrapInitialAccumulator = false;
  if (arr !== self2) {
    if (needsWrap) {
      wrapInitialAccumulator = args.length === 0;
      wrappedFn = function(acc, item, index) {
        if (wrapInitialAccumulator) {
          wrapInitialAccumulator = false;
          acc = toWrapped(self2, acc);
        }
        return fn.call(this, acc, toWrapped(self2, item), index, self2);
      };
    } else if (fn.length > 3) {
      wrappedFn = function(acc, item, index) {
        return fn.call(this, acc, item, index, self2);
      };
    }
  }
  const result = arr[method](wrappedFn, ...args);
  return wrapInitialAccumulator ? toWrapped(self2, result) : result;
}
function searchProxy(self2, method, args) {
  const arr = /* @__PURE__ */ toRaw(self2);
  track(arr, "iterate", ARRAY_ITERATE_KEY);
  const res = arr[method](...args);
  if ((res === -1 || res === false) && /* @__PURE__ */ isProxy(args[0])) {
    args[0] = /* @__PURE__ */ toRaw(args[0]);
    return arr[method](...args);
  }
  return res;
}
function noTracking(self2, method, args = []) {
  pauseTracking();
  startBatch();
  const res = (/* @__PURE__ */ toRaw(self2))[method].apply(self2, args);
  endBatch();
  resetTracking();
  return res;
}
function hasOwnProperty2(key) {
  if (!isSymbol(key)) key = String(key);
  const obj = /* @__PURE__ */ toRaw(this);
  track(obj, "has", key);
  return obj.hasOwnProperty(key);
}
function createIterableMethod(method, isReadonly2, isShallow2) {
  return function(...args) {
    const target = this["__v_raw"];
    const rawTarget = /* @__PURE__ */ toRaw(target);
    const targetIsMap = isMap(rawTarget);
    const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
    const isKeyOnly = method === "keys" && targetIsMap;
    const innerIterator = target[method](...args);
    const wrap = isShallow2 ? toShallow : isReadonly2 ? toReadonly : toReactive;
    !isReadonly2 && track(
      rawTarget,
      "iterate",
      isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
    );
    return extend(
      // inheriting all iterator properties
      Object.create(innerIterator),
      {
        // iterator protocol
        next() {
          const { value, done } = innerIterator.next();
          return done ? { value, done } : {
            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done
          };
        }
      }
    );
  };
}
function createReadonlyMethod(type) {
  return function(...args) {
    if (true) {
      const key = args[0] ? `on key "${args[0]}" ` : ``;
      warn(
        `${capitalize(type)} operation ${key}failed: target is readonly.`,
        /* @__PURE__ */ toRaw(this)
      );
    }
    return type === "delete" ? false : type === "clear" ? void 0 : this;
  };
}
function createInstrumentations(readonly2, shallow) {
  const instrumentations = {
    get(key) {
      const target = this["__v_raw"];
      const rawTarget = /* @__PURE__ */ toRaw(target);
      const rawKey = /* @__PURE__ */ toRaw(key);
      if (!readonly2) {
        if (hasChanged(key, rawKey)) {
          track(rawTarget, "get", key);
        }
        track(rawTarget, "get", rawKey);
      }
      const { has } = getProto(rawTarget);
      const wrap = shallow ? toShallow : readonly2 ? toReadonly : toReactive;
      if (has.call(rawTarget, key)) {
        return wrap(target.get(key));
      } else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
      } else if (target !== rawTarget) {
        target.get(key);
      }
    },
    get size() {
      const target = this["__v_raw"];
      !readonly2 && track(/* @__PURE__ */ toRaw(target), "iterate", ITERATE_KEY);
      return target.size;
    },
    has(key) {
      const target = this["__v_raw"];
      const rawTarget = /* @__PURE__ */ toRaw(target);
      const rawKey = /* @__PURE__ */ toRaw(key);
      if (!readonly2) {
        if (hasChanged(key, rawKey)) {
          track(rawTarget, "has", key);
        }
        track(rawTarget, "has", rawKey);
      }
      return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
    },
    forEach(callback, thisArg) {
      const observed = this;
      const target = observed["__v_raw"];
      const rawTarget = /* @__PURE__ */ toRaw(target);
      const wrap = shallow ? toShallow : readonly2 ? toReadonly : toReactive;
      !readonly2 && track(rawTarget, "iterate", ITERATE_KEY);
      return target.forEach((value, key) => {
        return callback.call(thisArg, wrap(value), wrap(key), observed);
      });
    }
  };
  extend(
    instrumentations,
    readonly2 ? {
      add: createReadonlyMethod("add"),
      set: createReadonlyMethod("set"),
      delete: createReadonlyMethod("delete"),
      clear: createReadonlyMethod("clear")
    } : {
      add(value) {
        const target = /* @__PURE__ */ toRaw(this);
        const proto = getProto(target);
        const rawValue = /* @__PURE__ */ toRaw(value);
        const valueToAdd = !shallow && !/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value) ? rawValue : value;
        const hadKey = proto.has.call(target, valueToAdd) || hasChanged(value, valueToAdd) && proto.has.call(target, value) || hasChanged(rawValue, valueToAdd) && proto.has.call(target, rawValue);
        if (!hadKey) {
          target.add(valueToAdd);
          trigger(target, "add", valueToAdd, valueToAdd);
        }
        return this;
      },
      set(key, value) {
        if (!shallow && !/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value)) {
          value = /* @__PURE__ */ toRaw(value);
        }
        const target = /* @__PURE__ */ toRaw(this);
        const { has, get } = getProto(target);
        let hadKey = has.call(target, key);
        if (!hadKey) {
          key = /* @__PURE__ */ toRaw(key);
          hadKey = has.call(target, key);
        } else if (true) {
          checkIdentityKeys(target, has, key);
        }
        const oldValue = get.call(target, key);
        target.set(key, value);
        if (!hadKey) {
          trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, "set", key, value, oldValue);
        }
        return this;
      },
      delete(key) {
        const target = /* @__PURE__ */ toRaw(this);
        const { has, get } = getProto(target);
        let hadKey = has.call(target, key);
        if (!hadKey) {
          key = /* @__PURE__ */ toRaw(key);
          hadKey = has.call(target, key);
        } else if (true) {
          checkIdentityKeys(target, has, key);
        }
        const oldValue = get ? get.call(target, key) : void 0;
        const result = target.delete(key);
        if (hadKey) {
          trigger(target, "delete", key, void 0, oldValue);
        }
        return result;
      },
      clear() {
        const target = /* @__PURE__ */ toRaw(this);
        const hadItems = target.size !== 0;
        const oldTarget = true ? isMap(target) ? new Map(target) : new Set(target) : void 0;
        const result = target.clear();
        if (hadItems) {
          trigger(
            target,
            "clear",
            void 0,
            void 0,
            oldTarget
          );
        }
        return result;
      }
    }
  );
  const iteratorMethods = [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ];
  iteratorMethods.forEach((method) => {
    instrumentations[method] = createIterableMethod(method, readonly2, shallow);
  });
  return instrumentations;
}
function createInstrumentationGetter(isReadonly2, shallow) {
  const instrumentations = createInstrumentations(isReadonly2, shallow);
  return (target, key, receiver) => {
    if (key === "__v_isReactive") {
      return !isReadonly2;
    } else if (key === "__v_isReadonly") {
      return isReadonly2;
    } else if (key === "__v_raw") {
      return target;
    }
    return Reflect.get(
      hasOwn(instrumentations, key) && key in target ? instrumentations : target,
      key,
      receiver
    );
  };
}
function checkIdentityKeys(target, has, key) {
  const rawKey = /* @__PURE__ */ toRaw(key);
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = toRawType(target);
    warn(
      `Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
// @__NO_SIDE_EFFECTS__
function reactive(target) {
  if (/* @__PURE__ */ isReadonly(target)) {
    return target;
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}
// @__NO_SIDE_EFFECTS__
function shallowReactive(target) {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  );
}
// @__NO_SIDE_EFFECTS__
function readonly(target) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  );
}
// @__NO_SIDE_EFFECTS__
function shallowReadonly(target) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  );
}
function createReactiveObject(target, isReadonly2, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject(target)) {
    if (true) {
      warn(
        `value cannot be made ${isReadonly2 ? "readonly" : "reactive"}: ${String(
          target
        )}`
      );
    }
    return target;
  }
  if (target["__v_raw"] && !(isReadonly2 && target["__v_isReactive"])) {
    return target;
  }
  if (target["__v_skip"] || !Object.isExtensible(target)) {
    return target;
  }
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const targetType = targetTypeMap(toRawType(target));
  if (targetType === 0) {
    return target;
  }
  const proxy = new Proxy(
    target,
    targetType === 2 ? collectionHandlers : baseHandlers
  );
  proxyMap.set(target, proxy);
  return proxy;
}
// @__NO_SIDE_EFFECTS__
function isReactive(value) {
  if (/* @__PURE__ */ isReadonly(value)) {
    return /* @__PURE__ */ isReactive(value["__v_raw"]);
  }
  return !!(value && value["__v_isReactive"]);
}
// @__NO_SIDE_EFFECTS__
function isReadonly(value) {
  return !!(value && value["__v_isReadonly"]);
}
// @__NO_SIDE_EFFECTS__
function isShallow(value) {
  return !!(value && value["__v_isShallow"]);
}
// @__NO_SIDE_EFFECTS__
function isProxy(value) {
  return value ? !!value["__v_raw"] : false;
}
// @__NO_SIDE_EFFECTS__
function toRaw(observed) {
  const raw = observed && observed["__v_raw"];
  return raw ? /* @__PURE__ */ toRaw(raw) : observed;
}
function markRaw(value) {
  if (!hasOwn(value, "__v_skip") && Object.isExtensible(value)) {
    def(value, "__v_skip", true);
  }
  return value;
}
// @__NO_SIDE_EFFECTS__
function isRef2(r) {
  return r ? r["__v_isRef"] === true : false;
}
// @__NO_SIDE_EFFECTS__
function ref(value) {
  return createRef(value, false);
}
// @__NO_SIDE_EFFECTS__
function shallowRef(value) {
  return createRef(value, true);
}
function createRef(rawValue, shallow) {
  if (/* @__PURE__ */ isRef2(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}
function unref(ref2) {
  return /* @__PURE__ */ isRef2(ref2) ? ref2.value : ref2;
}
function toValue(source) {
  return isFunction(source) ? source() : unref(source);
}
function proxyRefs(objectWithRefs) {
  return /* @__PURE__ */ isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
function customRef(factory) {
  return new CustomRefImpl(factory);
}
// @__NO_SIDE_EFFECTS__
function toRefs(object) {
  if (!/* @__PURE__ */ isProxy(object)) {
    warn(`toRefs() expects a reactive object but received a plain one.`);
  }
  const ret = isArray(object) ? new Array(object.length) : {};
  for (const key in object) {
    ret[key] = propertyToRef(object, key);
  }
  return ret;
}
// @__NO_SIDE_EFFECTS__
function toRef(source, key, defaultValue) {
  if (/* @__PURE__ */ isRef2(source)) {
    return source;
  } else if (isFunction(source)) {
    return new GetterRefImpl(source);
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key, defaultValue);
  } else {
    return /* @__PURE__ */ ref(source);
  }
}
function propertyToRef(source, key, defaultValue) {
  return new ObjectRefImpl(source, key, defaultValue);
}
// @__NO_SIDE_EFFECTS__
function computed(getterOrOptions, debugOptions, isSSR = false) {
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  const cRef = new ComputedRefImpl(getter, setter, isSSR);
  if (debugOptions && !isSSR) {
    cRef.onTrack = debugOptions.onTrack;
    cRef.onTrigger = debugOptions.onTrigger;
  }
  return cRef;
}
function onWatcherCleanup(cleanupFn, failSilently = false, owner = activeWatcher) {
  if (owner) {
    let cleanups = cleanupMap.get(owner);
    if (!cleanups) cleanupMap.set(owner, cleanups = []);
    cleanups.push(cleanupFn);
  } else if (!failSilently) {
    warn(
      `onWatcherCleanup() was called when there was no active watcher to associate with.`
    );
  }
}
function watch(source, cb, options = EMPTY_OBJ) {
  const { immediate, deep, once, scheduler, augmentJob, call } = options;
  const warnInvalidSource = (s) => {
    (options.onWarn || warn)(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types.`
    );
  };
  const reactiveGetter = (source2) => {
    if (deep) return source2;
    if (/* @__PURE__ */ isShallow(source2) || deep === false || deep === 0)
      return traverse(source2, 1);
    return traverse(source2);
  };
  let effect2;
  let getter;
  let cleanup;
  let boundCleanup;
  let forceTrigger = false;
  let isMultiSource = false;
  if (/* @__PURE__ */ isRef2(source)) {
    getter = () => source.value;
    forceTrigger = /* @__PURE__ */ isShallow(source);
  } else if (/* @__PURE__ */ isReactive(source)) {
    getter = () => reactiveGetter(source);
    forceTrigger = true;
  } else if (isArray(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => /* @__PURE__ */ isReactive(s) || /* @__PURE__ */ isShallow(s));
    getter = () => source.map((s) => {
      if (/* @__PURE__ */ isRef2(s)) {
        return s.value;
      } else if (/* @__PURE__ */ isReactive(s)) {
        return reactiveGetter(s);
      } else if (isFunction(s)) {
        return call ? call(s, 2) : s();
      } else {
        warnInvalidSource(s);
      }
    });
  } else if (isFunction(source)) {
    if (cb) {
      getter = call ? () => call(source, 2) : source;
    } else {
      getter = () => {
        if (cleanup) {
          pauseTracking();
          try {
            cleanup();
          } finally {
            resetTracking();
          }
        }
        const currentEffect = activeWatcher;
        activeWatcher = effect2;
        try {
          return call ? call(source, 3, [boundCleanup]) : source(boundCleanup);
        } finally {
          activeWatcher = currentEffect;
        }
      };
    }
  } else {
    getter = NOOP;
    warnInvalidSource(source);
  }
  if (cb && deep) {
    const baseGetter = getter;
    const depth = deep === true ? Infinity : deep;
    getter = () => traverse(baseGetter(), depth);
  }
  const scope = getCurrentScope();
  const watchHandle = () => {
    effect2.stop();
    if (scope && scope.active) {
      remove(scope.effects, effect2);
    }
  };
  if (once && cb) {
    const _cb = cb;
    cb = (...args) => {
      const res = _cb(...args);
      watchHandle();
      return res;
    };
  }
  let oldValue = isMultiSource ? new Array(source.length).fill(INITIAL_WATCHER_VALUE) : INITIAL_WATCHER_VALUE;
  const job = (immediateFirstRun) => {
    if (!(effect2.flags & 1) || !effect2.dirty && !immediateFirstRun) {
      return;
    }
    if (cb) {
      const newValue = effect2.run();
      if (immediateFirstRun || deep || forceTrigger || (isMultiSource ? newValue.some((v, i) => hasChanged(v, oldValue[i])) : hasChanged(newValue, oldValue))) {
        if (cleanup) {
          cleanup();
        }
        const currentWatcher = activeWatcher;
        activeWatcher = effect2;
        try {
          const args = [
            newValue,
            // pass undefined as the old value when it's changed for the first time
            oldValue === INITIAL_WATCHER_VALUE ? void 0 : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE ? [] : oldValue,
            boundCleanup
          ];
          oldValue = newValue;
          call ? call(cb, 3, args) : (
            // @ts-expect-error
            cb(...args)
          );
        } finally {
          activeWatcher = currentWatcher;
        }
      }
    } else {
      effect2.run();
    }
  };
  if (augmentJob) {
    augmentJob(job);
  }
  effect2 = new ReactiveEffect(getter);
  effect2.scheduler = scheduler ? () => scheduler(job, false) : job;
  boundCleanup = (fn) => onWatcherCleanup(fn, false, effect2);
  cleanup = effect2.onStop = () => {
    const cleanups = cleanupMap.get(effect2);
    if (cleanups) {
      if (call) {
        call(cleanups, 4);
      } else {
        for (const cleanup2 of cleanups) cleanup2();
      }
      cleanupMap.delete(effect2);
    }
  };
  if (true) {
    effect2.onTrack = options.onTrack;
    effect2.onTrigger = options.onTrigger;
  }
  if (cb) {
    if (immediate) {
      job(true);
    } else {
      oldValue = effect2.run();
    }
  } else if (scheduler) {
    scheduler(job.bind(null, true), true);
  } else {
    effect2.run();
  }
  watchHandle.pause = effect2.pause.bind(effect2);
  watchHandle.resume = effect2.resume.bind(effect2);
  watchHandle.stop = watchHandle;
  return watchHandle;
}
function traverse(value, depth = Infinity, seen) {
  if (depth <= 0 || !isObject(value) || value["__v_skip"]) {
    return value;
  }
  seen = seen || /* @__PURE__ */ new Map();
  if ((seen.get(value) || 0) >= depth) {
    return value;
  }
  seen.set(value, depth);
  depth--;
  if (/* @__PURE__ */ isRef2(value)) {
    traverse(value.value, depth, seen);
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen);
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v) => {
      traverse(v, depth, seen);
    });
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen);
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        traverse(value[key], depth, seen);
      }
    }
  }
  return value;
}
var activeEffectScope, EffectScope, activeSub, pausedQueueEffects, ReactiveEffect, batchDepth, batchedSub, batchedComputed, shouldTrack, trackStack, globalVersion, Link, Dep, targetMap, ITERATE_KEY, MAP_KEY_ITERATE_KEY, ARRAY_ITERATE_KEY, arrayInstrumentations, arrayProto, isNonTrackableKeys, builtInSymbols, BaseReactiveHandler, MutableReactiveHandler, ReadonlyReactiveHandler, mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers, toShallow, getProto, mutableCollectionHandlers, shallowCollectionHandlers, readonlyCollectionHandlers, shallowReadonlyCollectionHandlers, reactiveMap, shallowReactiveMap, readonlyMap, shallowReadonlyMap, toReactive, toReadonly, RefImpl, shallowUnwrapHandlers, CustomRefImpl, ObjectRefImpl, GetterRefImpl, ComputedRefImpl, INITIAL_WATCHER_VALUE, cleanupMap, activeWatcher;
var init_reactivity_esm_bundler = __esm({
  "node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js"() {
    init_shared_esm_bundler();
    EffectScope = class {
      // TODO isolatedDeclarations "__v_skip"
      constructor(detached = false) {
        this.detached = detached;
        this._active = true;
        this._on = 0;
        this.effects = [];
        this.cleanups = [];
        this._isPaused = false;
        this._warnOnRun = true;
        this.__v_skip = true;
        if (!detached && activeEffectScope) {
          if (activeEffectScope.active) {
            this.parent = activeEffectScope;
            this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
              this
            ) - 1;
          } else {
            this._active = false;
            this._warnOnRun = false;
          }
        }
      }
      get active() {
        return this._active;
      }
      pause() {
        if (this._active) {
          this._isPaused = true;
          let i, l;
          if (this.scopes) {
            for (i = 0, l = this.scopes.length; i < l; i++) {
              this.scopes[i].pause();
            }
          }
          for (i = 0, l = this.effects.length; i < l; i++) {
            this.effects[i].pause();
          }
        }
      }
      /**
       * Resumes the effect scope, including all child scopes and effects.
       */
      resume() {
        if (this._active) {
          if (this._isPaused) {
            this._isPaused = false;
            let i, l;
            if (this.scopes) {
              for (i = 0, l = this.scopes.length; i < l; i++) {
                this.scopes[i].resume();
              }
            }
            for (i = 0, l = this.effects.length; i < l; i++) {
              this.effects[i].resume();
            }
          }
        }
      }
      run(fn) {
        if (this._active) {
          const currentEffectScope = activeEffectScope;
          try {
            activeEffectScope = this;
            return fn();
          } finally {
            activeEffectScope = currentEffectScope;
          }
        } else if (this._warnOnRun) {
          warn(`cannot run an inactive effect scope.`);
        }
      }
      /**
       * This should only be called on non-detached scopes
       * @internal
       */
      on() {
        if (++this._on === 1) {
          this.prevScope = activeEffectScope;
          activeEffectScope = this;
        }
      }
      /**
       * This should only be called on non-detached scopes
       * @internal
       */
      off() {
        if (this._on > 0 && --this._on === 0) {
          if (activeEffectScope === this) {
            activeEffectScope = this.prevScope;
          } else {
            let current = activeEffectScope;
            while (current) {
              if (current.prevScope === this) {
                current.prevScope = this.prevScope;
                break;
              }
              current = current.prevScope;
            }
          }
          this.prevScope = void 0;
        }
      }
      stop(fromParent) {
        if (this._active) {
          this._active = false;
          let i, l;
          for (i = 0, l = this.effects.length; i < l; i++) {
            this.effects[i].stop();
          }
          this.effects.length = 0;
          for (i = 0, l = this.cleanups.length; i < l; i++) {
            this.cleanups[i]();
          }
          this.cleanups.length = 0;
          if (this.scopes) {
            for (i = 0, l = this.scopes.length; i < l; i++) {
              this.scopes[i].stop(true);
            }
            this.scopes.length = 0;
          }
          if (!this.detached && this.parent && !fromParent) {
            const last = this.parent.scopes.pop();
            if (last && last !== this) {
              this.parent.scopes[this.index] = last;
              last.index = this.index;
            }
          }
          this.parent = void 0;
        }
      }
    };
    pausedQueueEffects = /* @__PURE__ */ new WeakSet();
    ReactiveEffect = class {
      constructor(fn) {
        this.fn = fn;
        this.deps = void 0;
        this.depsTail = void 0;
        this.flags = 1 | 4;
        this.next = void 0;
        this.cleanup = void 0;
        this.scheduler = void 0;
        if (activeEffectScope) {
          if (activeEffectScope.active) {
            activeEffectScope.effects.push(this);
          } else {
            this.flags &= -2;
          }
        }
      }
      pause() {
        this.flags |= 64;
      }
      resume() {
        if (this.flags & 64) {
          this.flags &= -65;
          if (pausedQueueEffects.has(this)) {
            pausedQueueEffects.delete(this);
            this.trigger();
          }
        }
      }
      /**
       * @internal
       */
      notify() {
        if (this.flags & 2 && !(this.flags & 32)) {
          return;
        }
        if (!(this.flags & 8)) {
          batch(this);
        }
      }
      run() {
        if (!(this.flags & 1)) {
          return this.fn();
        }
        this.flags |= 2;
        cleanupEffect(this);
        prepareDeps(this);
        const prevEffect = activeSub;
        const prevShouldTrack = shouldTrack;
        activeSub = this;
        shouldTrack = true;
        try {
          return this.fn();
        } finally {
          if (activeSub !== this) {
            warn(
              "Active effect was not restored correctly - this is likely a Vue internal bug."
            );
          }
          cleanupDeps(this);
          activeSub = prevEffect;
          shouldTrack = prevShouldTrack;
          this.flags &= -3;
        }
      }
      stop() {
        if (this.flags & 1) {
          for (let link = this.deps; link; link = link.nextDep) {
            removeSub(link);
          }
          this.deps = this.depsTail = void 0;
          cleanupEffect(this);
          this.onStop && this.onStop();
          this.flags &= -2;
        }
      }
      trigger() {
        if (this.flags & 64) {
          pausedQueueEffects.add(this);
        } else if (this.scheduler) {
          this.scheduler();
        } else {
          this.runIfDirty();
        }
      }
      /**
       * @internal
       */
      runIfDirty() {
        if (isDirty(this)) {
          this.run();
        }
      }
      get dirty() {
        return isDirty(this);
      }
    };
    batchDepth = 0;
    shouldTrack = true;
    trackStack = [];
    globalVersion = 0;
    Link = class {
      constructor(sub, dep) {
        this.sub = sub;
        this.dep = dep;
        this.version = dep.version;
        this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
      }
    };
    Dep = class {
      // TODO isolatedDeclarations "__v_skip"
      constructor(computed3) {
        this.computed = computed3;
        this.version = 0;
        this.activeLink = void 0;
        this.subs = void 0;
        this.map = void 0;
        this.key = void 0;
        this.sc = 0;
        this.__v_skip = true;
        if (true) {
          this.subsHead = void 0;
        }
      }
      track(debugInfo) {
        if (!activeSub || !shouldTrack || activeSub === this.computed) {
          return;
        }
        let link = this.activeLink;
        if (link === void 0 || link.sub !== activeSub) {
          link = this.activeLink = new Link(activeSub, this);
          if (!activeSub.deps) {
            activeSub.deps = activeSub.depsTail = link;
          } else {
            link.prevDep = activeSub.depsTail;
            activeSub.depsTail.nextDep = link;
            activeSub.depsTail = link;
          }
          addSub(link);
        } else if (link.version === -1) {
          link.version = this.version;
          if (link.nextDep) {
            const next = link.nextDep;
            next.prevDep = link.prevDep;
            if (link.prevDep) {
              link.prevDep.nextDep = next;
            }
            link.prevDep = activeSub.depsTail;
            link.nextDep = void 0;
            activeSub.depsTail.nextDep = link;
            activeSub.depsTail = link;
            if (activeSub.deps === link) {
              activeSub.deps = next;
            }
          }
        }
        if (activeSub.onTrack) {
          activeSub.onTrack(
            extend(
              {
                effect: activeSub
              },
              debugInfo
            )
          );
        }
        return link;
      }
      trigger(debugInfo) {
        this.version++;
        globalVersion++;
        this.notify(debugInfo);
      }
      notify(debugInfo) {
        startBatch();
        try {
          if (true) {
            for (let head = this.subsHead; head; head = head.nextSub) {
              if (head.sub.onTrigger && !(head.sub.flags & 8)) {
                head.sub.onTrigger(
                  extend(
                    {
                      effect: head.sub
                    },
                    debugInfo
                  )
                );
              }
            }
          }
          for (let link = this.subs; link; link = link.prevSub) {
            if (link.sub.notify()) {
              ;
              link.sub.dep.notify();
            }
          }
        } finally {
          endBatch();
        }
      }
    };
    targetMap = /* @__PURE__ */ new WeakMap();
    ITERATE_KEY = /* @__PURE__ */ Symbol(
      true ? "Object iterate" : ""
    );
    MAP_KEY_ITERATE_KEY = /* @__PURE__ */ Symbol(
      true ? "Map keys iterate" : ""
    );
    ARRAY_ITERATE_KEY = /* @__PURE__ */ Symbol(
      true ? "Array iterate" : ""
    );
    arrayInstrumentations = {
      __proto__: null,
      [Symbol.iterator]() {
        return iterator(this, Symbol.iterator, (item) => toWrapped(this, item));
      },
      concat(...args) {
        return reactiveReadArray(this).concat(
          ...args.map((x) => isArray(x) ? reactiveReadArray(x) : x)
        );
      },
      entries() {
        return iterator(this, "entries", (value) => {
          value[1] = toWrapped(this, value[1]);
          return value;
        });
      },
      every(fn, thisArg) {
        return apply(this, "every", fn, thisArg, void 0, arguments);
      },
      filter(fn, thisArg) {
        return apply(
          this,
          "filter",
          fn,
          thisArg,
          (v) => v.map((item) => toWrapped(this, item)),
          arguments
        );
      },
      find(fn, thisArg) {
        return apply(
          this,
          "find",
          fn,
          thisArg,
          (item) => toWrapped(this, item),
          arguments
        );
      },
      findIndex(fn, thisArg) {
        return apply(this, "findIndex", fn, thisArg, void 0, arguments);
      },
      findLast(fn, thisArg) {
        return apply(
          this,
          "findLast",
          fn,
          thisArg,
          (item) => toWrapped(this, item),
          arguments
        );
      },
      findLastIndex(fn, thisArg) {
        return apply(this, "findLastIndex", fn, thisArg, void 0, arguments);
      },
      // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
      forEach(fn, thisArg) {
        return apply(this, "forEach", fn, thisArg, void 0, arguments);
      },
      includes(...args) {
        return searchProxy(this, "includes", args);
      },
      indexOf(...args) {
        return searchProxy(this, "indexOf", args);
      },
      join(separator) {
        return reactiveReadArray(this).join(separator);
      },
      // keys() iterator only reads `length`, no optimization required
      lastIndexOf(...args) {
        return searchProxy(this, "lastIndexOf", args);
      },
      map(fn, thisArg) {
        return apply(this, "map", fn, thisArg, void 0, arguments);
      },
      pop() {
        return noTracking(this, "pop");
      },
      push(...args) {
        return noTracking(this, "push", args);
      },
      reduce(fn, ...args) {
        return reduce(this, "reduce", fn, args);
      },
      reduceRight(fn, ...args) {
        return reduce(this, "reduceRight", fn, args);
      },
      shift() {
        return noTracking(this, "shift");
      },
      // slice could use ARRAY_ITERATE but also seems to beg for range tracking
      some(fn, thisArg) {
        return apply(this, "some", fn, thisArg, void 0, arguments);
      },
      splice(...args) {
        return noTracking(this, "splice", args);
      },
      toReversed() {
        return reactiveReadArray(this).toReversed();
      },
      toSorted(comparer) {
        return reactiveReadArray(this).toSorted(comparer);
      },
      toSpliced(...args) {
        return reactiveReadArray(this).toSpliced(...args);
      },
      unshift(...args) {
        return noTracking(this, "unshift", args);
      },
      values() {
        return iterator(this, "values", (item) => toWrapped(this, item));
      }
    };
    arrayProto = Array.prototype;
    isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
    builtInSymbols = new Set(
      /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((key) => key !== "arguments" && key !== "caller").map((key) => Symbol[key]).filter(isSymbol)
    );
    BaseReactiveHandler = class {
      constructor(_isReadonly = false, _isShallow = false) {
        this._isReadonly = _isReadonly;
        this._isShallow = _isShallow;
      }
      get(target, key, receiver) {
        if (key === "__v_skip") return target["__v_skip"];
        const isReadonly2 = this._isReadonly, isShallow2 = this._isShallow;
        if (key === "__v_isReactive") {
          return !isReadonly2;
        } else if (key === "__v_isReadonly") {
          return isReadonly2;
        } else if (key === "__v_isShallow") {
          return isShallow2;
        } else if (key === "__v_raw") {
          if (receiver === (isReadonly2 ? isShallow2 ? shallowReadonlyMap : readonlyMap : isShallow2 ? shallowReactiveMap : reactiveMap).get(target) || // receiver is not the reactive proxy, but has the same prototype
          // this means the receiver is a user proxy of the reactive proxy
          Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)) {
            return target;
          }
          return;
        }
        const targetIsArray = isArray(target);
        if (!isReadonly2) {
          let fn;
          if (targetIsArray && (fn = arrayInstrumentations[key])) {
            return fn;
          }
          if (key === "hasOwnProperty") {
            return hasOwnProperty2;
          }
        }
        const res = Reflect.get(
          target,
          key,
          // if this is a proxy wrapping a ref, return methods using the raw ref
          // as receiver so that we don't have to call `toRaw` on the ref in all
          // its class methods
          /* @__PURE__ */ isRef2(target) ? target : receiver
        );
        if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
          return res;
        }
        if (!isReadonly2) {
          track(target, "get", key);
        }
        if (isShallow2) {
          return res;
        }
        if (/* @__PURE__ */ isRef2(res)) {
          const value = targetIsArray && isIntegerKey(key) ? res : res.value;
          return isReadonly2 && isObject(value) ? /* @__PURE__ */ readonly(value) : value;
        }
        if (isObject(res)) {
          return isReadonly2 ? /* @__PURE__ */ readonly(res) : /* @__PURE__ */ reactive(res);
        }
        return res;
      }
    };
    MutableReactiveHandler = class extends BaseReactiveHandler {
      constructor(isShallow2 = false) {
        super(false, isShallow2);
      }
      set(target, key, value, receiver) {
        let oldValue = target[key];
        const isArrayWithIntegerKey = isArray(target) && isIntegerKey(key);
        if (!this._isShallow) {
          const isOldValueReadonly = /* @__PURE__ */ isReadonly(oldValue);
          if (!/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value)) {
            oldValue = /* @__PURE__ */ toRaw(oldValue);
            value = /* @__PURE__ */ toRaw(value);
          }
          if (!isArrayWithIntegerKey && /* @__PURE__ */ isRef2(oldValue) && !/* @__PURE__ */ isRef2(value)) {
            if (isOldValueReadonly) {
              if (true) {
                warn(
                  `Set operation on key "${String(key)}" failed: target is readonly.`,
                  target[key]
                );
              }
              return true;
            } else {
              oldValue.value = value;
              return true;
            }
          }
        }
        const hadKey = isArrayWithIntegerKey ? Number(key) < target.length : hasOwn(target, key);
        const result = Reflect.set(
          target,
          key,
          value,
          /* @__PURE__ */ isRef2(target) ? target : receiver
        );
        if (target === /* @__PURE__ */ toRaw(receiver)) {
          if (!hadKey) {
            trigger(target, "add", key, value);
          } else if (hasChanged(value, oldValue)) {
            trigger(target, "set", key, value, oldValue);
          }
        }
        return result;
      }
      deleteProperty(target, key) {
        const hadKey = hasOwn(target, key);
        const oldValue = target[key];
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) {
          trigger(target, "delete", key, void 0, oldValue);
        }
        return result;
      }
      has(target, key) {
        const result = Reflect.has(target, key);
        if (!isSymbol(key) || !builtInSymbols.has(key)) {
          track(target, "has", key);
        }
        return result;
      }
      ownKeys(target) {
        track(
          target,
          "iterate",
          isArray(target) ? "length" : ITERATE_KEY
        );
        return Reflect.ownKeys(target);
      }
    };
    ReadonlyReactiveHandler = class extends BaseReactiveHandler {
      constructor(isShallow2 = false) {
        super(true, isShallow2);
      }
      set(target, key) {
        if (true) {
          warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target
          );
        }
        return true;
      }
      deleteProperty(target, key) {
        if (true) {
          warn(
            `Delete operation on key "${String(key)}" failed: target is readonly.`,
            target
          );
        }
        return true;
      }
    };
    mutableHandlers = /* @__PURE__ */ new MutableReactiveHandler();
    readonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler();
    shallowReactiveHandlers = /* @__PURE__ */ new MutableReactiveHandler(true);
    shallowReadonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler(true);
    toShallow = (value) => value;
    getProto = (v) => Reflect.getPrototypeOf(v);
    mutableCollectionHandlers = {
      get: /* @__PURE__ */ createInstrumentationGetter(false, false)
    };
    shallowCollectionHandlers = {
      get: /* @__PURE__ */ createInstrumentationGetter(false, true)
    };
    readonlyCollectionHandlers = {
      get: /* @__PURE__ */ createInstrumentationGetter(true, false)
    };
    shallowReadonlyCollectionHandlers = {
      get: /* @__PURE__ */ createInstrumentationGetter(true, true)
    };
    reactiveMap = /* @__PURE__ */ new WeakMap();
    shallowReactiveMap = /* @__PURE__ */ new WeakMap();
    readonlyMap = /* @__PURE__ */ new WeakMap();
    shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
    toReactive = (value) => isObject(value) ? /* @__PURE__ */ reactive(value) : value;
    toReadonly = (value) => isObject(value) ? /* @__PURE__ */ readonly(value) : value;
    RefImpl = class {
      constructor(value, isShallow2) {
        this.dep = new Dep();
        this["__v_isRef"] = true;
        this["__v_isShallow"] = false;
        this._rawValue = isShallow2 ? value : /* @__PURE__ */ toRaw(value);
        this._value = isShallow2 ? value : toReactive(value);
        this["__v_isShallow"] = isShallow2;
      }
      get value() {
        if (true) {
          this.dep.track({
            target: this,
            type: "get",
            key: "value"
          });
        } else {
          this.dep.track();
        }
        return this._value;
      }
      set value(newValue) {
        const oldValue = this._rawValue;
        const useDirectValue = this["__v_isShallow"] || /* @__PURE__ */ isShallow(newValue) || /* @__PURE__ */ isReadonly(newValue);
        newValue = useDirectValue ? newValue : /* @__PURE__ */ toRaw(newValue);
        if (hasChanged(newValue, oldValue)) {
          this._rawValue = newValue;
          this._value = useDirectValue ? newValue : toReactive(newValue);
          if (true) {
            this.dep.trigger({
              target: this,
              type: "set",
              key: "value",
              newValue,
              oldValue
            });
          } else {
            this.dep.trigger();
          }
        }
      }
    };
    shallowUnwrapHandlers = {
      get: (target, key, receiver) => key === "__v_raw" ? target : unref(Reflect.get(target, key, receiver)),
      set: (target, key, value, receiver) => {
        const oldValue = target[key];
        if (/* @__PURE__ */ isRef2(oldValue) && !/* @__PURE__ */ isRef2(value)) {
          oldValue.value = value;
          return true;
        } else {
          return Reflect.set(target, key, value, receiver);
        }
      }
    };
    CustomRefImpl = class {
      constructor(factory) {
        this["__v_isRef"] = true;
        this._value = void 0;
        const dep = this.dep = new Dep();
        const { get, set } = factory(dep.track.bind(dep), dep.trigger.bind(dep));
        this._get = get;
        this._set = set;
      }
      get value() {
        return this._value = this._get();
      }
      set value(newVal) {
        this._set(newVal);
      }
    };
    ObjectRefImpl = class {
      constructor(_object, key, _defaultValue) {
        this._object = _object;
        this._defaultValue = _defaultValue;
        this["__v_isRef"] = true;
        this._value = void 0;
        this._key = isSymbol(key) ? key : String(key);
        this._raw = /* @__PURE__ */ toRaw(_object);
        let shallow = true;
        let obj = _object;
        if (!isArray(_object) || isSymbol(this._key) || !isIntegerKey(this._key)) {
          do {
            shallow = !/* @__PURE__ */ isProxy(obj) || /* @__PURE__ */ isShallow(obj);
          } while (shallow && (obj = obj["__v_raw"]));
        }
        this._shallow = shallow;
      }
      get value() {
        let val = this._object[this._key];
        if (this._shallow) {
          val = unref(val);
        }
        return this._value = val === void 0 ? this._defaultValue : val;
      }
      set value(newVal) {
        if (this._shallow && /* @__PURE__ */ isRef2(this._raw[this._key])) {
          const nestedRef = this._object[this._key];
          if (/* @__PURE__ */ isRef2(nestedRef)) {
            nestedRef.value = newVal;
            return;
          }
        }
        this._object[this._key] = newVal;
      }
      get dep() {
        return getDepFromReactive(this._raw, this._key);
      }
    };
    GetterRefImpl = class {
      constructor(_getter) {
        this._getter = _getter;
        this["__v_isRef"] = true;
        this["__v_isReadonly"] = true;
        this._value = void 0;
      }
      get value() {
        return this._value = this._getter();
      }
    };
    ComputedRefImpl = class {
      constructor(fn, setter, isSSR) {
        this.fn = fn;
        this.setter = setter;
        this._value = void 0;
        this.dep = new Dep(this);
        this.__v_isRef = true;
        this.deps = void 0;
        this.depsTail = void 0;
        this.flags = 16;
        this.globalVersion = globalVersion - 1;
        this.next = void 0;
        this.effect = this;
        this["__v_isReadonly"] = !setter;
        this.isSSR = isSSR;
      }
      /**
       * @internal
       */
      notify() {
        this.flags |= 16;
        if (!(this.flags & 8) && // avoid infinite self recursion
        activeSub !== this) {
          batch(this, true);
          return true;
        } else if (true) ;
      }
      get value() {
        const link = true ? this.dep.track({
          target: this,
          type: "get",
          key: "value"
        }) : this.dep.track();
        refreshComputed(this);
        if (link) {
          link.version = this.dep.version;
        }
        return this._value;
      }
      set value(newValue) {
        if (this.setter) {
          this.setter(newValue);
        } else if (true) {
          warn("Write operation failed: computed value is readonly");
        }
      }
    };
    INITIAL_WATCHER_VALUE = {};
    cleanupMap = /* @__PURE__ */ new WeakMap();
    activeWatcher = void 0;
  }
});

// node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
function pushWarningContext(vnode) {
  stack.push(vnode);
}
function popWarningContext() {
  stack.pop();
}
function warn$1(msg, ...args) {
  if (isWarning) return;
  isWarning = true;
  pauseTracking();
  const instance = stack.length ? stack[stack.length - 1].component : null;
  const appWarnHandler = instance && instance.appContext.config.warnHandler;
  const trace = getComponentTrace();
  if (appWarnHandler) {
    callWithErrorHandling(
      appWarnHandler,
      instance,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        msg + args.map((a) => {
          var _a, _b;
          return (_b = (_a = a.toString) == null ? void 0 : _a.call(a)) != null ? _b : JSON.stringify(a);
        }).join(""),
        instance && instance.proxy,
        trace.map(
          ({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`
        ).join("\n"),
        trace
      ]
    );
  } else {
    const warnArgs = [`[Vue warn]: ${msg}`, ...args];
    if (trace.length && // avoid spamming console during tests
    true) {
      warnArgs.push(`
`, ...formatTrace(trace));
    }
    console.warn(...warnArgs);
  }
  resetTracking();
  isWarning = false;
}
function getComponentTrace() {
  let currentVNode = stack[stack.length - 1];
  if (!currentVNode) {
    return [];
  }
  const normalizedStack = [];
  while (currentVNode) {
    const last = normalizedStack[0];
    if (last && last.vnode === currentVNode) {
      last.recurseCount++;
    } else {
      normalizedStack.push({
        vnode: currentVNode,
        recurseCount: 0
      });
    }
    const parentInstance = currentVNode.component && currentVNode.component.parent;
    currentVNode = parentInstance && parentInstance.vnode;
  }
  return normalizedStack;
}
function formatTrace(trace) {
  const logs = [];
  trace.forEach((entry, i) => {
    logs.push(...i === 0 ? [] : [`
`], ...formatTraceEntry(entry));
  });
  return logs;
}
function formatTraceEntry({ vnode, recurseCount }) {
  const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
  const isRoot = vnode.component ? vnode.component.parent == null : false;
  const open = ` at <${formatComponentName(
    vnode.component,
    vnode.type,
    isRoot
  )}`;
  const close = `>` + postfix;
  return vnode.props ? [open, ...formatProps(vnode.props), close] : [open + close];
}
function formatProps(props) {
  const res = [];
  const keys2 = Object.keys(props);
  keys2.slice(0, 3).forEach((key) => {
    res.push(...formatProp(key, props[key]));
  });
  if (keys2.length > 3) {
    res.push(` ...`);
  }
  return res;
}
function formatProp(key, value, raw) {
  if (isString(value)) {
    value = JSON.stringify(value);
    return raw ? value : [`${key}=${value}`];
  } else if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return raw ? value : [`${key}=${value}`];
  } else if (isRef2(value)) {
    value = formatProp(key, toRaw(value.value), true);
    return raw ? value : [`${key}=Ref<`, value, `>`];
  } else if (isFunction(value)) {
    return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
  } else {
    value = toRaw(value);
    return raw ? value : [`${key}=`, value];
  }
}
function assertNumber(val, type) {
  if (false) return;
  if (val === void 0) {
    return;
  } else if (typeof val !== "number") {
    warn$1(`${type} is not a valid number - got ${JSON.stringify(val)}.`);
  } else if (isNaN(val)) {
    warn$1(`${type} is NaN - the duration expression might be incorrect.`);
  }
}
function callWithErrorHandling(fn, instance, type, args) {
  try {
    return args ? fn(...args) : fn();
  } catch (err) {
    handleError(err, instance, type);
  }
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args);
    if (res && isPromise(res)) {
      res.catch((err) => {
        handleError(err, instance, type);
      });
    }
    return res;
  }
  if (isArray(fn)) {
    const values = [];
    for (let i = 0; i < fn.length; i++) {
      values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
    }
    return values;
  } else if (true) {
    warn$1(
      `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof fn}`
    );
  }
}
function handleError(err, instance, type, throwInDev = true) {
  const contextVNode = instance ? instance.vnode : null;
  const { errorHandler, throwUnhandledErrorInProduction } = instance && instance.appContext.config || EMPTY_OBJ;
  if (instance) {
    let cur = instance.parent;
    const exposedInstance = instance.proxy;
    const errorInfo = true ? ErrorTypeStrings$1[type] : `https://vuejs.org/error-reference/#runtime-${type}`;
    while (cur) {
      const errorCapturedHooks = cur.ec;
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
            return;
          }
        }
      }
      cur = cur.parent;
    }
    if (errorHandler) {
      pauseTracking();
      callWithErrorHandling(errorHandler, null, 10, [
        err,
        exposedInstance,
        errorInfo
      ]);
      resetTracking();
      return;
    }
  }
  logError(err, type, contextVNode, throwInDev, throwUnhandledErrorInProduction);
}
function logError(err, type, contextVNode, throwInDev = true, throwInProd = false) {
  if (true) {
    const info = ErrorTypeStrings$1[type];
    if (contextVNode) {
      pushWarningContext(contextVNode);
    }
    warn$1(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
    if (contextVNode) {
      popWarningContext();
    }
    if (throwInDev) {
      throw err;
    } else {
      console.error(err);
    }
  } else if (throwInProd) {
    throw err;
  } else {
    console.error(err);
  }
}
function nextTick(fn) {
  const p2 = currentFlushPromise || resolvedPromise;
  return fn ? p2.then(this ? fn.bind(this) : fn) : p2;
}
function findInsertionIndex(id) {
  let start = flushIndex + 1;
  let end = queue.length;
  while (start < end) {
    const middle = start + end >>> 1;
    const middleJob = queue[middle];
    const middleJobId = getId(middleJob);
    if (middleJobId < id || middleJobId === id && middleJob.flags & 2) {
      start = middle + 1;
    } else {
      end = middle;
    }
  }
  return start;
}
function queueJob(job) {
  if (!(job.flags & 1)) {
    const jobId = getId(job);
    const lastJob = queue[queue.length - 1];
    if (!lastJob || // fast path when the job id is larger than the tail
    !(job.flags & 2) && jobId >= getId(lastJob)) {
      queue.push(job);
    } else {
      queue.splice(findInsertionIndex(jobId), 0, job);
    }
    job.flags |= 1;
    queueFlush();
  }
}
function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}
function queuePostFlushCb(cb) {
  if (!isArray(cb)) {
    if (activePostFlushCbs && cb.id === -1) {
      activePostFlushCbs.splice(postFlushIndex + 1, 0, cb);
    } else if (!(cb.flags & 1)) {
      pendingPostFlushCbs.push(cb);
      cb.flags |= 1;
    }
  } else {
    pendingPostFlushCbs.push(...cb);
  }
  queueFlush();
}
function flushPreFlushCbs(instance, seen, i = flushIndex + 1) {
  if (true) {
    seen = seen || /* @__PURE__ */ new Map();
  }
  for (; i < queue.length; i++) {
    const cb = queue[i];
    if (cb && cb.flags & 2) {
      if (instance && cb.id !== instance.uid) {
        continue;
      }
      if (checkRecursiveUpdates(seen, cb)) {
        continue;
      }
      queue.splice(i, 1);
      i--;
      if (cb.flags & 4) {
        cb.flags &= -2;
      }
      cb();
      if (!(cb.flags & 4)) {
        cb.flags &= -2;
      }
    }
  }
}
function flushPostFlushCbs(seen) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)].sort(
      (a, b) => getId(a) - getId(b)
    );
    pendingPostFlushCbs.length = 0;
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped);
      return;
    }
    activePostFlushCbs = deduped;
    if (true) {
      seen = seen || /* @__PURE__ */ new Map();
    }
    for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
      const cb = activePostFlushCbs[postFlushIndex];
      if (checkRecursiveUpdates(seen, cb)) {
        continue;
      }
      if (cb.flags & 4) {
        cb.flags &= -2;
      }
      if (!(cb.flags & 8)) cb();
      cb.flags &= -2;
    }
    activePostFlushCbs = null;
    postFlushIndex = 0;
  }
}
function flushJobs(seen) {
  if (true) {
    seen = seen || /* @__PURE__ */ new Map();
  }
  const check = true ? (job) => checkRecursiveUpdates(seen, job) : NOOP;
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job && !(job.flags & 8)) {
        if (check(job)) {
          continue;
        }
        if (job.flags & 4) {
          job.flags &= ~1;
        }
        callWithErrorHandling(
          job,
          job.i,
          job.i ? 15 : 14
        );
        if (!(job.flags & 4)) {
          job.flags &= ~1;
        }
      }
    }
  } finally {
    for (; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job) {
        job.flags &= -2;
      }
    }
    flushIndex = -1;
    queue.length = 0;
    flushPostFlushCbs(seen);
    currentFlushPromise = null;
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen);
    }
  }
}
function checkRecursiveUpdates(seen, fn) {
  const count = seen.get(fn) || 0;
  if (count > RECURSION_LIMIT) {
    const instance = fn.i;
    const componentName = instance && getComponentName(instance.type);
    handleError(
      `Maximum recursive updates exceeded${componentName ? ` in component <${componentName}>` : ``}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    );
    return true;
  }
  seen.set(fn, count + 1);
  return false;
}
function registerHMR(instance) {
  const id = instance.type.__hmrId;
  let record = map.get(id);
  if (!record) {
    createRecord(id, instance.type);
    record = map.get(id);
  }
  record.instances.add(instance);
}
function unregisterHMR(instance) {
  map.get(instance.type.__hmrId).instances.delete(instance);
}
function createRecord(id, initialDef) {
  if (map.has(id)) {
    return false;
  }
  map.set(id, {
    initialDef: normalizeClassComponent(initialDef),
    instances: /* @__PURE__ */ new Set()
  });
  return true;
}
function normalizeClassComponent(component) {
  return isClassComponent(component) ? component.__vccOpts : component;
}
function rerender(id, newRender) {
  const record = map.get(id);
  if (!record) {
    return;
  }
  record.initialDef.render = newRender;
  [...record.instances].forEach((instance) => {
    if (newRender) {
      instance.render = newRender;
      normalizeClassComponent(instance.type).render = newRender;
    }
    instance.renderCache = [];
    isHmrUpdating = true;
    if (!(instance.job.flags & 8)) {
      instance.update();
    }
    isHmrUpdating = false;
  });
}
function reload(id, newComp) {
  const record = map.get(id);
  if (!record) return;
  newComp = normalizeClassComponent(newComp);
  updateComponentDef(record.initialDef, newComp);
  const instances = [...record.instances];
  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i];
    const oldComp = normalizeClassComponent(instance.type);
    let dirtyInstances = hmrDirtyComponents.get(oldComp);
    if (!dirtyInstances) {
      if (oldComp !== record.initialDef) {
        updateComponentDef(oldComp, newComp);
      }
      hmrDirtyComponents.set(oldComp, dirtyInstances = /* @__PURE__ */ new Set());
    }
    dirtyInstances.add(instance);
    instance.appContext.propsCache.delete(instance.type);
    instance.appContext.emitsCache.delete(instance.type);
    instance.appContext.optionsCache.delete(instance.type);
    if (instance.ceReload) {
      dirtyInstances.add(instance);
      instance.ceReload(newComp.styles);
      dirtyInstances.delete(instance);
    } else if (instance.parent) {
      queueJob(() => {
        if (!(instance.job.flags & 8)) {
          isHmrUpdating = true;
          instance.parent.update();
          isHmrUpdating = false;
          dirtyInstances.delete(instance);
        }
      });
    } else if (instance.appContext.reload) {
      instance.appContext.reload();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      console.warn(
        "[HMR] Root or manually mounted instance modified. Full reload required."
      );
    }
    if (instance.root.ce && instance !== instance.root) {
      instance.root.ce._removeChildStyle(oldComp);
    }
  }
  queuePostFlushCb(() => {
    hmrDirtyComponents.clear();
  });
}
function updateComponentDef(oldComp, newComp) {
  extend(oldComp, newComp);
  for (const key in oldComp) {
    if (key !== "__file" && !(key in newComp)) {
      delete oldComp[key];
    }
  }
}
function tryWrap(fn) {
  return (id, arg) => {
    try {
      return fn(id, arg);
    } catch (e) {
      console.error(e);
      console.warn(
        `[HMR] Something went wrong during Vue component hot-reload. Full reload required.`
      );
    }
  };
}
function emit$1(event, ...args) {
  if (devtools$1) {
    devtools$1.emit(event, ...args);
  } else if (!devtoolsNotInstalled) {
    buffer.push({ event, args });
  }
}
function setDevtoolsHook$1(hook, target) {
  var _a, _b;
  devtools$1 = hook;
  if (devtools$1) {
    devtools$1.enabled = true;
    buffer.forEach(({ event, args }) => devtools$1.emit(event, ...args));
    buffer = [];
  } else if (
    // handle late devtools injection - only do this if we are in an actual
    // browser environment to avoid the timer handle stalling test runner exit
    // (#4815)
    typeof window !== "undefined" && // some envs mock window but not fully
    window.HTMLElement && // also exclude jsdom
    // eslint-disable-next-line no-restricted-syntax
    !((_b = (_a = window.navigator) == null ? void 0 : _a.userAgent) == null ? void 0 : _b.includes("jsdom"))
  ) {
    const replay = target.__VUE_DEVTOOLS_HOOK_REPLAY__ = target.__VUE_DEVTOOLS_HOOK_REPLAY__ || [];
    replay.push((newHook) => {
      setDevtoolsHook$1(newHook, target);
    });
    setTimeout(() => {
      if (!devtools$1) {
        target.__VUE_DEVTOOLS_HOOK_REPLAY__ = null;
        devtoolsNotInstalled = true;
        buffer = [];
      }
    }, 3e3);
  } else {
    devtoolsNotInstalled = true;
    buffer = [];
  }
}
function devtoolsInitApp(app, version2) {
  emit$1("app:init", app, version2, {
    Fragment,
    Text,
    Comment,
    Static
  });
}
function devtoolsUnmountApp(app) {
  emit$1("app:unmount", app);
}
// @__NO_SIDE_EFFECTS__
function createDevtoolsComponentHook(hook) {
  return (component) => {
    emit$1(
      hook,
      component.appContext.app,
      component.uid,
      component.parent ? component.parent.uid : void 0,
      component
    );
  };
}
function createDevtoolsPerformanceHook(hook) {
  return (component, type, time) => {
    emit$1(hook, component.appContext.app, component.uid, component, type, time);
  };
}
function devtoolsComponentEmit(component, event, params) {
  emit$1(
    "component:emit",
    component.appContext.app,
    component,
    event,
    params
  );
}
function setCurrentRenderingInstance(instance) {
  const prev = currentRenderingInstance;
  currentRenderingInstance = instance;
  currentScopeId = instance && instance.type.__scopeId || null;
  return prev;
}
function withCtx(fn, ctx = currentRenderingInstance, isNonScopedSlot) {
  if (!ctx) return fn;
  if (fn._n) {
    return fn;
  }
  const renderFnWithContext = (...args) => {
    if (renderFnWithContext._d) {
      setBlockTracking(-1);
    }
    const prevInstance = setCurrentRenderingInstance(ctx);
    let res;
    try {
      res = fn(...args);
    } finally {
      setCurrentRenderingInstance(prevInstance);
      if (renderFnWithContext._d) {
        setBlockTracking(1);
      }
    }
    if (true) {
      devtoolsComponentUpdated(ctx);
    }
    return res;
  };
  renderFnWithContext._n = true;
  renderFnWithContext._c = true;
  renderFnWithContext._d = true;
  return renderFnWithContext;
}
function validateDirectiveName(name) {
  if (isBuiltInDirective(name)) {
    warn$1("Do not use built-in directive ids as custom directive id: " + name);
  }
}
function withDirectives(vnode, directives) {
  if (currentRenderingInstance === null) {
    warn$1(`withDirectives can only be used inside render functions.`);
    return vnode;
  }
  const instance = getComponentPublicInstance(currentRenderingInstance);
  const bindings = vnode.dirs || (vnode.dirs = []);
  for (let i = 0; i < directives.length; i++) {
    let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i];
    if (dir) {
      if (isFunction(dir)) {
        dir = {
          mounted: dir,
          updated: dir
        };
      }
      if (dir.deep) {
        traverse(value);
      }
      bindings.push({
        dir,
        instance,
        value,
        oldValue: void 0,
        arg,
        modifiers
      });
    }
  }
  return vnode;
}
function invokeDirectiveHook(vnode, prevVNode, instance, name) {
  const bindings = vnode.dirs;
  const oldBindings = prevVNode && prevVNode.dirs;
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i];
    if (oldBindings) {
      binding.oldValue = oldBindings[i].value;
    }
    let hook = binding.dir[name];
    if (hook) {
      pauseTracking();
      callWithAsyncErrorHandling(hook, instance, 8, [
        vnode.el,
        binding,
        vnode,
        prevVNode
      ]);
      resetTracking();
    }
  }
}
function provide(key, value) {
  if (true) {
    if (!currentInstance || currentInstance.isMounted) {
      warn$1(`provide() can only be used inside setup().`);
    }
  }
  if (currentInstance) {
    let provides = currentInstance.provides;
    const parentProvides = currentInstance.parent && currentInstance.parent.provides;
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}
function inject(key, defaultValue, treatDefaultAsFactory = false) {
  const instance = getCurrentInstance();
  if (instance || currentApp) {
    let provides = currentApp ? currentApp._context.provides : instance ? instance.parent == null || instance.ce ? instance.vnode.appContext && instance.vnode.appContext.provides : instance.parent.provides : void 0;
    if (provides && key in provides) {
      return provides[key];
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue) ? defaultValue.call(instance && instance.proxy) : defaultValue;
    } else if (true) {
      warn$1(`injection "${String(key)}" not found.`);
    }
  } else if (true) {
    warn$1(`inject() can only be used inside setup() or functional components.`);
  }
}
function watch2(source, cb, options) {
  if (!isFunction(cb)) {
    warn$1(
      `\`watch(fn, options?)\` signature has been moved to a separate API. Use \`watchEffect(fn, options?)\` instead. \`watch\` now only supports \`watch(source, cb, options?) signature.`
    );
  }
  return doWatch(source, cb, options);
}
function doWatch(source, cb, options = EMPTY_OBJ) {
  const { immediate, deep, flush, once } = options;
  if (!cb) {
    if (immediate !== void 0) {
      warn$1(
        `watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.`
      );
    }
    if (deep !== void 0) {
      warn$1(
        `watch() "deep" option is only respected when using the watch(source, callback, options?) signature.`
      );
    }
    if (once !== void 0) {
      warn$1(
        `watch() "once" option is only respected when using the watch(source, callback, options?) signature.`
      );
    }
  }
  const baseWatchOptions = extend({}, options);
  if (true) baseWatchOptions.onWarn = warn$1;
  const runsImmediately = cb && immediate || !cb && flush !== "post";
  let ssrCleanup;
  if (isInSSRComponentSetup) {
    if (flush === "sync") {
      const ctx = useSSRContext();
      ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = []);
    } else if (!runsImmediately) {
      const watchStopHandle = () => {
      };
      watchStopHandle.stop = NOOP;
      watchStopHandle.resume = NOOP;
      watchStopHandle.pause = NOOP;
      return watchStopHandle;
    }
  }
  const instance = currentInstance;
  baseWatchOptions.call = (fn, type, args) => callWithAsyncErrorHandling(fn, instance, type, args);
  let isPre = false;
  if (flush === "post") {
    baseWatchOptions.scheduler = (job) => {
      queuePostRenderEffect(job, instance && instance.suspense);
    };
  } else if (flush !== "sync") {
    isPre = true;
    baseWatchOptions.scheduler = (job, isFirstRun) => {
      if (isFirstRun) {
        job();
      } else {
        queueJob(job);
      }
    };
  }
  baseWatchOptions.augmentJob = (job) => {
    if (cb) {
      job.flags |= 4;
    }
    if (isPre) {
      job.flags |= 2;
      if (instance) {
        job.id = instance.uid;
        job.i = instance;
      }
    }
  };
  const watchHandle = watch(source, cb, baseWatchOptions);
  if (isInSSRComponentSetup) {
    if (ssrCleanup) {
      ssrCleanup.push(watchHandle);
    } else if (runsImmediately) {
      watchHandle();
    }
  }
  return watchHandle;
}
function instanceWatch(source, value, options) {
  const publicThis = this.proxy;
  const getter = isString(source) ? source.includes(".") ? createPathGetter(publicThis, source) : () => publicThis[source] : source.bind(publicThis, publicThis);
  let cb;
  if (isFunction(value)) {
    cb = value;
  } else {
    cb = value.handler;
    options = value;
  }
  const reset = setCurrentInstance(this);
  const res = doWatch(getter, cb.bind(publicThis), options);
  reset();
  return res;
}
function createPathGetter(ctx, path) {
  const segments = path.split(".");
  return () => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}
function useTransitionState() {
  const state2 = {
    isMounted: false,
    isLeaving: false,
    isUnmounting: false,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  onMounted(() => {
    state2.isMounted = true;
  });
  onBeforeUnmount(() => {
    state2.isUnmounting = true;
  });
  return state2;
}
function findNonCommentChild(children) {
  let child = children[0];
  if (children.length > 1) {
    let hasFound = false;
    for (const c of children) {
      if (c.type !== Comment) {
        if (hasFound) {
          warn$1(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        child = c;
        hasFound = true;
        if (false) break;
      }
    }
  }
  return child;
}
function getLeavingNodesForType(state2, vnode) {
  const { leavingVNodes } = state2;
  let leavingVNodesCache = leavingVNodes.get(vnode.type);
  if (!leavingVNodesCache) {
    leavingVNodesCache = /* @__PURE__ */ Object.create(null);
    leavingVNodes.set(vnode.type, leavingVNodesCache);
  }
  return leavingVNodesCache;
}
function resolveTransitionHooks(vnode, props, state2, instance, postClone) {
  const {
    appear,
    mode,
    persisted = false,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    onLeaveCancelled,
    onBeforeAppear,
    onAppear,
    onAfterAppear,
    onAppearCancelled
  } = props;
  const key = String(vnode.key);
  const leavingVNodesCache = getLeavingNodesForType(state2, vnode);
  const callHook3 = (hook, args) => {
    hook && callWithAsyncErrorHandling(
      hook,
      instance,
      9,
      args
    );
  };
  const callAsyncHook = (hook, args) => {
    const done = args[1];
    callHook3(hook, args);
    if (isArray(hook)) {
      if (hook.every((hook2) => hook2.length <= 1)) done();
    } else if (hook.length <= 1) {
      done();
    }
  };
  const hooks = {
    mode,
    persisted,
    beforeEnter(el) {
      let hook = onBeforeEnter;
      if (!state2.isMounted) {
        if (appear) {
          hook = onBeforeAppear || onBeforeEnter;
        } else {
          return;
        }
      }
      if (el[leaveCbKey]) {
        el[leaveCbKey](
          true
          /* cancelled */
        );
      }
      const leavingVNode = leavingVNodesCache[key];
      if (leavingVNode && isSameVNodeType(vnode, leavingVNode) && leavingVNode.el[leaveCbKey]) {
        leavingVNode.el[leaveCbKey]();
      }
      callHook3(hook, [el]);
    },
    enter(el) {
      if (!isHmrUpdating && leavingVNodesCache[key] === vnode) return;
      let hook = onEnter;
      let afterHook = onAfterEnter;
      let cancelHook = onEnterCancelled;
      if (!state2.isMounted) {
        if (appear) {
          hook = onAppear || onEnter;
          afterHook = onAfterAppear || onAfterEnter;
          cancelHook = onAppearCancelled || onEnterCancelled;
        } else {
          return;
        }
      }
      let called = false;
      el[enterCbKey] = (cancelled) => {
        if (called) return;
        called = true;
        if (cancelled) {
          callHook3(cancelHook, [el]);
        } else {
          callHook3(afterHook, [el]);
        }
        if (hooks.delayedLeave) {
          hooks.delayedLeave();
        }
        el[enterCbKey] = void 0;
      };
      const done = el[enterCbKey].bind(null, false);
      if (hook) {
        callAsyncHook(hook, [el, done]);
      } else {
        done();
      }
    },
    leave(el, remove2) {
      const key2 = String(vnode.key);
      if (el[enterCbKey]) {
        el[enterCbKey](
          true
          /* cancelled */
        );
      }
      if (state2.isUnmounting) {
        return remove2();
      }
      callHook3(onBeforeLeave, [el]);
      let called = false;
      el[leaveCbKey] = (cancelled) => {
        if (called) return;
        called = true;
        remove2();
        if (cancelled) {
          callHook3(onLeaveCancelled, [el]);
        } else {
          callHook3(onAfterLeave, [el]);
        }
        el[leaveCbKey] = void 0;
        if (leavingVNodesCache[key2] === vnode) {
          delete leavingVNodesCache[key2];
        }
      };
      const done = el[leaveCbKey].bind(null, false);
      leavingVNodesCache[key2] = vnode;
      if (onLeave) {
        callAsyncHook(onLeave, [el, done]);
      } else {
        done();
      }
    },
    clone(vnode2) {
      const hooks2 = resolveTransitionHooks(
        vnode2,
        props,
        state2,
        instance,
        postClone
      );
      if (postClone) postClone(hooks2);
      return hooks2;
    }
  };
  return hooks;
}
function emptyPlaceholder(vnode) {
  if (isKeepAlive(vnode)) {
    vnode = cloneVNode(vnode);
    vnode.children = null;
    return vnode;
  }
}
function getInnerChild$1(vnode) {
  if (!isKeepAlive(vnode)) {
    if (isTeleport(vnode.type) && vnode.children) {
      return findNonCommentChild(vnode.children);
    }
    return vnode;
  }
  if (vnode.component) {
    return vnode.component.subTree;
  }
  const { shapeFlag, children } = vnode;
  if (children) {
    if (shapeFlag & 16) {
      return children[0];
    }
    if (shapeFlag & 32 && isFunction(children.default)) {
      return children.default();
    }
  }
}
function setTransitionHooks(vnode, hooks) {
  if (vnode.shapeFlag & 6 && vnode.component) {
    vnode.transition = hooks;
    setTransitionHooks(vnode.component.subTree, hooks);
  } else if (vnode.shapeFlag & 128) {
    vnode.ssContent.transition = hooks.clone(vnode.ssContent);
    vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
  } else {
    vnode.transition = hooks;
  }
}
function getTransitionRawChildren(children, keepComment = false, parentKey) {
  let ret = [];
  let keyedFragmentCount = 0;
  for (let i = 0; i < children.length; i++) {
    let child = children[i];
    const key = parentKey == null ? child.key : String(parentKey) + String(child.key != null ? child.key : i);
    if (child.type === Fragment) {
      if (child.patchFlag & 128) keyedFragmentCount++;
      ret = ret.concat(
        getTransitionRawChildren(child.children, keepComment, key)
      );
    } else if (keepComment || child.type !== Comment) {
      ret.push(key != null ? cloneVNode(child, { key }) : child);
    }
  }
  if (keyedFragmentCount > 1) {
    for (let i = 0; i < ret.length; i++) {
      ret[i].patchFlag = -2;
    }
  }
  return ret;
}
// @__NO_SIDE_EFFECTS__
function defineComponent(options, extraOptions) {
  return isFunction(options) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    /* @__PURE__ */ (() => extend({ name: options.name }, extraOptions, { setup: options }))()
  ) : options;
}
function markAsyncBoundary(instance) {
  instance.ids = [instance.ids[0] + instance.ids[2]++ + "-", 0, 0];
}
function isTemplateRefKey(refs, key) {
  let desc;
  return !!((desc = Object.getOwnPropertyDescriptor(refs, key)) && !desc.configurable);
}
function setRef(rawRef, oldRawRef, parentSuspense, vnode, isUnmount = false) {
  if (isArray(rawRef)) {
    rawRef.forEach(
      (r, i) => setRef(
        r,
        oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef),
        parentSuspense,
        vnode,
        isUnmount
      )
    );
    return;
  }
  if (isAsyncWrapper(vnode) && !isUnmount) {
    if (vnode.shapeFlag & 512 && vnode.type.__asyncResolved && vnode.component.subTree.component) {
      setRef(rawRef, oldRawRef, parentSuspense, vnode.component.subTree);
    }
    return;
  }
  const refValue = vnode.shapeFlag & 4 ? getComponentPublicInstance(vnode.component) : vnode.el;
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref2 } = rawRef;
  if (!owner) {
    warn$1(
      `Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function.`
    );
    return;
  }
  const oldRef = oldRawRef && oldRawRef.r;
  const refs = owner.refs === EMPTY_OBJ ? owner.refs = {} : owner.refs;
  const setupState = owner.setupState;
  const rawSetupState = toRaw(setupState);
  const canSetSetupRef = setupState === EMPTY_OBJ ? NO : (key) => {
    if (true) {
      if (hasOwn(rawSetupState, key) && !isRef2(rawSetupState[key])) {
        warn$1(
          `Template ref "${key}" used on a non-ref value. It will not work in the production build.`
        );
      }
      if (knownTemplateRefs.has(rawSetupState[key])) {
        return false;
      }
    }
    if (isTemplateRefKey(refs, key)) {
      return false;
    }
    return hasOwn(rawSetupState, key);
  };
  const canSetRef = (ref22, key) => {
    if (knownTemplateRefs.has(ref22)) {
      return false;
    }
    if (key && isTemplateRefKey(refs, key)) {
      return false;
    }
    return true;
  };
  if (oldRef != null && oldRef !== ref2) {
    invalidatePendingSetRef(oldRawRef);
    if (isString(oldRef)) {
      refs[oldRef] = null;
      if (canSetSetupRef(oldRef)) {
        setupState[oldRef] = null;
      }
    } else if (isRef2(oldRef)) {
      const oldRawRefAtom = oldRawRef;
      if (canSetRef(oldRef, oldRawRefAtom.k)) {
        oldRef.value = null;
      }
      if (oldRawRefAtom.k) refs[oldRawRefAtom.k] = null;
    }
  }
  if (isFunction(ref2)) {
    callWithErrorHandling(ref2, owner, 12, [value, refs]);
  } else {
    const _isString = isString(ref2);
    const _isRef = isRef2(ref2);
    if (_isString || _isRef) {
      const doSet = () => {
        if (rawRef.f) {
          const existing = _isString ? canSetSetupRef(ref2) ? setupState[ref2] : refs[ref2] : canSetRef(ref2) || !rawRef.k ? ref2.value : refs[rawRef.k];
          if (isUnmount) {
            isArray(existing) && remove(existing, refValue);
          } else {
            if (!isArray(existing)) {
              if (_isString) {
                refs[ref2] = [refValue];
                if (canSetSetupRef(ref2)) {
                  setupState[ref2] = refs[ref2];
                }
              } else {
                const newVal = [refValue];
                if (canSetRef(ref2, rawRef.k)) {
                  ref2.value = newVal;
                }
                if (rawRef.k) refs[rawRef.k] = newVal;
              }
            } else if (!existing.includes(refValue)) {
              existing.push(refValue);
            }
          }
        } else if (_isString) {
          refs[ref2] = value;
          if (canSetSetupRef(ref2)) {
            setupState[ref2] = value;
          }
        } else if (_isRef) {
          if (canSetRef(ref2, rawRef.k)) {
            ref2.value = value;
          }
          if (rawRef.k) refs[rawRef.k] = value;
        } else if (true) {
          warn$1("Invalid template ref type:", ref2, `(${typeof ref2})`);
        }
      };
      if (value) {
        const job = () => {
          doSet();
          pendingSetRefMap.delete(rawRef);
        };
        job.id = -1;
        pendingSetRefMap.set(rawRef, job);
        queuePostRenderEffect(job, parentSuspense);
      } else {
        invalidatePendingSetRef(rawRef);
        doSet();
      }
    } else if (true) {
      warn$1("Invalid template ref type:", ref2, `(${typeof ref2})`);
    }
  }
}
function invalidatePendingSetRef(rawRef) {
  const pendingSetRef = pendingSetRefMap.get(rawRef);
  if (pendingSetRef) {
    pendingSetRef.flags |= 8;
    pendingSetRefMap.delete(rawRef);
  }
}
function onActivated(hook, target) {
  registerKeepAliveHook(hook, "a", target);
}
function onDeactivated(hook, target) {
  registerKeepAliveHook(hook, "da", target);
}
function registerKeepAliveHook(hook, type, target = currentInstance) {
  const wrappedHook = hook.__wdc || (hook.__wdc = () => {
    let current = target;
    while (current) {
      if (current.isDeactivated) {
        return;
      }
      current = current.parent;
    }
    return hook();
  });
  injectHook(type, wrappedHook, target);
  if (target) {
    let current = target.parent;
    while (current && current.parent) {
      if (isKeepAlive(current.parent.vnode)) {
        injectToKeepAliveRoot(wrappedHook, type, target, current);
      }
      current = current.parent;
    }
  }
}
function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
  const injected = injectHook(
    type,
    hook,
    keepAliveRoot,
    true
    /* prepend */
  );
  onUnmounted(() => {
    remove(keepAliveRoot[type], injected);
  }, target);
}
function injectHook(type, hook, target = currentInstance, prepend = false) {
  if (target) {
    const hooks = target[type] || (target[type] = []);
    const wrappedHook = hook.__weh || (hook.__weh = (...args) => {
      pauseTracking();
      const reset = setCurrentInstance(target);
      const res = callWithAsyncErrorHandling(hook, target, type, args);
      reset();
      resetTracking();
      return res;
    });
    if (prepend) {
      hooks.unshift(wrappedHook);
    } else {
      hooks.push(wrappedHook);
    }
    return wrappedHook;
  } else if (true) {
    const apiName = toHandlerKey(ErrorTypeStrings$1[type].replace(/ hook$/, ""));
    warn$1(
      `${apiName} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
function onErrorCaptured(hook, target = currentInstance) {
  injectHook("ec", hook, target);
}
function resolveComponent(name, maybeSelfReference) {
  return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name;
}
function resolveDynamicComponent(component) {
  if (isString(component)) {
    return resolveAsset(COMPONENTS, component, false) || component;
  } else {
    return component || NULL_DYNAMIC_COMPONENT;
  }
}
function resolveAsset(type, name, warnMissing = true, maybeSelfReference = false) {
  const instance = currentRenderingInstance || currentInstance;
  if (instance) {
    const Component = instance.type;
    if (type === COMPONENTS) {
      const selfName = getComponentName(
        Component,
        false
      );
      if (selfName && (selfName === name || selfName === camelize(name) || selfName === capitalize(camelize(name)))) {
        return Component;
      }
    }
    const res = (
      // local registration
      // check instance[type] first which is resolved for options API
      resolve(instance[type] || Component[type], name) || // global registration
      resolve(instance.appContext[type], name)
    );
    if (!res && maybeSelfReference) {
      return Component;
    }
    if (warnMissing && !res) {
      const extra = type === COMPONENTS ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : ``;
      warn$1(`Failed to resolve ${type.slice(0, -1)}: ${name}${extra}`);
    }
    return res;
  } else if (true) {
    warn$1(
      `resolve${capitalize(type.slice(0, -1))} can only be used in render() or setup().`
    );
  }
}
function resolve(registry, name) {
  return registry && (registry[name] || registry[camelize(name)] || registry[capitalize(camelize(name))]);
}
function renderList(source, renderItem, cache, index) {
  let ret;
  const cached = cache && cache[index];
  const sourceIsArray = isArray(source);
  if (sourceIsArray || isString(source)) {
    const sourceIsReactiveArray = sourceIsArray && isReactive(source);
    let needsWrap = false;
    let isReadonlySource = false;
    if (sourceIsReactiveArray) {
      needsWrap = !isShallow(source);
      isReadonlySource = isReadonly(source);
      source = shallowReadArray(source);
    }
    ret = new Array(source.length);
    for (let i = 0, l = source.length; i < l; i++) {
      ret[i] = renderItem(
        needsWrap ? isReadonlySource ? toReadonly(toReactive(source[i])) : toReactive(source[i]) : source[i],
        i,
        void 0,
        cached && cached[i]
      );
    }
  } else if (typeof source === "number") {
    if (!Number.isInteger(source) || source < 0) {
      warn$1(
        `The v-for range expects a positive integer value but got ${source}.`
      );
      ret = [];
    } else {
      ret = new Array(source);
      for (let i = 0; i < source; i++) {
        ret[i] = renderItem(i + 1, i, void 0, cached && cached[i]);
      }
    }
  } else if (isObject(source)) {
    if (source[Symbol.iterator]) {
      ret = Array.from(
        source,
        (item, i) => renderItem(item, i, void 0, cached && cached[i])
      );
    } else {
      const keys2 = Object.keys(source);
      ret = new Array(keys2.length);
      for (let i = 0, l = keys2.length; i < l; i++) {
        const key = keys2[i];
        ret[i] = renderItem(source[key], key, i, cached && cached[i]);
      }
    }
  } else {
    ret = [];
  }
  if (cache) {
    cache[index] = ret;
  }
  return ret;
}
function renderSlot(slots, name, props = {}, fallback, noSlotted) {
  if (currentRenderingInstance.ce || currentRenderingInstance.parent && isAsyncWrapper(currentRenderingInstance.parent) && currentRenderingInstance.parent.ce) {
    const hasProps = Object.keys(props).length > 0;
    if (name !== "default") props.name = name;
    return openBlock(), createBlock(
      Fragment,
      null,
      [createVNode("slot", props, fallback && fallback())],
      hasProps ? -2 : 64
    );
  }
  let slot = slots[name];
  if (slot && slot.length > 1) {
    warn$1(
      `SSR-optimized slot function detected in a non-SSR-optimized render function. You need to mark this component with $dynamic-slots in the parent template.`
    );
    slot = () => [];
  }
  if (slot && slot._c) {
    slot._d = false;
  }
  openBlock();
  const validSlotContent = slot && ensureValidVNode(slot(props));
  const slotKey = props.key || // slot content array of a dynamic conditional slot may have a branch
  // key attached in the `createSlots` helper, respect that
  validSlotContent && validSlotContent.key;
  const rendered = createBlock(
    Fragment,
    {
      key: (slotKey && !isSymbol(slotKey) ? slotKey : `_${name}`) + // #7256 force differentiate fallback content from actual content
      (!validSlotContent && fallback ? "_fb" : "")
    },
    validSlotContent || (fallback ? fallback() : []),
    validSlotContent && slots._ === 1 ? 64 : -2
  );
  if (!noSlotted && rendered.scopeId) {
    rendered.slotScopeIds = [rendered.scopeId + "-s"];
  }
  if (slot && slot._c) {
    slot._d = true;
  }
  return rendered;
}
function ensureValidVNode(vnodes) {
  return vnodes.some((child) => {
    if (!isVNode(child)) return true;
    if (child.type === Comment) return false;
    if (child.type === Fragment && !ensureValidVNode(child.children))
      return false;
    return true;
  }) ? vnodes : null;
}
function createDevRenderContext(instance) {
  const target = {};
  Object.defineProperty(target, `_`, {
    configurable: true,
    enumerable: false,
    get: () => instance
  });
  Object.keys(publicPropertiesMap).forEach((key) => {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      get: () => publicPropertiesMap[key](instance),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: NOOP
    });
  });
  return target;
}
function exposePropsOnRenderContext(instance) {
  const {
    ctx,
    propsOptions: [propsOptions]
  } = instance;
  if (propsOptions) {
    Object.keys(propsOptions).forEach((key) => {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => instance.props[key],
        set: NOOP
      });
    });
  }
}
function exposeSetupStateOnRenderContext(instance) {
  const { ctx, setupState } = instance;
  Object.keys(toRaw(setupState)).forEach((key) => {
    if (!setupState.__isScriptSetup) {
      if (isReservedPrefix(key[0])) {
        warn$1(
          `setup() return property ${JSON.stringify(
            key
          )} should not start with "$" or "_" which are reserved prefixes for Vue internals.`
        );
        return;
      }
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => setupState[key],
        set: NOOP
      });
    }
  });
}
function normalizePropsOrEmits(props) {
  return isArray(props) ? props.reduce(
    (normalized, p2) => (normalized[p2] = null, normalized),
    {}
  ) : props;
}
function createDuplicateChecker() {
  const cache = /* @__PURE__ */ Object.create(null);
  return (type, key) => {
    if (cache[key]) {
      warn$1(`${type} property "${key}" is already defined in ${cache[key]}.`);
    } else {
      cache[key] = type;
    }
  };
}
function applyOptions(instance) {
  const options = resolveMergedOptions(instance);
  const publicThis = instance.proxy;
  const ctx = instance.ctx;
  shouldCacheAccess = false;
  if (options.beforeCreate) {
    callHook(options.beforeCreate, instance, "bc");
  }
  const {
    // state
    data: dataOptions,
    computed: computedOptions,
    methods,
    watch: watchOptions,
    provide: provideOptions,
    inject: injectOptions,
    // lifecycle
    created,
    beforeMount,
    mounted,
    beforeUpdate,
    updated,
    activated,
    deactivated,
    beforeDestroy,
    beforeUnmount,
    destroyed,
    unmounted,
    render,
    renderTracked,
    renderTriggered,
    errorCaptured,
    serverPrefetch,
    // public API
    expose,
    inheritAttrs,
    // assets
    components,
    directives,
    filters
  } = options;
  const checkDuplicateProperties = true ? createDuplicateChecker() : null;
  if (true) {
    const [propsOptions] = instance.propsOptions;
    if (propsOptions) {
      for (const key in propsOptions) {
        checkDuplicateProperties("Props", key);
      }
    }
  }
  if (injectOptions) {
    resolveInjections(injectOptions, ctx, checkDuplicateProperties);
  }
  if (methods) {
    for (const key in methods) {
      const methodHandler = methods[key];
      if (isFunction(methodHandler)) {
        if (true) {
          Object.defineProperty(ctx, key, {
            value: methodHandler.bind(publicThis),
            configurable: true,
            enumerable: true,
            writable: true
          });
        } else {
          ctx[key] = methodHandler.bind(publicThis);
        }
        if (true) {
          checkDuplicateProperties("Methods", key);
        }
      } else if (true) {
        warn$1(
          `Method "${key}" has type "${typeof methodHandler}" in the component definition. Did you reference the function correctly?`
        );
      }
    }
  }
  if (dataOptions) {
    if (!isFunction(dataOptions)) {
      warn$1(
        `The data option must be a function. Plain object usage is no longer supported.`
      );
    }
    const data = dataOptions.call(publicThis, publicThis);
    if (isPromise(data)) {
      warn$1(
        `data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>.`
      );
    }
    if (!isObject(data)) {
      warn$1(`data() should return an object.`);
    } else {
      instance.data = reactive(data);
      if (true) {
        for (const key in data) {
          checkDuplicateProperties("Data", key);
          if (!isReservedPrefix(key[0])) {
            Object.defineProperty(ctx, key, {
              configurable: true,
              enumerable: true,
              get: () => data[key],
              set: NOOP
            });
          }
        }
      }
    }
  }
  shouldCacheAccess = true;
  if (computedOptions) {
    for (const key in computedOptions) {
      const opt = computedOptions[key];
      const get = isFunction(opt) ? opt.bind(publicThis, publicThis) : isFunction(opt.get) ? opt.get.bind(publicThis, publicThis) : NOOP;
      if (get === NOOP) {
        warn$1(`Computed property "${key}" has no getter.`);
      }
      const set = !isFunction(opt) && isFunction(opt.set) ? opt.set.bind(publicThis) : true ? () => {
        warn$1(
          `Write operation failed: computed property "${key}" is readonly.`
        );
      } : NOOP;
      const c = computed2({
        get,
        set
      });
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => c.value,
        set: (v) => c.value = v
      });
      if (true) {
        checkDuplicateProperties("Computed", key);
      }
    }
  }
  if (watchOptions) {
    for (const key in watchOptions) {
      createWatcher(watchOptions[key], ctx, publicThis, key);
    }
  }
  if (provideOptions) {
    const provides = isFunction(provideOptions) ? provideOptions.call(publicThis) : provideOptions;
    Reflect.ownKeys(provides).forEach((key) => {
      provide(key, provides[key]);
    });
  }
  if (created) {
    callHook(created, instance, "c");
  }
  function registerLifecycleHook(register, hook) {
    if (isArray(hook)) {
      hook.forEach((_hook) => register(_hook.bind(publicThis)));
    } else if (hook) {
      register(hook.bind(publicThis));
    }
  }
  registerLifecycleHook(onBeforeMount, beforeMount);
  registerLifecycleHook(onMounted, mounted);
  registerLifecycleHook(onBeforeUpdate, beforeUpdate);
  registerLifecycleHook(onUpdated, updated);
  registerLifecycleHook(onActivated, activated);
  registerLifecycleHook(onDeactivated, deactivated);
  registerLifecycleHook(onErrorCaptured, errorCaptured);
  registerLifecycleHook(onRenderTracked, renderTracked);
  registerLifecycleHook(onRenderTriggered, renderTriggered);
  registerLifecycleHook(onBeforeUnmount, beforeUnmount);
  registerLifecycleHook(onUnmounted, unmounted);
  registerLifecycleHook(onServerPrefetch, serverPrefetch);
  if (isArray(expose)) {
    if (expose.length) {
      const exposed = instance.exposed || (instance.exposed = {});
      expose.forEach((key) => {
        Object.defineProperty(exposed, key, {
          get: () => publicThis[key],
          set: (val) => publicThis[key] = val,
          enumerable: true
        });
      });
    } else if (!instance.exposed) {
      instance.exposed = {};
    }
  }
  if (render && instance.render === NOOP) {
    instance.render = render;
  }
  if (inheritAttrs != null) {
    instance.inheritAttrs = inheritAttrs;
  }
  if (components) instance.components = components;
  if (directives) instance.directives = directives;
  if (serverPrefetch) {
    markAsyncBoundary(instance);
  }
}
function resolveInjections(injectOptions, ctx, checkDuplicateProperties = NOOP) {
  if (isArray(injectOptions)) {
    injectOptions = normalizeInject(injectOptions);
  }
  for (const key in injectOptions) {
    const opt = injectOptions[key];
    let injected;
    if (isObject(opt)) {
      if ("default" in opt) {
        injected = inject(
          opt.from || key,
          opt.default,
          true
        );
      } else {
        injected = inject(opt.from || key);
      }
    } else {
      injected = inject(opt);
    }
    if (isRef2(injected)) {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => injected.value,
        set: (v) => injected.value = v
      });
    } else {
      ctx[key] = injected;
    }
    if (true) {
      checkDuplicateProperties("Inject", key);
    }
  }
}
function callHook(hook, instance, type) {
  callWithAsyncErrorHandling(
    isArray(hook) ? hook.map((h2) => h2.bind(instance.proxy)) : hook.bind(instance.proxy),
    instance,
    type
  );
}
function createWatcher(raw, ctx, publicThis, key) {
  let getter = key.includes(".") ? createPathGetter(publicThis, key) : () => publicThis[key];
  if (isString(raw)) {
    const handler = ctx[raw];
    if (isFunction(handler)) {
      {
        watch2(getter, handler);
      }
    } else if (true) {
      warn$1(`Invalid watch handler specified by key "${raw}"`, handler);
    }
  } else if (isFunction(raw)) {
    {
      watch2(getter, raw.bind(publicThis));
    }
  } else if (isObject(raw)) {
    if (isArray(raw)) {
      raw.forEach((r) => createWatcher(r, ctx, publicThis, key));
    } else {
      const handler = isFunction(raw.handler) ? raw.handler.bind(publicThis) : ctx[raw.handler];
      if (isFunction(handler)) {
        watch2(getter, handler, raw);
      } else if (true) {
        warn$1(`Invalid watch handler specified by key "${raw.handler}"`, handler);
      }
    }
  } else if (true) {
    warn$1(`Invalid watch option: "${key}"`, raw);
  }
}
function resolveMergedOptions(instance) {
  const base = instance.type;
  const { mixins, extends: extendsOptions } = base;
  const {
    mixins: globalMixins,
    optionsCache: cache,
    config: { optionMergeStrategies }
  } = instance.appContext;
  const cached = cache.get(base);
  let resolved;
  if (cached) {
    resolved = cached;
  } else if (!globalMixins.length && !mixins && !extendsOptions) {
    {
      resolved = base;
    }
  } else {
    resolved = {};
    if (globalMixins.length) {
      globalMixins.forEach(
        (m) => mergeOptions(resolved, m, optionMergeStrategies, true)
      );
    }
    mergeOptions(resolved, base, optionMergeStrategies);
  }
  if (isObject(base)) {
    cache.set(base, resolved);
  }
  return resolved;
}
function mergeOptions(to, from, strats, asMixin = false) {
  const { mixins, extends: extendsOptions } = from;
  if (extendsOptions) {
    mergeOptions(to, extendsOptions, strats, true);
  }
  if (mixins) {
    mixins.forEach(
      (m) => mergeOptions(to, m, strats, true)
    );
  }
  for (const key in from) {
    if (asMixin && key === "expose") {
      warn$1(
        `"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.`
      );
    } else {
      const strat = internalOptionMergeStrats[key] || strats && strats[key];
      to[key] = strat ? strat(to[key], from[key]) : from[key];
    }
  }
  return to;
}
function mergeDataFn(to, from) {
  if (!from) {
    return to;
  }
  if (!to) {
    return from;
  }
  return function mergedDataFn() {
    return extend(
      isFunction(to) ? to.call(this, this) : to,
      isFunction(from) ? from.call(this, this) : from
    );
  };
}
function mergeInject(to, from) {
  return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
}
function normalizeInject(raw) {
  if (isArray(raw)) {
    const res = {};
    for (let i = 0; i < raw.length; i++) {
      res[raw[i]] = raw[i];
    }
    return res;
  }
  return raw;
}
function mergeAsArray(to, from) {
  return to ? [...new Set([].concat(to, from))] : from;
}
function mergeObjectOptions(to, from) {
  return to ? extend(/* @__PURE__ */ Object.create(null), to, from) : from;
}
function mergeEmitsOrPropsOptions(to, from) {
  if (to) {
    if (isArray(to) && isArray(from)) {
      return [.../* @__PURE__ */ new Set([...to, ...from])];
    }
    return extend(
      /* @__PURE__ */ Object.create(null),
      normalizePropsOrEmits(to),
      normalizePropsOrEmits(from != null ? from : {})
    );
  } else {
    return from;
  }
}
function mergeWatchOptions(to, from) {
  if (!to) return from;
  if (!from) return to;
  const merged = extend(/* @__PURE__ */ Object.create(null), to);
  for (const key in from) {
    merged[key] = mergeAsArray(to[key], from[key]);
  }
  return merged;
}
function createAppContext() {
  return {
    app: null,
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: /* @__PURE__ */ Object.create(null),
    optionsCache: /* @__PURE__ */ new WeakMap(),
    propsCache: /* @__PURE__ */ new WeakMap(),
    emitsCache: /* @__PURE__ */ new WeakMap()
  };
}
function createAppAPI(render, hydrate) {
  return function createApp2(rootComponent, rootProps = null) {
    if (!isFunction(rootComponent)) {
      rootComponent = extend({}, rootComponent);
    }
    if (rootProps != null && !isObject(rootProps)) {
      warn$1(`root props passed to app.mount() must be an object.`);
      rootProps = null;
    }
    const context = createAppContext();
    const installedPlugins = /* @__PURE__ */ new WeakSet();
    const pluginCleanupFns = [];
    let isMounted = false;
    const app = context.app = {
      _uid: uid$1++,
      _component: rootComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      _instance: null,
      version,
      get config() {
        return context.config;
      },
      set config(v) {
        if (true) {
          warn$1(
            `app.config cannot be replaced. Modify individual options instead.`
          );
        }
      },
      use(plugin, ...options) {
        if (installedPlugins.has(plugin)) {
          warn$1(`Plugin has already been applied to target app.`);
        } else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin);
          plugin.install(app, ...options);
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin);
          plugin(app, ...options);
        } else if (true) {
          warn$1(
            `A plugin must either be a function or an object with an "install" function.`
          );
        }
        return app;
      },
      mixin(mixin) {
        if (__VUE_OPTIONS_API__) {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin);
          } else if (true) {
            warn$1(
              "Mixin has already been applied to target app" + (mixin.name ? `: ${mixin.name}` : "")
            );
          }
        } else if (true) {
          warn$1("Mixins are only available in builds supporting Options API");
        }
        return app;
      },
      component(name, component) {
        if (true) {
          validateComponentName(name, context.config);
        }
        if (!component) {
          return context.components[name];
        }
        if (context.components[name]) {
          warn$1(`Component "${name}" has already been registered in target app.`);
        }
        context.components[name] = component;
        return app;
      },
      directive(name, directive) {
        if (true) {
          validateDirectiveName(name);
        }
        if (!directive) {
          return context.directives[name];
        }
        if (context.directives[name]) {
          warn$1(`Directive "${name}" has already been registered in target app.`);
        }
        context.directives[name] = directive;
        return app;
      },
      mount(rootContainer, isHydrate, namespace) {
        if (!isMounted) {
          if (rootContainer.__vue_app__) {
            warn$1(
              `There is already an app instance mounted on the host container.
 If you want to mount another app on the same host container, you need to unmount the previous app by calling \`app.unmount()\` first.`
            );
          }
          const vnode = app._ceVNode || createVNode(rootComponent, rootProps);
          vnode.appContext = context;
          if (namespace === true) {
            namespace = "svg";
          } else if (namespace === false) {
            namespace = void 0;
          }
          if (true) {
            context.reload = () => {
              const cloned = cloneVNode(vnode);
              cloned.el = null;
              render(cloned, rootContainer, namespace);
            };
          }
          if (isHydrate && hydrate) {
            hydrate(vnode, rootContainer);
          } else {
            render(vnode, rootContainer, namespace);
          }
          isMounted = true;
          app._container = rootContainer;
          rootContainer.__vue_app__ = app;
          if (true) {
            app._instance = vnode.component;
            devtoolsInitApp(app, version);
          }
          return getComponentPublicInstance(vnode.component);
        } else if (true) {
          warn$1(
            `App has already been mounted.
If you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. \`const createMyApp = () => createApp(App)\``
          );
        }
      },
      onUnmount(cleanupFn) {
        if (typeof cleanupFn !== "function") {
          warn$1(
            `Expected function as first argument to app.onUnmount(), but got ${typeof cleanupFn}`
          );
        }
        pluginCleanupFns.push(cleanupFn);
      },
      unmount() {
        if (isMounted) {
          callWithAsyncErrorHandling(
            pluginCleanupFns,
            app._instance,
            16
          );
          render(null, app._container);
          if (true) {
            app._instance = null;
            devtoolsUnmountApp(app);
          }
          delete app._container.__vue_app__;
        } else if (true) {
          warn$1(`Cannot unmount an app that is not mounted.`);
        }
      },
      provide(key, value) {
        if (key in context.provides) {
          if (hasOwn(context.provides, key)) {
            warn$1(
              `App already provides property with key "${String(key)}". It will be overwritten with the new value.`
            );
          } else {
            warn$1(
              `App already provides property with key "${String(key)}" inherited from its parent element. It will be overwritten with the new value.`
            );
          }
        }
        context.provides[key] = value;
        return app;
      },
      runWithContext(fn) {
        const lastApp = currentApp;
        currentApp = app;
        try {
          return fn();
        } finally {
          currentApp = lastApp;
        }
      }
    };
    return app;
  };
}
function emit(instance, event, ...rawArgs) {
  if (instance.isUnmounted) return;
  const props = instance.vnode.props || EMPTY_OBJ;
  if (true) {
    const {
      emitsOptions,
      propsOptions: [propsOptions]
    } = instance;
    if (emitsOptions) {
      if (!(event in emitsOptions) && true) {
        if (!propsOptions || !(toHandlerKey(camelize(event)) in propsOptions)) {
          warn$1(
            `Component emitted event "${event}" but it is neither declared in the emits option nor as an "${toHandlerKey(camelize(event))}" prop.`
          );
        }
      } else {
        const validator = emitsOptions[event];
        if (isFunction(validator)) {
          const isValid = validator(...rawArgs);
          if (!isValid) {
            warn$1(
              `Invalid event arguments: event validation failed for event "${event}".`
            );
          }
        }
      }
    }
  }
  let args = rawArgs;
  const isModelListener2 = event.startsWith("update:");
  const modifiers = isModelListener2 && getModelModifiers(props, event.slice(7));
  if (modifiers) {
    if (modifiers.trim) {
      args = rawArgs.map((a) => isString(a) ? a.trim() : a);
    }
    if (modifiers.number) {
      args = rawArgs.map(looseToNumber);
    }
  }
  if (true) {
    devtoolsComponentEmit(instance, event, args);
  }
  if (true) {
    const lowerCaseEvent = event.toLowerCase();
    if (lowerCaseEvent !== event && props[toHandlerKey(lowerCaseEvent)]) {
      warn$1(
        `Event "${lowerCaseEvent}" is emitted in component ${formatComponentName(
          instance,
          instance.type
        )} but the handler is registered for "${event}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${hyphenate(
          event
        )}" instead of "${event}".`
      );
    }
  }
  let handlerName;
  let handler = props[handlerName = toHandlerKey(event)] || // also try camelCase event handler (#2249)
  props[handlerName = toHandlerKey(camelize(event))];
  if (!handler && isModelListener2) {
    handler = props[handlerName = toHandlerKey(hyphenate(event))];
  }
  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      6,
      args
    );
  }
  const onceHandler = props[handlerName + `Once`];
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {};
    } else if (instance.emitted[handlerName]) {
      return;
    }
    instance.emitted[handlerName] = true;
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      6,
      args
    );
  }
}
function normalizeEmitsOptions(comp, appContext, asMixin = false) {
  const cache = __VUE_OPTIONS_API__ && asMixin ? mixinEmitsCache : appContext.emitsCache;
  const cached = cache.get(comp);
  if (cached !== void 0) {
    return cached;
  }
  const raw = comp.emits;
  let normalized = {};
  let hasExtends = false;
  if (__VUE_OPTIONS_API__ && !isFunction(comp)) {
    const extendEmits = (raw2) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw2, appContext, true);
      if (normalizedFromExtend) {
        hasExtends = true;
        extend(normalized, normalizedFromExtend);
      }
    };
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendEmits);
    }
    if (comp.extends) {
      extendEmits(comp.extends);
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendEmits);
    }
  }
  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, null);
    }
    return null;
  }
  if (isArray(raw)) {
    raw.forEach((key) => normalized[key] = null);
  } else {
    extend(normalized, raw);
  }
  if (isObject(comp)) {
    cache.set(comp, normalized);
  }
  return normalized;
}
function isEmitListener(options, key) {
  if (!options || !isOn(key)) {
    return false;
  }
  key = key.slice(2).replace(/Once$/, "");
  return hasOwn(options, key[0].toLowerCase() + key.slice(1)) || hasOwn(options, hyphenate(key)) || hasOwn(options, key);
}
function markAttrsAccessed() {
  accessedAttrs = true;
}
function renderComponentRoot(instance) {
  const {
    type: Component,
    vnode,
    proxy,
    withProxy,
    propsOptions: [propsOptions],
    slots,
    attrs,
    emit: emit2,
    render,
    renderCache,
    props,
    data,
    setupState,
    ctx,
    inheritAttrs
  } = instance;
  const prev = setCurrentRenderingInstance(instance);
  let result;
  let fallthroughAttrs;
  if (true) {
    accessedAttrs = false;
  }
  try {
    if (vnode.shapeFlag & 4) {
      const proxyToUse = withProxy || proxy;
      const thisProxy = setupState.__isScriptSetup ? new Proxy(proxyToUse, {
        get(target, key, receiver) {
          warn$1(
            `Property '${String(
              key
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          );
          return Reflect.get(target, key, receiver);
        }
      }) : proxyToUse;
      result = normalizeVNode(
        render.call(
          thisProxy,
          proxyToUse,
          renderCache,
          true ? shallowReadonly(props) : props,
          setupState,
          data,
          ctx
        )
      );
      fallthroughAttrs = attrs;
    } else {
      const render2 = Component;
      if (attrs === props) {
        markAttrsAccessed();
      }
      result = normalizeVNode(
        render2.length > 1 ? render2(
          true ? shallowReadonly(props) : props,
          true ? {
            get attrs() {
              markAttrsAccessed();
              return shallowReadonly(attrs);
            },
            slots,
            emit: emit2
          } : { attrs, slots, emit: emit2 }
        ) : render2(
          true ? shallowReadonly(props) : props,
          null
        )
      );
      fallthroughAttrs = Component.props ? attrs : getFunctionalFallthrough(attrs);
    }
  } catch (err) {
    blockStack.length = 0;
    handleError(err, instance, 1);
    result = createVNode(Comment);
  }
  let root = result;
  let setRoot = void 0;
  if (result.patchFlag > 0 && result.patchFlag & 2048) {
    [root, setRoot] = getChildRoot(result);
  }
  if (fallthroughAttrs && inheritAttrs !== false) {
    const keys2 = Object.keys(fallthroughAttrs);
    const { shapeFlag } = root;
    if (keys2.length) {
      if (shapeFlag & (1 | 6)) {
        if (propsOptions && keys2.some(isModelListener)) {
          fallthroughAttrs = filterModelListeners(
            fallthroughAttrs,
            propsOptions
          );
        }
        root = cloneVNode(root, fallthroughAttrs, false, true);
      } else if (!accessedAttrs && root.type !== Comment) {
        const allAttrs = Object.keys(attrs);
        const eventAttrs = [];
        const extraAttrs = [];
        for (let i = 0, l = allAttrs.length; i < l; i++) {
          const key = allAttrs[i];
          if (isOn(key)) {
            if (!isModelListener(key)) {
              eventAttrs.push(key[2].toLowerCase() + key.slice(3));
            }
          } else {
            extraAttrs.push(key);
          }
        }
        if (extraAttrs.length) {
          warn$1(
            `Extraneous non-props attributes (${extraAttrs.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text or teleport root nodes.`
          );
        }
        if (eventAttrs.length) {
          warn$1(
            `Extraneous non-emits event listeners (${eventAttrs.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
          );
        }
      }
    }
  }
  if (vnode.dirs) {
    if (!isElementRoot(root)) {
      warn$1(
        `Runtime directive used on component with non-element root node. The directives will not function as intended.`
      );
    }
    root = cloneVNode(root, null, false, true);
    root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
  }
  if (vnode.transition) {
    if (!isElementRoot(root)) {
      warn$1(
        `Component inside <Transition> renders non-element root node that cannot be animated.`
      );
    }
    setTransitionHooks(root, vnode.transition);
  }
  if (setRoot) {
    setRoot(root);
  } else {
    result = root;
  }
  setCurrentRenderingInstance(prev);
  return result;
}
function filterSingleRoot(children, recurse = true) {
  let singleRoot;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isVNode(child)) {
      if (child.type !== Comment || child.children === "v-if") {
        if (singleRoot) {
          return;
        } else {
          singleRoot = child;
          if (recurse && singleRoot.patchFlag > 0 && singleRoot.patchFlag & 2048) {
            return filterSingleRoot(singleRoot.children);
          }
        }
      }
    } else {
      return;
    }
  }
  return singleRoot;
}
function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
  const { props: prevProps, children: prevChildren, component } = prevVNode;
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
  const emits = component.emitsOptions;
  if ((prevChildren || nextChildren) && isHmrUpdating) {
    return true;
  }
  if (nextVNode.dirs || nextVNode.transition) {
    return true;
  }
  if (optimized && patchFlag >= 0) {
    if (patchFlag & 1024) {
      return true;
    }
    if (patchFlag & 16) {
      if (!prevProps) {
        return !!nextProps;
      }
      return hasPropsChanged(prevProps, nextProps, emits);
    } else if (patchFlag & 8) {
      const dynamicProps = nextVNode.dynamicProps;
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i];
        if (hasPropValueChanged(nextProps, prevProps, key) && !isEmitListener(emits, key)) {
          return true;
        }
      }
    }
  } else {
    if (prevChildren || nextChildren) {
      if (!nextChildren || !nextChildren.$stable) {
        return true;
      }
    }
    if (prevProps === nextProps) {
      return false;
    }
    if (!prevProps) {
      return !!nextProps;
    }
    if (!nextProps) {
      return true;
    }
    return hasPropsChanged(prevProps, nextProps, emits);
  }
  return false;
}
function hasPropsChanged(prevProps, nextProps, emitsOptions) {
  const nextKeys = Object.keys(nextProps);
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (hasPropValueChanged(nextProps, prevProps, key) && !isEmitListener(emitsOptions, key)) {
      return true;
    }
  }
  return false;
}
function hasPropValueChanged(nextProps, prevProps, key) {
  const nextProp = nextProps[key];
  const prevProp = prevProps[key];
  if (key === "style" && isObject(nextProp) && isObject(prevProp)) {
    return !looseEqual(nextProp, prevProp);
  }
  return nextProp !== prevProp;
}
function updateHOCHostEl({ vnode, parent, suspense }, el) {
  while (parent) {
    const root = parent.subTree;
    if (root.suspense && root.suspense.activeBranch === vnode) {
      root.suspense.vnode.el = root.el = el;
      vnode = root;
    }
    if (root === vnode) {
      (vnode = parent.vnode).el = el;
      parent = parent.parent;
    } else {
      break;
    }
  }
  if (suspense && suspense.activeBranch === vnode) {
    suspense.vnode.el = el;
  }
}
function initProps(instance, rawProps, isStateful, isSSR = false) {
  const props = {};
  const attrs = createInternalObject();
  instance.propsDefaults = /* @__PURE__ */ Object.create(null);
  setFullProps(instance, rawProps, props, attrs);
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = void 0;
    }
  }
  if (true) {
    validateProps(rawProps || {}, props, instance);
  }
  if (isStateful) {
    instance.props = isSSR ? props : shallowReactive(props);
  } else {
    if (!instance.type.props) {
      instance.props = attrs;
    } else {
      instance.props = props;
    }
  }
  instance.attrs = attrs;
}
function isInHmrContext(instance) {
  while (instance) {
    if (instance.type.__hmrId) return true;
    instance = instance.parent;
  }
}
function updateProps(instance, rawProps, rawPrevProps, optimized) {
  const {
    props,
    attrs,
    vnode: { patchFlag }
  } = instance;
  const rawCurrentProps = toRaw(props);
  const [options] = instance.propsOptions;
  let hasAttrsChanged = false;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !isInHmrContext(instance) && (optimized || patchFlag > 0) && !(patchFlag & 16)
  ) {
    if (patchFlag & 8) {
      const propsToUpdate = instance.vnode.dynamicProps;
      for (let i = 0; i < propsToUpdate.length; i++) {
        let key = propsToUpdate[i];
        if (isEmitListener(instance.emitsOptions, key)) {
          continue;
        }
        const value = rawProps[key];
        if (options) {
          if (hasOwn(attrs, key)) {
            if (value !== attrs[key]) {
              attrs[key] = value;
              hasAttrsChanged = true;
            }
          } else {
            const camelizedKey = camelize(key);
            props[camelizedKey] = resolvePropValue(
              options,
              rawCurrentProps,
              camelizedKey,
              value,
              instance,
              false
            );
          }
        } else {
          if (value !== attrs[key]) {
            attrs[key] = value;
            hasAttrsChanged = true;
          }
        }
      }
    }
  } else {
    if (setFullProps(instance, rawProps, props, attrs)) {
      hasAttrsChanged = true;
    }
    let kebabKey;
    for (const key in rawCurrentProps) {
      if (!rawProps || // for camelCase
      !hasOwn(rawProps, key) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey))) {
        if (options) {
          if (rawPrevProps && // for camelCase
          (rawPrevProps[key] !== void 0 || // for kebab-case
          rawPrevProps[kebabKey] !== void 0)) {
            props[key] = resolvePropValue(
              options,
              rawCurrentProps,
              key,
              void 0,
              instance,
              true
            );
          }
        } else {
          delete props[key];
        }
      }
    }
    if (attrs !== rawCurrentProps) {
      for (const key in attrs) {
        if (!rawProps || !hasOwn(rawProps, key) && true) {
          delete attrs[key];
          hasAttrsChanged = true;
        }
      }
    }
  }
  if (hasAttrsChanged) {
    trigger(instance.attrs, "set", "");
  }
  if (true) {
    validateProps(rawProps || {}, props, instance);
  }
}
function setFullProps(instance, rawProps, props, attrs) {
  const [options, needCastKeys] = instance.propsOptions;
  let hasAttrsChanged = false;
  let rawCastValues;
  if (rawProps) {
    for (let key in rawProps) {
      if (isReservedProp(key)) {
        continue;
      }
      const value = rawProps[key];
      let camelKey;
      if (options && hasOwn(options, camelKey = camelize(key))) {
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value;
        } else {
          (rawCastValues || (rawCastValues = {}))[camelKey] = value;
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value;
          hasAttrsChanged = true;
        }
      }
    }
  }
  if (needCastKeys) {
    const rawCurrentProps = toRaw(props);
    const castValues = rawCastValues || EMPTY_OBJ;
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i];
      props[key] = resolvePropValue(
        options,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      );
    }
  }
  return hasAttrsChanged;
}
function resolvePropValue(options, props, key, value, instance, isAbsent) {
  const opt = options[key];
  if (opt != null) {
    const hasDefault = hasOwn(opt, "default");
    if (hasDefault && value === void 0) {
      const defaultValue = opt.default;
      if (opt.type !== Function && !opt.skipFactory && isFunction(defaultValue)) {
        const { propsDefaults } = instance;
        if (key in propsDefaults) {
          value = propsDefaults[key];
        } else {
          const reset = setCurrentInstance(instance);
          value = propsDefaults[key] = defaultValue.call(
            null,
            props
          );
          reset();
        }
      } else {
        value = defaultValue;
      }
      if (instance.ce) {
        instance.ce._setProp(key, value);
      }
    }
    if (opt[
      0
      /* shouldCast */
    ]) {
      if (isAbsent && !hasDefault) {
        value = false;
      } else if (opt[
        1
        /* shouldCastTrue */
      ] && (value === "" || value === hyphenate(key))) {
        value = true;
      }
    }
  }
  return value;
}
function normalizePropsOptions(comp, appContext, asMixin = false) {
  const cache = __VUE_OPTIONS_API__ && asMixin ? mixinPropsCache : appContext.propsCache;
  const cached = cache.get(comp);
  if (cached) {
    return cached;
  }
  const raw = comp.props;
  const normalized = {};
  const needCastKeys = [];
  let hasExtends = false;
  if (__VUE_OPTIONS_API__ && !isFunction(comp)) {
    const extendProps = (raw2) => {
      hasExtends = true;
      const [props, keys2] = normalizePropsOptions(raw2, appContext, true);
      extend(normalized, props);
      if (keys2) needCastKeys.push(...keys2);
    };
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendProps);
    }
    if (comp.extends) {
      extendProps(comp.extends);
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendProps);
    }
  }
  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, EMPTY_ARR);
    }
    return EMPTY_ARR;
  }
  if (isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      if (!isString(raw[i])) {
        warn$1(`props must be strings when using array syntax.`, raw[i]);
      }
      const normalizedKey = camelize(raw[i]);
      if (validatePropName(normalizedKey)) {
        normalized[normalizedKey] = EMPTY_OBJ;
      }
    }
  } else if (raw) {
    if (!isObject(raw)) {
      warn$1(`invalid props options`, raw);
    }
    for (const key in raw) {
      const normalizedKey = camelize(key);
      if (validatePropName(normalizedKey)) {
        const opt = raw[key];
        const prop = normalized[normalizedKey] = isArray(opt) || isFunction(opt) ? { type: opt } : extend({}, opt);
        const propType = prop.type;
        let shouldCast = false;
        let shouldCastTrue = true;
        if (isArray(propType)) {
          for (let index = 0; index < propType.length; ++index) {
            const type = propType[index];
            const typeName = isFunction(type) && type.name;
            if (typeName === "Boolean") {
              shouldCast = true;
              break;
            } else if (typeName === "String") {
              shouldCastTrue = false;
            }
          }
        } else {
          shouldCast = isFunction(propType) && propType.name === "Boolean";
        }
        prop[
          0
          /* shouldCast */
        ] = shouldCast;
        prop[
          1
          /* shouldCastTrue */
        ] = shouldCastTrue;
        if (shouldCast || hasOwn(prop, "default")) {
          needCastKeys.push(normalizedKey);
        }
      }
    }
  }
  const res = [normalized, needCastKeys];
  if (isObject(comp)) {
    cache.set(comp, res);
  }
  return res;
}
function validatePropName(key) {
  if (key[0] !== "$" && !isReservedProp(key)) {
    return true;
  } else if (true) {
    warn$1(`Invalid prop name: "${key}" is a reserved property.`);
  }
  return false;
}
function getType(ctor) {
  if (ctor === null) {
    return "null";
  }
  if (typeof ctor === "function") {
    return ctor.name || "";
  } else if (typeof ctor === "object") {
    const name = ctor.constructor && ctor.constructor.name;
    return name || "";
  }
  return "";
}
function validateProps(rawProps, props, instance) {
  const resolvedValues = toRaw(props);
  const options = instance.propsOptions[0];
  const camelizePropsKey = Object.keys(rawProps).map((key) => camelize(key));
  for (const key in options) {
    let opt = options[key];
    if (opt == null) continue;
    validateProp(
      key,
      resolvedValues[key],
      opt,
      true ? shallowReadonly(resolvedValues) : resolvedValues,
      !camelizePropsKey.includes(key)
    );
  }
}
function validateProp(name, value, prop, props, isAbsent) {
  const { type, required, validator, skipCheck } = prop;
  if (required && isAbsent) {
    warn$1('Missing required prop: "' + name + '"');
    return;
  }
  if (value == null && !required) {
    return;
  }
  if (type != null && type !== true && !skipCheck) {
    let isValid = false;
    const types = isArray(type) ? type : [type];
    const expectedTypes = [];
    for (let i = 0; i < types.length && !isValid; i++) {
      const { valid, expectedType } = assertType(value, types[i]);
      expectedTypes.push(expectedType || "");
      isValid = valid;
    }
    if (!isValid) {
      warn$1(getInvalidTypeMessage(name, value, expectedTypes));
      return;
    }
  }
  if (validator && !validator(value, props)) {
    warn$1('Invalid prop: custom validator check failed for prop "' + name + '".');
  }
}
function assertType(value, type) {
  let valid;
  const expectedType = getType(type);
  if (expectedType === "null") {
    valid = value === null;
  } else if (isSimpleType(expectedType)) {
    const t = typeof value;
    valid = t === expectedType.toLowerCase();
    if (!valid && t === "object") {
      valid = value instanceof type;
    }
  } else if (expectedType === "Object") {
    valid = isObject(value);
  } else if (expectedType === "Array") {
    valid = isArray(value);
  } else {
    valid = value instanceof type;
  }
  return {
    valid,
    expectedType
  };
}
function getInvalidTypeMessage(name, value, expectedTypes) {
  if (expectedTypes.length === 0) {
    return `Prop type [] for prop "${name}" won't match anything. Did you mean to use type Array instead?`;
  }
  let message = `Invalid prop: type check failed for prop "${name}". Expected ${expectedTypes.map(capitalize).join(" | ")}`;
  const expectedType = expectedTypes[0];
  const receivedType = toRawType(value);
  const expectedValue = styleValue(value, expectedType);
  const receivedValue = styleValue(value, receivedType);
  if (expectedTypes.length === 1 && isExplicable(expectedType) && isCoercible(expectedType, receivedType)) {
    message += ` with value ${expectedValue}`;
  }
  message += `, got ${receivedType} `;
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`;
  }
  return message;
}
function styleValue(value, type) {
  if (isSymbol(value)) {
    return value.toString();
  } else if (type === "String") {
    return `"${value}"`;
  } else if (type === "Number") {
    return `${Number(value)}`;
  } else {
    return `${value}`;
  }
}
function isExplicable(type) {
  const explicitTypes = ["string", "number", "boolean"];
  return explicitTypes.some((elem) => type.toLowerCase() === elem);
}
function isCoercible(...args) {
  return args.every((elem) => {
    const value = elem.toLowerCase();
    return value !== "boolean" && value !== "symbol";
  });
}
function startMeasure(instance, type) {
  if (instance.appContext.config.performance && isSupported()) {
    perf.mark(`vue-${type}-${instance.uid}`);
  }
  if (true) {
    devtoolsPerfStart(instance, type, isSupported() ? perf.now() : Date.now());
  }
}
function endMeasure(instance, type) {
  if (instance.appContext.config.performance && isSupported()) {
    const startTag = `vue-${type}-${instance.uid}`;
    const endTag = startTag + `:end`;
    const measureName = `<${formatComponentName(instance, instance.type)}> ${type}`;
    perf.mark(endTag);
    perf.measure(measureName, startTag, endTag);
    perf.clearMeasures(measureName);
    perf.clearMarks(startTag);
    perf.clearMarks(endTag);
  }
  if (true) {
    devtoolsPerfEnd(instance, type, isSupported() ? perf.now() : Date.now());
  }
}
function isSupported() {
  if (supported !== void 0) {
    return supported;
  }
  if (typeof window !== "undefined" && window.performance) {
    supported = true;
    perf = window.performance;
  } else {
    supported = false;
  }
  return supported;
}
function initFeatureFlags() {
  const needWarn = [];
  if (typeof __VUE_OPTIONS_API__ !== "boolean") {
    needWarn.push(`__VUE_OPTIONS_API__`);
    getGlobalThis().__VUE_OPTIONS_API__ = true;
  }
  if (typeof __VUE_PROD_DEVTOOLS__ !== "boolean") {
    needWarn.push(`__VUE_PROD_DEVTOOLS__`);
    getGlobalThis().__VUE_PROD_DEVTOOLS__ = false;
  }
  if (typeof __VUE_PROD_HYDRATION_MISMATCH_DETAILS__ !== "boolean") {
    needWarn.push(`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`);
    getGlobalThis().__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false;
  }
  if (needWarn.length) {
    const multi = needWarn.length > 1;
    console.warn(
      `Feature flag${multi ? `s` : ``} ${needWarn.join(", ")} ${multi ? `are` : `is`} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
function createRenderer(options) {
  return baseCreateRenderer(options);
}
function baseCreateRenderer(options, createHydrationFns) {
  {
    initFeatureFlags();
  }
  const target = getGlobalThis();
  target.__VUE__ = true;
  if (true) {
    setDevtoolsHook$1(target.__VUE_DEVTOOLS_GLOBAL_HOOK__, target);
  }
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = NOOP,
    insertStaticContent: hostInsertStaticContent
  } = options;
  const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, namespace = void 0, slotScopeIds = null, optimized = isHmrUpdating ? false : !!n2.dynamicChildren) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1);
      unmount(n1, parentComponent, parentSuspense, true);
      n1 = null;
    }
    if (n2.patchFlag === -2) {
      optimized = false;
      n2.dynamicChildren = null;
    }
    const { type, ref: ref2, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      case Comment:
        processCommentNode(n1, n2, container, anchor);
        break;
      case Static:
        if (n1 == null) {
          mountStaticNode(n2, container, anchor, namespace);
        } else if (true) {
          patchStaticNode(n1, n2, container, namespace);
        }
        break;
      case Fragment:
        processFragment(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
        break;
      default:
        if (shapeFlag & 1) {
          processElement(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & 6) {
          processComponent(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & 64) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized,
            internals
          );
        } else if (shapeFlag & 128) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized,
            internals
          );
        } else if (true) {
          warn$1("Invalid VNode type:", type, `(${typeof type})`);
        }
    }
    if (ref2 != null && parentComponent) {
      setRef(ref2, n1 && n1.ref, parentSuspense, n2 || n1, !n2);
    } else if (ref2 == null && n1 && n1.ref != null) {
      setRef(n1.ref, null, parentSuspense, n1, true);
    }
  };
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        n2.el = hostCreateText(n2.children),
        container,
        anchor
      );
    } else {
      const el = n2.el = n1.el;
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processCommentNode = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        n2.el = hostCreateComment(n2.children || ""),
        container,
        anchor
      );
    } else {
      n2.el = n1.el;
    }
  };
  const mountStaticNode = (n2, container, anchor, namespace) => {
    [n2.el, n2.anchor] = hostInsertStaticContent(
      n2.children,
      container,
      anchor,
      namespace,
      n2.el,
      n2.anchor
    );
  };
  const patchStaticNode = (n1, n2, container, namespace) => {
    if (n2.children !== n1.children) {
      const anchor = hostNextSibling(n1.anchor);
      removeStaticNode(n1);
      [n2.el, n2.anchor] = hostInsertStaticContent(
        n2.children,
        container,
        anchor,
        namespace
      );
    } else {
      n2.el = n1.el;
      n2.anchor = n1.anchor;
    }
  };
  const moveStaticNode = ({ el, anchor }, container, nextSibling) => {
    let next;
    while (el && el !== anchor) {
      next = hostNextSibling(el);
      hostInsert(el, container, nextSibling);
      el = next;
    }
    hostInsert(anchor, container, nextSibling);
  };
  const removeStaticNode = ({ el, anchor }) => {
    let next;
    while (el && el !== anchor) {
      next = hostNextSibling(el);
      hostRemove(el);
      el = next;
    }
    hostRemove(anchor);
  };
  const processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    if (n2.type === "svg") {
      namespace = "svg";
    } else if (n2.type === "math") {
      namespace = "mathml";
    }
    if (n1 == null) {
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    } else {
      const customElement = n1.el && n1.el._isVueCE ? n1.el : null;
      try {
        if (customElement) {
          customElement._beginPatch();
        }
        patchElement(
          n1,
          n2,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      } finally {
        if (customElement) {
          customElement._endPatch();
        }
      }
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    let el;
    let vnodeHook;
    const { props, shapeFlag, transition, dirs } = vnode;
    el = vnode.el = hostCreateElement(
      vnode.type,
      namespace,
      props && props.is,
      props
    );
    if (shapeFlag & 8) {
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & 16) {
      mountChildren(
        vnode.children,
        el,
        null,
        parentComponent,
        parentSuspense,
        resolveChildrenNamespace(vnode, namespace),
        slotScopeIds,
        optimized
      );
    }
    if (dirs) {
      invokeDirectiveHook(vnode, null, parentComponent, "created");
    }
    setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
    if (props) {
      for (const key in props) {
        if (key !== "value" && !isReservedProp(key)) {
          hostPatchProp(el, key, null, props[key], namespace, parentComponent);
        }
      }
      if ("value" in props) {
        hostPatchProp(el, "value", null, props.value, namespace);
      }
      if (vnodeHook = props.onVnodeBeforeMount) {
        invokeVNodeHook(vnodeHook, parentComponent, vnode);
      }
    }
    if (true) {
      def(el, "__vnode", vnode, true);
      def(el, "__vueParentComponent", parentComponent, true);
    }
    if (dirs) {
      invokeDirectiveHook(vnode, null, parentComponent, "beforeMount");
    }
    const needCallTransitionHooks = needTransition(parentSuspense, transition);
    if (needCallTransitionHooks) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if ((vnodeHook = props && props.onVnodeMounted) || needCallTransitionHooks || dirs) {
      const isHmr = isHmrUpdating;
      queuePostRenderEffect(() => {
        let prev;
        if (true) prev = setHmrUpdating(isHmr);
        try {
          vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
          needCallTransitionHooks && transition.enter(el);
          dirs && invokeDirectiveHook(vnode, null, parentComponent, "mounted");
        } finally {
          if (true) setHmrUpdating(prev);
        }
      }, parentSuspense);
    }
  };
  const setScopeId = (el, vnode, scopeId, slotScopeIds, parentComponent) => {
    if (scopeId) {
      hostSetScopeId(el, scopeId);
    }
    if (slotScopeIds) {
      for (let i = 0; i < slotScopeIds.length; i++) {
        hostSetScopeId(el, slotScopeIds[i]);
      }
    }
    if (parentComponent) {
      let subTree = parentComponent.subTree;
      if (subTree.patchFlag > 0 && subTree.patchFlag & 2048) {
        subTree = filterSingleRoot(subTree.children) || subTree;
      }
      if (vnode === subTree || isSuspense(subTree.type) && (subTree.ssContent === vnode || subTree.ssFallback === vnode)) {
        const parentVNode = parentComponent.vnode;
        setScopeId(
          el,
          parentVNode,
          parentVNode.scopeId,
          parentVNode.slotScopeIds,
          parentComponent.parent
        );
      }
    }
  };
  const mountChildren = (children, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized, start = 0) => {
    for (let i = start; i < children.length; i++) {
      const child = children[i] = optimized ? cloneIfMounted(children[i]) : normalizeVNode(children[i]);
      patch(
        null,
        child,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    }
  };
  const patchElement = (n1, n2, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    const el = n2.el = n1.el;
    if (true) {
      el.__vnode = n2;
    }
    let { patchFlag, dynamicChildren, dirs } = n2;
    patchFlag |= n1.patchFlag & 16;
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    let vnodeHook;
    parentComponent && toggleRecurse(parentComponent, false);
    if (vnodeHook = newProps.onVnodeBeforeUpdate) {
      invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
    }
    if (dirs) {
      invokeDirectiveHook(n2, n1, parentComponent, "beforeUpdate");
    }
    parentComponent && toggleRecurse(parentComponent, true);
    if (isHmrUpdating) {
      patchFlag = 0;
      optimized = false;
      dynamicChildren = null;
    }
    if (oldProps.innerHTML && newProps.innerHTML == null || oldProps.textContent && newProps.textContent == null) {
      hostSetElementText(el, "");
    }
    if (dynamicChildren) {
      patchBlockChildren(
        n1.dynamicChildren,
        dynamicChildren,
        el,
        parentComponent,
        parentSuspense,
        resolveChildrenNamespace(n2, namespace),
        slotScopeIds
      );
      if (true) {
        traverseStaticChildren(n1, n2);
      }
    } else if (!optimized) {
      patchChildren(
        n1,
        n2,
        el,
        null,
        parentComponent,
        parentSuspense,
        resolveChildrenNamespace(n2, namespace),
        slotScopeIds,
        false
      );
    }
    if (patchFlag > 0) {
      if (patchFlag & 16) {
        patchProps(el, oldProps, newProps, parentComponent, namespace);
      } else {
        if (patchFlag & 2) {
          if (oldProps.class !== newProps.class) {
            hostPatchProp(el, "class", null, newProps.class, namespace);
          }
        }
        if (patchFlag & 4) {
          hostPatchProp(el, "style", oldProps.style, newProps.style, namespace);
        }
        if (patchFlag & 8) {
          const propsToUpdate = n2.dynamicProps;
          for (let i = 0; i < propsToUpdate.length; i++) {
            const key = propsToUpdate[i];
            const prev = oldProps[key];
            const next = newProps[key];
            if (next !== prev || key === "value") {
              hostPatchProp(el, key, prev, next, namespace, parentComponent);
            }
          }
        }
      }
      if (patchFlag & 1) {
        if (n1.children !== n2.children) {
          hostSetElementText(el, n2.children);
        }
      }
    } else if (!optimized && dynamicChildren == null) {
      patchProps(el, oldProps, newProps, parentComponent, namespace);
    }
    if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
        dirs && invokeDirectiveHook(n2, n1, parentComponent, "updated");
      }, parentSuspense);
    }
  };
  const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, namespace, slotScopeIds) => {
    for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i];
      const newVNode = newChildren[i];
      const container = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        oldVNode.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (oldVNode.type === Fragment || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !isSameVNodeType(oldVNode, newVNode) || // - In the case of a component, it could contain anything.
        oldVNode.shapeFlag & (6 | 64 | 128)) ? hostParentNode(oldVNode.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          fallbackContainer
        )
      );
      patch(
        oldVNode,
        newVNode,
        container,
        null,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        true
      );
    }
  };
  const patchProps = (el, oldProps, newProps, parentComponent, namespace) => {
    if (oldProps !== newProps) {
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!isReservedProp(key) && !(key in newProps)) {
            hostPatchProp(
              el,
              key,
              oldProps[key],
              null,
              namespace,
              parentComponent
            );
          }
        }
      }
      for (const key in newProps) {
        if (isReservedProp(key)) continue;
        const next = newProps[key];
        const prev = oldProps[key];
        if (next !== prev && key !== "value") {
          hostPatchProp(el, key, prev, next, namespace, parentComponent);
        }
      }
      if ("value" in newProps) {
        hostPatchProp(el, "value", oldProps.value, newProps.value, namespace);
      }
    }
  };
  const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    const fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText("");
    const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText("");
    let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2;
    if (
      // #5523 dev root fragment may inherit directives
      isHmrUpdating || patchFlag & 2048
    ) {
      patchFlag = 0;
      optimized = false;
      dynamicChildren = null;
    }
    if (fragmentSlotScopeIds) {
      slotScopeIds = slotScopeIds ? slotScopeIds.concat(fragmentSlotScopeIds) : fragmentSlotScopeIds;
    }
    if (n1 == null) {
      hostInsert(fragmentStartAnchor, container, anchor);
      hostInsert(fragmentEndAnchor, container, anchor);
      mountChildren(
        // #10007
        // such fragment like `<></>` will be compiled into
        // a fragment which doesn't have a children.
        // In this case fallback to an empty array
        n2.children || [],
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    } else {
      if (patchFlag > 0 && patchFlag & 64 && dynamicChildren && // #2715 the previous fragment could've been a BAILed one as a result
      // of renderSlot() with no valid children
      n1.dynamicChildren && n1.dynamicChildren.length === dynamicChildren.length) {
        patchBlockChildren(
          n1.dynamicChildren,
          dynamicChildren,
          container,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds
        );
        if (true) {
          traverseStaticChildren(n1, n2);
        } else if (
          // #2080 if the stable fragment has a key, it's a <template v-for> that may
          //  get moved around. Make sure all root level vnodes inherit el.
          // #2134 or if it's a component root, it may also get moved around
          // as the component is being moved.
          n2.key != null || parentComponent && n2 === parentComponent.subTree
        ) {
          traverseStaticChildren(
            n1,
            n2,
            true
            /* shallow */
          );
        }
      } else {
        patchChildren(
          n1,
          n2,
          container,
          fragmentEndAnchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      }
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    n2.slotScopeIds = slotScopeIds;
    if (n1 == null) {
      if (n2.shapeFlag & 512) {
        parentComponent.ctx.activate(
          n2,
          container,
          anchor,
          namespace,
          optimized
        );
      } else {
        mountComponent(
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          optimized
        );
      }
    } else {
      updateComponent(n1, n2, optimized);
    }
  };
  const mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, namespace, optimized) => {
    const instance = initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense
    );
    if (instance.type.__hmrId) {
      registerHMR(instance);
    }
    if (true) {
      pushWarningContext(initialVNode);
      startMeasure(instance, `mount`);
    }
    if (isKeepAlive(initialVNode)) {
      instance.ctx.renderer = internals;
    }
    {
      if (true) {
        startMeasure(instance, `init`);
      }
      setupComponent(instance, false, optimized);
      if (true) {
        endMeasure(instance, `init`);
      }
    }
    if (isHmrUpdating) initialVNode.el = null;
    if (instance.asyncDep) {
      parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect, optimized);
      if (!initialVNode.el) {
        const placeholder = instance.subTree = createVNode(Comment);
        processCommentNode(null, placeholder, container, anchor);
        initialVNode.placeholder = placeholder.el;
      }
    } else {
      setupRenderEffect(
        instance,
        initialVNode,
        container,
        anchor,
        parentSuspense,
        namespace,
        optimized
      );
    }
    if (true) {
      popWarningContext();
      endMeasure(instance, `mount`);
    }
  };
  const updateComponent = (n1, n2, optimized) => {
    const instance = n2.component = n1.component;
    if (shouldUpdateComponent(n1, n2, optimized)) {
      if (instance.asyncDep && !instance.asyncResolved) {
        if (true) {
          pushWarningContext(n2);
        }
        updateComponentPreRender(instance, n2, optimized);
        if (true) {
          popWarningContext();
        }
        return;
      } else {
        instance.next = n2;
        instance.update();
      }
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
  };
  const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, namespace, optimized) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        let vnodeHook;
        const { el, props } = initialVNode;
        const { bm, m, parent, root, type } = instance;
        const isAsyncWrapperVNode = isAsyncWrapper(initialVNode);
        toggleRecurse(instance, false);
        if (bm) {
          invokeArrayFns(bm);
        }
        if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeBeforeMount)) {
          invokeVNodeHook(vnodeHook, parent, initialVNode);
        }
        toggleRecurse(instance, true);
        if (el && hydrateNode) {
          const hydrateSubTree = () => {
            if (true) {
              startMeasure(instance, `render`);
            }
            instance.subTree = renderComponentRoot(instance);
            if (true) {
              endMeasure(instance, `render`);
            }
            if (true) {
              startMeasure(instance, `hydrate`);
            }
            hydrateNode(
              el,
              instance.subTree,
              instance,
              parentSuspense,
              null
            );
            if (true) {
              endMeasure(instance, `hydrate`);
            }
          };
          if (isAsyncWrapperVNode && type.__asyncHydrate) {
            type.__asyncHydrate(
              el,
              instance,
              hydrateSubTree
            );
          } else {
            hydrateSubTree();
          }
        } else {
          if (root.ce && root.ce._hasShadowRoot()) {
            root.ce._injectChildStyle(
              type,
              instance.parent ? instance.parent.type : void 0
            );
          }
          if (true) {
            startMeasure(instance, `render`);
          }
          const subTree = instance.subTree = renderComponentRoot(instance);
          if (true) {
            endMeasure(instance, `render`);
          }
          if (true) {
            startMeasure(instance, `patch`);
          }
          patch(
            null,
            subTree,
            container,
            anchor,
            instance,
            parentSuspense,
            namespace
          );
          if (true) {
            endMeasure(instance, `patch`);
          }
          initialVNode.el = subTree.el;
        }
        if (m) {
          queuePostRenderEffect(m, parentSuspense);
        }
        if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeMounted)) {
          const scopedInitialVNode = initialVNode;
          queuePostRenderEffect(
            () => invokeVNodeHook(vnodeHook, parent, scopedInitialVNode),
            parentSuspense
          );
        }
        if (initialVNode.shapeFlag & 256 || parent && isAsyncWrapper(parent.vnode) && parent.vnode.shapeFlag & 256) {
          instance.a && queuePostRenderEffect(instance.a, parentSuspense);
        }
        instance.isMounted = true;
        if (true) {
          devtoolsComponentAdded(instance);
        }
        initialVNode = container = anchor = null;
      } else {
        let { next, bu, u, parent, vnode } = instance;
        {
          const nonHydratedAsyncRoot = locateNonHydratedAsyncRoot(instance);
          if (nonHydratedAsyncRoot) {
            if (next) {
              next.el = vnode.el;
              updateComponentPreRender(instance, next, optimized);
            }
            nonHydratedAsyncRoot.asyncDep.then(() => {
              queuePostRenderEffect(() => {
                if (!instance.isUnmounted) update();
              }, parentSuspense);
            });
            return;
          }
        }
        let originNext = next;
        let vnodeHook;
        if (true) {
          pushWarningContext(next || instance.vnode);
        }
        toggleRecurse(instance, false);
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next, optimized);
        } else {
          next = vnode;
        }
        if (bu) {
          invokeArrayFns(bu);
        }
        if (vnodeHook = next.props && next.props.onVnodeBeforeUpdate) {
          invokeVNodeHook(vnodeHook, parent, next, vnode);
        }
        toggleRecurse(instance, true);
        if (true) {
          startMeasure(instance, `render`);
        }
        const nextTree = renderComponentRoot(instance);
        if (true) {
          endMeasure(instance, `render`);
        }
        const prevTree = instance.subTree;
        instance.subTree = nextTree;
        if (true) {
          startMeasure(instance, `patch`);
        }
        patch(
          prevTree,
          nextTree,
          // parent may have changed if it's in a teleport
          hostParentNode(prevTree.el),
          // anchor may have changed if it's in a fragment
          getNextHostNode(prevTree),
          instance,
          parentSuspense,
          namespace
        );
        if (true) {
          endMeasure(instance, `patch`);
        }
        next.el = nextTree.el;
        if (originNext === null) {
          updateHOCHostEl(instance, nextTree.el);
        }
        if (u) {
          queuePostRenderEffect(u, parentSuspense);
        }
        if (vnodeHook = next.props && next.props.onVnodeUpdated) {
          queuePostRenderEffect(
            () => invokeVNodeHook(vnodeHook, parent, next, vnode),
            parentSuspense
          );
        }
        if (true) {
          devtoolsComponentUpdated(instance);
        }
        if (true) {
          popWarningContext();
        }
      }
    };
    instance.scope.on();
    const effect2 = instance.effect = new ReactiveEffect(componentUpdateFn);
    instance.scope.off();
    const update = instance.update = effect2.run.bind(effect2);
    const job = instance.job = effect2.runIfDirty.bind(effect2);
    job.i = instance;
    job.id = instance.uid;
    effect2.scheduler = () => queueJob(job);
    toggleRecurse(instance, true);
    if (true) {
      effect2.onTrack = instance.rtc ? (e) => invokeArrayFns(instance.rtc, e) : void 0;
      effect2.onTrigger = instance.rtg ? (e) => invokeArrayFns(instance.rtg, e) : void 0;
    }
    update();
  };
  const updateComponentPreRender = (instance, nextVNode, optimized) => {
    nextVNode.component = instance;
    const prevProps = instance.vnode.props;
    instance.vnode = nextVNode;
    instance.next = null;
    updateProps(instance, nextVNode.props, prevProps, optimized);
    updateSlots(instance, nextVNode.children, optimized);
    pauseTracking();
    flushPreFlushCbs(instance);
    resetTracking();
  };
  const patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized = false) => {
    const c1 = n1 && n1.children;
    const prevShapeFlag = n1 ? n1.shapeFlag : 0;
    const c2 = n2.children;
    const { patchFlag, shapeFlag } = n2;
    if (patchFlag > 0) {
      if (patchFlag & 128) {
        patchKeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
        return;
      } else if (patchFlag & 256) {
        patchUnkeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
        return;
      }
    }
    if (shapeFlag & 8) {
      if (prevShapeFlag & 16) {
        unmountChildren(c1, parentComponent, parentSuspense);
      }
      if (c2 !== c1) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & 16) {
        if (shapeFlag & 16) {
          patchKeyedChildren(
            c1,
            c2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else {
          unmountChildren(c1, parentComponent, parentSuspense, true);
        }
      } else {
        if (prevShapeFlag & 8) {
          hostSetElementText(container, "");
        }
        if (shapeFlag & 16) {
          mountChildren(
            c2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        }
      }
    }
  };
  const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    c1 = c1 || EMPTY_ARR;
    c2 = c2 || EMPTY_ARR;
    const oldLength = c1.length;
    const newLength = c2.length;
    const commonLength = Math.min(oldLength, newLength);
    let i;
    for (i = 0; i < commonLength; i++) {
      const nextChild = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
      patch(
        c1[i],
        nextChild,
        container,
        null,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized
      );
    }
    if (oldLength > newLength) {
      unmountChildren(
        c1,
        parentComponent,
        parentSuspense,
        true,
        false,
        commonLength
      );
    } else {
      mountChildren(
        c2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        optimized,
        commonLength
      );
    }
  };
  const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, namespace, slotScopeIds, optimized) => {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2] = optimized ? cloneIfMounted(c2[e2]) : normalizeVNode(c2[e2]);
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
        while (i <= e2) {
          patch(
            null,
            c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]),
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i], parentComponent, parentSuspense, true);
        i++;
      }
    } else {
      const s1 = i;
      const s2 = i;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      for (i = s2; i <= e2; i++) {
        const nextChild = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
        if (nextChild.key != null) {
          if (keyToNewIndexMap.has(nextChild.key)) {
            warn$1(
              `Duplicate keys found during update:`,
              JSON.stringify(nextChild.key),
              `Make sure keys are unique.`
            );
          }
          keyToNewIndexMap.set(nextChild.key, i);
        }
      }
      let j;
      let patched = 0;
      const toBePatched = e2 - s2 + 1;
      let moved = false;
      let maxNewIndexSoFar = 0;
      const newIndexToOldIndexMap = new Array(toBePatched);
      for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          unmount(prevChild, parentComponent, parentSuspense, true);
          continue;
        }
        let newIndex;
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (j = s2; j <= e2; j++) {
            if (newIndexToOldIndexMap[j - s2] === 0 && isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        if (newIndex === void 0) {
          unmount(prevChild, parentComponent, parentSuspense, true);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          patch(
            prevChild,
            c2[newIndex],
            container,
            null,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
          patched++;
        }
      }
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR;
      j = increasingNewIndexSequence.length - 1;
      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        const anchorVNode = c2[nextIndex + 1];
        const anchor = nextIndex + 1 < l2 ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          anchorVNode.el || resolveAsyncComponentPlaceholder(anchorVNode)
        ) : parentAnchor;
        if (newIndexToOldIndexMap[i] === 0) {
          patch(
            null,
            nextChild,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            namespace,
            slotScopeIds,
            optimized
          );
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            move(nextChild, container, anchor, 2);
          } else {
            j--;
          }
        }
      }
    }
  };
  const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
    const { el, type, transition, children, shapeFlag } = vnode;
    if (shapeFlag & 6) {
      move(vnode.component.subTree, container, anchor, moveType);
      return;
    }
    if (shapeFlag & 128) {
      vnode.suspense.move(container, anchor, moveType);
      return;
    }
    if (shapeFlag & 64) {
      type.move(vnode, container, anchor, internals);
      return;
    }
    if (type === Fragment) {
      hostInsert(el, container, anchor);
      for (let i = 0; i < children.length; i++) {
        move(children[i], container, anchor, moveType);
      }
      hostInsert(vnode.anchor, container, anchor);
      return;
    }
    if (type === Static) {
      moveStaticNode(vnode, container, anchor);
      return;
    }
    const needTransition2 = moveType !== 2 && shapeFlag & 1 && transition;
    if (needTransition2) {
      if (moveType === 0) {
        if (transition.persisted && !el[leaveCbKey]) {
          hostInsert(el, container, anchor);
        } else {
          transition.beforeEnter(el);
          hostInsert(el, container, anchor);
          queuePostRenderEffect(() => transition.enter(el), parentSuspense);
        }
      } else {
        const { leave, delayLeave, afterLeave } = transition;
        const remove22 = () => {
          if (vnode.ctx.isUnmounted) {
            hostRemove(el);
          } else {
            hostInsert(el, container, anchor);
          }
        };
        const performLeave = () => {
          const wasLeaving = el._isLeaving || !!el[leaveCbKey];
          if (el._isLeaving) {
            el[leaveCbKey](
              true
              /* cancelled */
            );
          }
          if (transition.persisted && !wasLeaving) {
            remove22();
          } else {
            leave(el, () => {
              remove22();
              afterLeave && afterLeave();
            });
          }
        };
        if (delayLeave) {
          delayLeave(el, remove22, performLeave);
        } else {
          performLeave();
        }
      }
    } else {
      hostInsert(el, container, anchor);
    }
  };
  const unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
    const {
      type,
      props,
      ref: ref2,
      children,
      dynamicChildren,
      shapeFlag,
      patchFlag,
      dirs,
      cacheIndex,
      memo
    } = vnode;
    if (patchFlag === -2) {
      optimized = false;
    }
    if (ref2 != null) {
      pauseTracking();
      setRef(ref2, null, parentSuspense, vnode, true);
      resetTracking();
    }
    if (cacheIndex != null) {
      parentComponent.renderCache[cacheIndex] = void 0;
    }
    if (shapeFlag & 256) {
      parentComponent.ctx.deactivate(vnode);
      return;
    }
    const shouldInvokeDirs = shapeFlag & 1 && dirs;
    const shouldInvokeVnodeHook = !isAsyncWrapper(vnode);
    let vnodeHook;
    if (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeBeforeUnmount)) {
      invokeVNodeHook(vnodeHook, parentComponent, vnode);
    }
    if (shapeFlag & 6) {
      unmountComponent(vnode.component, parentSuspense, doRemove);
    } else {
      if (shapeFlag & 128) {
        vnode.suspense.unmount(parentSuspense, doRemove);
        return;
      }
      if (shouldInvokeDirs) {
        invokeDirectiveHook(vnode, null, parentComponent, "beforeUnmount");
      }
      if (shapeFlag & 64) {
        vnode.type.remove(
          vnode,
          parentComponent,
          parentSuspense,
          internals,
          doRemove
        );
      } else if (dynamicChildren && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !dynamicChildren.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (type !== Fragment || patchFlag > 0 && patchFlag & 64)) {
        unmountChildren(
          dynamicChildren,
          parentComponent,
          parentSuspense,
          false,
          true
        );
      } else if (type === Fragment && patchFlag & (128 | 256) || !optimized && shapeFlag & 16) {
        unmountChildren(children, parentComponent, parentSuspense);
      }
      if (doRemove) {
        remove2(vnode);
      }
    }
    const shouldInvalidateMemo = memo != null && cacheIndex == null;
    if (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeUnmounted) || shouldInvokeDirs || shouldInvalidateMemo) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
        shouldInvokeDirs && invokeDirectiveHook(vnode, null, parentComponent, "unmounted");
        if (shouldInvalidateMemo) {
          vnode.el = null;
        }
      }, parentSuspense);
    }
  };
  const remove2 = (vnode) => {
    const { type, el, anchor, transition } = vnode;
    if (type === Fragment) {
      if (vnode.patchFlag > 0 && vnode.patchFlag & 2048 && transition && !transition.persisted) {
        vnode.children.forEach((child) => {
          if (child.type === Comment) {
            hostRemove(child.el);
          } else {
            remove2(child);
          }
        });
      } else {
        removeFragment(el, anchor);
      }
      return;
    }
    if (type === Static) {
      removeStaticNode(vnode);
      return;
    }
    const performRemove = () => {
      hostRemove(el);
      if (transition && !transition.persisted && transition.afterLeave) {
        transition.afterLeave();
      }
    };
    if (vnode.shapeFlag & 1 && transition && !transition.persisted) {
      const { leave, delayLeave } = transition;
      const performLeave = () => leave(el, performRemove);
      if (delayLeave) {
        delayLeave(vnode.el, performRemove, performLeave);
      } else {
        performLeave();
      }
    } else {
      performRemove();
    }
  };
  const removeFragment = (cur, end) => {
    let next;
    while (cur !== end) {
      next = hostNextSibling(cur);
      hostRemove(cur);
      cur = next;
    }
    hostRemove(end);
  };
  const unmountComponent = (instance, parentSuspense, doRemove) => {
    if (instance.type.__hmrId) {
      unregisterHMR(instance);
    }
    const { bum, scope, job, subTree, um, m, a } = instance;
    invalidateMount(m);
    invalidateMount(a);
    if (bum) {
      invokeArrayFns(bum);
    }
    scope.stop();
    if (job) {
      job.flags |= 8;
      unmount(subTree, instance, parentSuspense, doRemove);
    }
    if (um) {
      queuePostRenderEffect(um, parentSuspense);
    }
    queuePostRenderEffect(() => {
      instance.isUnmounted = true;
    }, parentSuspense);
    if (true) {
      devtoolsComponentRemoved(instance);
    }
  };
  const unmountChildren = (children, parentComponent, parentSuspense, doRemove = false, optimized = false, start = 0) => {
    for (let i = start; i < children.length; i++) {
      unmount(children[i], parentComponent, parentSuspense, doRemove, optimized);
    }
  };
  const getNextHostNode = (vnode) => {
    if (vnode.shapeFlag & 6) {
      return getNextHostNode(vnode.component.subTree);
    }
    if (vnode.shapeFlag & 128) {
      return vnode.suspense.next();
    }
    const el = hostNextSibling(vnode.anchor || vnode.el);
    const teleportEnd = el && el[TeleportEndKey];
    return teleportEnd ? hostNextSibling(teleportEnd) : el;
  };
  let isFlushing = false;
  const render = (vnode, container, namespace) => {
    let instance;
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null, null, true);
        instance = container._vnode.component;
      }
    } else {
      patch(
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        namespace
      );
    }
    container._vnode = vnode;
    if (!isFlushing) {
      isFlushing = true;
      flushPreFlushCbs(instance);
      flushPostFlushCbs();
      isFlushing = false;
    }
  };
  const internals = {
    p: patch,
    um: unmount,
    m: move,
    r: remove2,
    mt: mountComponent,
    mc: mountChildren,
    pc: patchChildren,
    pbc: patchBlockChildren,
    n: getNextHostNode,
    o: options
  };
  let hydrate;
  let hydrateNode;
  if (createHydrationFns) {
    [hydrate, hydrateNode] = createHydrationFns(
      internals
    );
  }
  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate)
  };
}
function resolveChildrenNamespace({ type, props }, currentNamespace) {
  return currentNamespace === "svg" && type === "foreignObject" || currentNamespace === "mathml" && type === "annotation-xml" && props && props.encoding && props.encoding.includes("html") ? void 0 : currentNamespace;
}
function toggleRecurse({ effect: effect2, job }, allowed) {
  if (allowed) {
    effect2.flags |= 32;
    job.flags |= 4;
  } else {
    effect2.flags &= -33;
    job.flags &= -5;
  }
}
function needTransition(parentSuspense, transition) {
  return (!parentSuspense || parentSuspense && !parentSuspense.pendingBranch) && transition && !transition.persisted;
}
function traverseStaticChildren(n1, n2, shallow = false) {
  const ch1 = n1.children;
  const ch2 = n2.children;
  if (isArray(ch1) && isArray(ch2)) {
    for (let i = 0; i < ch1.length; i++) {
      const c1 = ch1[i];
      let c2 = ch2[i];
      if (c2.shapeFlag & 1 && !c2.dynamicChildren) {
        if (c2.patchFlag <= 0 || c2.patchFlag === 32) {
          c2 = ch2[i] = cloneIfMounted(ch2[i]);
          c2.el = c1.el;
        }
        if (!shallow && c2.patchFlag !== -2)
          traverseStaticChildren(c1, c2);
      }
      if (c2.type === Text) {
        if (c2.patchFlag === -1) {
          c2 = ch2[i] = cloneIfMounted(c2);
        }
        c2.el = c1.el;
      }
      if (c2.type === Comment && !c2.el) {
        c2.el = c1.el;
      }
      if (true) {
        c2.el && (c2.el.__vnode = c2);
      }
    }
  }
}
function getSequence(arr) {
  const p2 = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p2[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = u + v >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p2[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p2[v];
  }
  return result;
}
function locateNonHydratedAsyncRoot(instance) {
  const subComponent = instance.subTree.component;
  if (subComponent) {
    if (subComponent.asyncDep && !subComponent.asyncResolved) {
      return subComponent;
    } else {
      return locateNonHydratedAsyncRoot(subComponent);
    }
  }
}
function invalidateMount(hooks) {
  if (hooks) {
    for (let i = 0; i < hooks.length; i++)
      hooks[i].flags |= 8;
  }
}
function resolveAsyncComponentPlaceholder(anchorVnode) {
  if (anchorVnode.placeholder) {
    return anchorVnode.placeholder;
  }
  const instance = anchorVnode.component;
  if (instance) {
    return resolveAsyncComponentPlaceholder(instance.subTree);
  }
  return null;
}
function queueEffectWithSuspense(fn, suspense) {
  if (suspense && suspense.pendingBranch) {
    if (isArray(fn)) {
      suspense.effects.push(...fn);
    } else {
      suspense.effects.push(fn);
    }
  } else {
    queuePostFlushCb(fn);
  }
}
function openBlock(disableTracking = false) {
  blockStack.push(currentBlock = disableTracking ? null : []);
}
function closeBlock() {
  blockStack.pop();
  currentBlock = blockStack[blockStack.length - 1] || null;
}
function setBlockTracking(value, inVOnce = false) {
  isBlockTreeEnabled += value;
  if (value < 0 && currentBlock && inVOnce) {
    currentBlock.hasOnce = true;
  }
}
function setupBlock(vnode) {
  vnode.dynamicChildren = isBlockTreeEnabled > 0 ? currentBlock || EMPTY_ARR : null;
  closeBlock();
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(vnode);
  }
  return vnode;
}
function createElementBlock(type, props, children, patchFlag, dynamicProps, shapeFlag) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true
    )
  );
}
function createBlock(type, props, children, patchFlag, dynamicProps) {
  return setupBlock(
    createVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      true
    )
  );
}
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
function isSameVNodeType(n1, n2) {
  if (n2.shapeFlag & 6 && n1.component) {
    const dirtyInstances = hmrDirtyComponents.get(n2.type);
    if (dirtyInstances && dirtyInstances.has(n1.component)) {
      n1.shapeFlag &= -257;
      n2.shapeFlag &= -513;
      return false;
    }
  }
  return n1.type === n2.type && n1.key === n2.key;
}
function createBaseVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, shapeFlag = type === Fragment ? 0 : 1, isBlockNode = false, needFullChildrenNormalization = false) {
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetStart: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
    ctx: currentRenderingInstance
  };
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children);
    if (shapeFlag & 128) {
      type.normalize(vnode);
    }
  } else if (children) {
    vnode.shapeFlag |= isString(children) ? 8 : 16;
  }
  if (vnode.key !== vnode.key) {
    warn$1(`VNode created with invalid key (NaN). VNode type:`, vnode.type);
  }
  if (isBlockTreeEnabled > 0 && // avoid a block node from tracking itself
  !isBlockNode && // has current parent block
  currentBlock && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (vnode.patchFlag > 0 || shapeFlag & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  vnode.patchFlag !== 32) {
    currentBlock.push(vnode);
  }
  return vnode;
}
function _createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    if (!type) {
      warn$1(`Invalid vnode type when creating vnode: ${type}.`);
    }
    type = Comment;
  }
  if (isVNode(type)) {
    const cloned = cloneVNode(
      type,
      props,
      true
      /* mergeRef: true */
    );
    if (children) {
      normalizeChildren(cloned, children);
    }
    if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock) {
      if (cloned.shapeFlag & 6) {
        currentBlock[currentBlock.indexOf(type)] = cloned;
      } else {
        currentBlock.push(cloned);
      }
    }
    cloned.patchFlag = -2;
    return cloned;
  }
  if (isClassComponent(type)) {
    type = type.__vccOpts;
  }
  if (props) {
    props = guardReactiveProps(props);
    let { class: klass, style } = props;
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass);
    }
    if (isObject(style)) {
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style);
      }
      props.style = normalizeStyle(style);
    }
  }
  const shapeFlag = isString(type) ? 1 : isSuspense(type) ? 128 : isTeleport(type) ? 64 : isObject(type) ? 4 : isFunction(type) ? 2 : 0;
  if (shapeFlag & 4 && isProxy(type)) {
    type = toRaw(type);
    warn$1(
      `Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with \`markRaw\` or using \`shallowRef\` instead of \`ref\`.`,
      `
Component that was made reactive: `,
      type
    );
  }
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  );
}
function guardReactiveProps(props) {
  if (!props) return null;
  return isProxy(props) || isInternalObject(props) ? extend({}, props) : props;
}
function cloneVNode(vnode, extraProps, mergeRef = false, cloneTransition = false) {
  const { props, ref: ref2, patchFlag, children, transition } = vnode;
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
  const cloned = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref: extraProps && extraProps.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      mergeRef && ref2 ? isArray(ref2) ? ref2.concat(normalizeRef(extraProps)) : [ref2, normalizeRef(extraProps)] : normalizeRef(extraProps)
    ) : ref2,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children: patchFlag === -1 && isArray(children) ? children.map(deepCloneVNode) : children,
    target: vnode.target,
    targetStart: vnode.targetStart,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: extraProps && vnode.type !== Fragment ? patchFlag === -1 ? 16 : patchFlag | 16 : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: vnode.component,
    suspense: vnode.suspense,
    ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
    ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
    placeholder: vnode.placeholder,
    el: vnode.el,
    anchor: vnode.anchor,
    ctx: vnode.ctx,
    ce: vnode.ce
  };
  if (transition && cloneTransition) {
    setTransitionHooks(
      cloned,
      transition.clone(cloned)
    );
  }
  return cloned;
}
function deepCloneVNode(vnode) {
  const cloned = cloneVNode(vnode);
  if (isArray(vnode.children)) {
    cloned.children = vnode.children.map(deepCloneVNode);
  }
  return cloned;
}
function createTextVNode(text = " ", flag = 0) {
  return createVNode(Text, null, text, flag);
}
function createStaticVNode(content, numberOfNodes) {
  const vnode = createVNode(Static, null, content);
  vnode.staticCount = numberOfNodes;
  return vnode;
}
function createCommentVNode(text = "", asBlock = false) {
  return asBlock ? (openBlock(), createBlock(Comment, null, text)) : createVNode(Comment, null, text);
}
function normalizeVNode(child) {
  if (child == null || typeof child === "boolean") {
    return createVNode(Comment);
  } else if (isArray(child)) {
    return createVNode(
      Fragment,
      null,
      // #3666, avoid reference pollution when reusing vnode
      child.slice()
    );
  } else if (isVNode(child)) {
    return cloneIfMounted(child);
  } else {
    return createVNode(Text, null, String(child));
  }
}
function cloneIfMounted(child) {
  return child.el === null && child.patchFlag !== -1 || child.memo ? child : cloneVNode(child);
}
function normalizeChildren(vnode, children) {
  let type = 0;
  const { shapeFlag } = vnode;
  if (children == null) {
    children = null;
  } else if (isArray(children)) {
    type = 16;
  } else if (typeof children === "object") {
    if (shapeFlag & (1 | 64)) {
      const slot = children.default;
      if (slot) {
        slot._c && (slot._d = false);
        normalizeChildren(vnode, slot());
        slot._c && (slot._d = true);
      }
      return;
    } else {
      type = 32;
      const slotFlag = children._;
      if (!slotFlag && !isInternalObject(children)) {
        children._ctx = currentRenderingInstance;
      } else if (slotFlag === 3 && currentRenderingInstance) {
        if (currentRenderingInstance.slots._ === 1) {
          children._ = 1;
        } else {
          children._ = 2;
          vnode.patchFlag |= 1024;
        }
      }
    }
  } else if (isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance };
    type = 32;
  } else {
    children = String(children);
    if (shapeFlag & 64) {
      type = 16;
      children = [createTextVNode(children)];
    } else {
      type = 8;
    }
  }
  vnode.children = children;
  vnode.shapeFlag |= type;
}
function mergeProps(...args) {
  const ret = {};
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i];
    for (const key in toMerge) {
      if (key === "class") {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class]);
        }
      } else if (key === "style") {
        ret.style = normalizeStyle([ret.style, toMerge.style]);
      } else if (isOn(key)) {
        const existing = ret[key];
        const incoming = toMerge[key];
        if (incoming && existing !== incoming && !(isArray(existing) && existing.includes(incoming))) {
          ret[key] = existing ? [].concat(existing, incoming) : incoming;
        } else if (incoming == null && existing == null && // mergeProps({ 'onUpdate:modelValue': undefined }) should not retain
        // the model listener.
        !isModelListener(key)) {
          ret[key] = incoming;
        }
      } else if (key !== "") {
        ret[key] = toMerge[key];
      }
    }
  }
  return ret;
}
function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
  callWithAsyncErrorHandling(hook, instance, 7, [
    vnode,
    prevVNode
  ]);
}
function createComponentInstance(vnode, parent, suspense) {
  const type = vnode.type;
  const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
  const instance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new EffectScope(
      true
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    ids: parent ? parent.ids : ["", 0, 0],
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: normalizePropsOptions(type, appContext),
    emitsOptions: normalizeEmitsOptions(type, appContext),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: EMPTY_OBJ,
    // inheritAttrs
    inheritAttrs: type.inheritAttrs,
    // state
    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    setupContext: null,
    // suspense related
    suspense,
    suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,
    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  };
  if (true) {
    instance.ctx = createDevRenderContext(instance);
  } else {
    instance.ctx = { _: instance };
  }
  instance.root = parent ? parent.root : instance;
  instance.emit = emit.bind(null, instance);
  if (vnode.ce) {
    vnode.ce(instance);
  }
  return instance;
}
function validateComponentName(name, { isNativeTag }) {
  if (isBuiltInTag(name) || isNativeTag(name)) {
    warn$1(
      "Do not use built-in or reserved HTML elements as component id: " + name
    );
  }
}
function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & 4;
}
function setupComponent(instance, isSSR = false, optimized = false) {
  isSSR && setInSSRSetupState(isSSR);
  const { props, children } = instance.vnode;
  const isStateful = isStatefulComponent(instance);
  initProps(instance, props, isStateful, isSSR);
  initSlots(instance, children, optimized || isSSR);
  const setupResult = isStateful ? setupStatefulComponent(instance, isSSR) : void 0;
  isSSR && setInSSRSetupState(false);
  return setupResult;
}
function setupStatefulComponent(instance, isSSR) {
  const Component = instance.type;
  if (true) {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config);
    }
    if (Component.components) {
      const names = Object.keys(Component.components);
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config);
      }
    }
    if (Component.directives) {
      const names = Object.keys(Component.directives);
      for (let i = 0; i < names.length; i++) {
        validateDirectiveName(names[i]);
      }
    }
    if (Component.compilerOptions && isRuntimeOnly()) {
      warn$1(
        `"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.`
      );
    }
  }
  instance.accessCache = /* @__PURE__ */ Object.create(null);
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
  if (true) {
    exposePropsOnRenderContext(instance);
  }
  const { setup } = Component;
  if (setup) {
    pauseTracking();
    const setupContext = instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null;
    const reset = setCurrentInstance(instance);
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      0,
      [
        true ? shallowReadonly(instance.props) : instance.props,
        setupContext
      ]
    );
    const isAsyncSetup = isPromise(setupResult);
    resetTracking();
    reset();
    if ((isAsyncSetup || instance.sp) && !isAsyncWrapper(instance)) {
      markAsyncBoundary(instance);
    }
    if (isAsyncSetup) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance);
      if (isSSR) {
        return setupResult.then((resolvedResult) => {
          handleSetupResult(instance, resolvedResult, isSSR);
        }).catch((e) => {
          handleError(e, instance, 0);
        });
      } else {
        instance.asyncDep = setupResult;
        if (!instance.suspense) {
          const name = formatComponentName(instance, Component);
          warn$1(
            `Component <${name}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
          );
        }
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR);
    }
  } else {
    finishComponentSetup(instance, isSSR);
  }
}
function handleSetupResult(instance, setupResult, isSSR) {
  if (isFunction(setupResult)) {
    if (instance.type.__ssrInlineRender) {
      instance.ssrRender = setupResult;
    } else {
      instance.render = setupResult;
    }
  } else if (isObject(setupResult)) {
    if (isVNode(setupResult)) {
      warn$1(
        `setup() should not return VNodes directly - return a render function instead.`
      );
    }
    if (true) {
      instance.devtoolsRawSetupState = setupResult;
    }
    instance.setupState = proxyRefs(setupResult);
    if (true) {
      exposeSetupStateOnRenderContext(instance);
    }
  } else if (setupResult !== void 0) {
    warn$1(
      `setup() should return an object. Received: ${setupResult === null ? "null" : typeof setupResult}`
    );
  }
  finishComponentSetup(instance, isSSR);
}
function finishComponentSetup(instance, isSSR, skipOptions) {
  const Component = instance.type;
  if (!instance.render) {
    if (!isSSR && compile && !Component.render) {
      const template = Component.template || __VUE_OPTIONS_API__ && resolveMergedOptions(instance).template;
      if (template) {
        if (true) {
          startMeasure(instance, `compile`);
        }
        const { isCustomElement, compilerOptions } = instance.appContext.config;
        const { delimiters, compilerOptions: componentCompilerOptions } = Component;
        const finalCompilerOptions = extend(
          extend(
            {
              isCustomElement,
              delimiters
            },
            compilerOptions
          ),
          componentCompilerOptions
        );
        Component.render = compile(template, finalCompilerOptions);
        if (true) {
          endMeasure(instance, `compile`);
        }
      }
    }
    instance.render = Component.render || NOOP;
    if (installWithProxy) {
      installWithProxy(instance);
    }
  }
  if (__VUE_OPTIONS_API__ && true) {
    const reset = setCurrentInstance(instance);
    pauseTracking();
    try {
      applyOptions(instance);
    } finally {
      resetTracking();
      reset();
    }
  }
  if (!Component.render && instance.render === NOOP && !isSSR) {
    if (!compile && Component.template) {
      warn$1(
        `Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".`
      );
    } else {
      warn$1(`Component is missing template or render function: `, Component);
    }
  }
}
function getSlotsProxy(instance) {
  return new Proxy(instance.slots, {
    get(target, key) {
      track(instance, "get", "$slots");
      return target[key];
    }
  });
}
function createSetupContext(instance) {
  const expose = (exposed) => {
    if (true) {
      if (instance.exposed) {
        warn$1(`expose() should be called only once per setup().`);
      }
      if (exposed != null) {
        let exposedType = typeof exposed;
        if (exposedType === "object") {
          if (isArray(exposed)) {
            exposedType = "array";
          } else if (isRef2(exposed)) {
            exposedType = "ref";
          }
        }
        if (exposedType !== "object") {
          warn$1(
            `expose() should be passed a plain object, received ${exposedType}.`
          );
        }
      }
    }
    instance.exposed = exposed || {};
  };
  if (true) {
    let attrsProxy;
    let slotsProxy;
    return Object.freeze({
      get attrs() {
        return attrsProxy || (attrsProxy = new Proxy(instance.attrs, attrsProxyHandlers));
      },
      get slots() {
        return slotsProxy || (slotsProxy = getSlotsProxy(instance));
      },
      get emit() {
        return (event, ...args) => instance.emit(event, ...args);
      },
      expose
    });
  } else {
    return {
      attrs: new Proxy(instance.attrs, attrsProxyHandlers),
      slots: instance.slots,
      emit: instance.emit,
      expose
    };
  }
}
function getComponentPublicInstance(instance) {
  if (instance.exposed) {
    return instance.exposeProxy || (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
      get(target, key) {
        if (key in target) {
          return target[key];
        } else if (key in publicPropertiesMap) {
          return publicPropertiesMap[key](instance);
        }
      },
      has(target, key) {
        return key in target || key in publicPropertiesMap;
      }
    }));
  } else {
    return instance.proxy;
  }
}
function getComponentName(Component, includeInferred = true) {
  return isFunction(Component) ? Component.displayName || Component.name : Component.name || includeInferred && Component.__name;
}
function formatComponentName(instance, Component, isRoot = false) {
  let name = getComponentName(Component);
  if (!name && Component.__file) {
    const match = Component.__file.match(/([^/\\]+)\.\w+$/);
    if (match) {
      name = match[1];
    }
  }
  if (!name && instance) {
    const inferFromRegistry = (registry) => {
      for (const key in registry) {
        if (registry[key] === Component) {
          return key;
        }
      }
    };
    name = inferFromRegistry(instance.components) || instance.parent && inferFromRegistry(
      instance.parent.type.components
    ) || inferFromRegistry(instance.appContext.components);
  }
  return name ? classify(name) : isRoot ? `App` : `Anonymous`;
}
function isClassComponent(value) {
  return isFunction(value) && "__vccOpts" in value;
}
function h(type, propsOrChildren, children) {
  try {
    setBlockTracking(-1);
    const l = arguments.length;
    if (l === 2) {
      if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
        if (isVNode(propsOrChildren)) {
          return createVNode(type, null, [propsOrChildren]);
        }
        return createVNode(type, propsOrChildren);
      } else {
        return createVNode(type, null, propsOrChildren);
      }
    } else {
      if (l > 3) {
        children = Array.prototype.slice.call(arguments, 2);
      } else if (l === 3 && isVNode(children)) {
        children = [children];
      }
      return createVNode(type, propsOrChildren, children);
    }
  } finally {
    setBlockTracking(1);
  }
}
function initCustomFormatter() {
  if (typeof window === "undefined") {
    return;
  }
  const vueStyle = { style: "color:#3ba776" };
  const numberStyle = { style: "color:#1677ff" };
  const stringStyle = { style: "color:#f5222d" };
  const keywordStyle = { style: "color:#eb2f96" };
  const formatter = {
    __vue_custom_formatter: true,
    header(obj) {
      if (!isObject(obj)) {
        return null;
      }
      if (obj.__isVue) {
        return ["div", vueStyle, `VueInstance`];
      } else if (isRef2(obj)) {
        pauseTracking();
        const value = obj.value;
        resetTracking();
        return [
          "div",
          {},
          ["span", vueStyle, genRefFlag(obj)],
          "<",
          formatValue(value),
          `>`
        ];
      } else if (isReactive(obj)) {
        return [
          "div",
          {},
          ["span", vueStyle, isShallow(obj) ? "ShallowReactive" : "Reactive"],
          "<",
          formatValue(obj),
          `>${isReadonly(obj) ? ` (readonly)` : ``}`
        ];
      } else if (isReadonly(obj)) {
        return [
          "div",
          {},
          ["span", vueStyle, isShallow(obj) ? "ShallowReadonly" : "Readonly"],
          "<",
          formatValue(obj),
          ">"
        ];
      }
      return null;
    },
    hasBody(obj) {
      return obj && obj.__isVue;
    },
    body(obj) {
      if (obj && obj.__isVue) {
        return [
          "div",
          {},
          ...formatInstance(obj.$)
        ];
      }
    }
  };
  function formatInstance(instance) {
    const blocks = [];
    if (instance.type.props && instance.props) {
      blocks.push(createInstanceBlock("props", toRaw(instance.props)));
    }
    if (instance.setupState !== EMPTY_OBJ) {
      blocks.push(createInstanceBlock("setup", instance.setupState));
    }
    if (instance.data !== EMPTY_OBJ) {
      blocks.push(createInstanceBlock("data", toRaw(instance.data)));
    }
    const computed3 = extractKeys(instance, "computed");
    if (computed3) {
      blocks.push(createInstanceBlock("computed", computed3));
    }
    const injected = extractKeys(instance, "inject");
    if (injected) {
      blocks.push(createInstanceBlock("injected", injected));
    }
    blocks.push([
      "div",
      {},
      [
        "span",
        {
          style: keywordStyle.style + ";opacity:0.66"
        },
        "$ (internal): "
      ],
      ["object", { object: instance }]
    ]);
    return blocks;
  }
  function createInstanceBlock(type, target) {
    target = extend({}, target);
    if (!Object.keys(target).length) {
      return ["span", {}];
    }
    return [
      "div",
      { style: "line-height:1.25em;margin-bottom:0.6em" },
      [
        "div",
        {
          style: "color:#476582"
        },
        type
      ],
      [
        "div",
        {
          style: "padding-left:1.25em"
        },
        ...Object.keys(target).map((key) => {
          return [
            "div",
            {},
            ["span", keywordStyle, key + ": "],
            formatValue(target[key], false)
          ];
        })
      ]
    ];
  }
  function formatValue(v, asRaw = true) {
    if (typeof v === "number") {
      return ["span", numberStyle, v];
    } else if (typeof v === "string") {
      return ["span", stringStyle, JSON.stringify(v)];
    } else if (typeof v === "boolean") {
      return ["span", keywordStyle, v];
    } else if (isObject(v)) {
      return ["object", { object: asRaw ? toRaw(v) : v }];
    } else {
      return ["span", stringStyle, String(v)];
    }
  }
  function extractKeys(instance, type) {
    const Comp = instance.type;
    if (isFunction(Comp)) {
      return;
    }
    const extracted = {};
    for (const key in instance.ctx) {
      if (isKeyOfType(Comp, key, type)) {
        extracted[key] = instance.ctx[key];
      }
    }
    return extracted;
  }
  function isKeyOfType(Comp, key, type) {
    const opts = Comp[type];
    if (isArray(opts) && opts.includes(key) || isObject(opts) && key in opts) {
      return true;
    }
    if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
      return true;
    }
    if (Comp.mixins && Comp.mixins.some((m) => isKeyOfType(m, key, type))) {
      return true;
    }
  }
  function genRefFlag(v) {
    if (isShallow(v)) {
      return `ShallowRef`;
    }
    if (v.effect) {
      return `ComputedRef`;
    }
    return `Ref`;
  }
  if (window.devtoolsFormatters) {
    window.devtoolsFormatters.push(formatter);
  } else {
    window.devtoolsFormatters = [formatter];
  }
}
var stack, isWarning, ErrorTypeStrings$1, queue, flushIndex, pendingPostFlushCbs, activePostFlushCbs, postFlushIndex, resolvedPromise, currentFlushPromise, RECURSION_LIMIT, getId, isHmrUpdating, setHmrUpdating, hmrDirtyComponents, map, devtools$1, buffer, devtoolsNotInstalled, devtoolsComponentAdded, devtoolsComponentUpdated, _devtoolsComponentRemoved, devtoolsComponentRemoved, devtoolsPerfStart, devtoolsPerfEnd, currentRenderingInstance, currentScopeId, ssrContextKey, useSSRContext, TeleportEndKey, isTeleport, leaveCbKey, enterCbKey, TransitionHookValidator, BaseTransitionPropsValidators, recursiveGetSubtree, BaseTransitionImpl, BaseTransition, knownTemplateRefs, pendingSetRefMap, requestIdleCallback, cancelIdleCallback, isAsyncWrapper, isKeepAlive, createHook, onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted, onServerPrefetch, onRenderTriggered, onRenderTracked, COMPONENTS, NULL_DYNAMIC_COMPONENT, getPublicInstance, publicPropertiesMap, isReservedPrefix, hasSetupBinding, PublicInstanceProxyHandlers, shouldCacheAccess, internalOptionMergeStrats, uid$1, currentApp, getModelModifiers, mixinEmitsCache, accessedAttrs, getChildRoot, getFunctionalFallthrough, filterModelListeners, isElementRoot, internalObjectProto, createInternalObject, isInternalObject, mixinPropsCache, isSimpleType, isInternalKey, normalizeSlotValue, normalizeSlot, normalizeObjectSlots, normalizeVNodeSlots, assignSlots, initSlots, updateSlots, supported, perf, queuePostRenderEffect, isSuspense, Fragment, Text, Comment, Static, blockStack, currentBlock, isBlockTreeEnabled, vnodeArgsTransformer, createVNodeWithArgsTransform, normalizeKey, normalizeRef, createVNode, emptyAppContext, uid, currentInstance, getCurrentInstance, internalSetCurrentInstance, setInSSRSetupState, setCurrentInstance, unsetCurrentInstance, isBuiltInTag, isInSSRComponentSetup, compile, installWithProxy, isRuntimeOnly, attrsProxyHandlers, classifyRE, classify, computed2, version, warn2;
var init_runtime_core_esm_bundler = __esm({
  "node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js"() {
    init_reactivity_esm_bundler();
    init_reactivity_esm_bundler();
    init_shared_esm_bundler();
    init_shared_esm_bundler();
    stack = [];
    isWarning = false;
    ErrorTypeStrings$1 = {
      ["sp"]: "serverPrefetch hook",
      ["bc"]: "beforeCreate hook",
      ["c"]: "created hook",
      ["bm"]: "beforeMount hook",
      ["m"]: "mounted hook",
      ["bu"]: "beforeUpdate hook",
      ["u"]: "updated",
      ["bum"]: "beforeUnmount hook",
      ["um"]: "unmounted hook",
      ["a"]: "activated hook",
      ["da"]: "deactivated hook",
      ["ec"]: "errorCaptured hook",
      ["rtc"]: "renderTracked hook",
      ["rtg"]: "renderTriggered hook",
      [0]: "setup function",
      [1]: "render function",
      [2]: "watcher getter",
      [3]: "watcher callback",
      [4]: "watcher cleanup function",
      [5]: "native event handler",
      [6]: "component event handler",
      [7]: "vnode hook",
      [8]: "directive hook",
      [9]: "transition hook",
      [10]: "app errorHandler",
      [11]: "app warnHandler",
      [12]: "ref function",
      [13]: "async component loader",
      [14]: "scheduler flush",
      [15]: "component update",
      [16]: "app unmount cleanup function"
    };
    queue = [];
    flushIndex = -1;
    pendingPostFlushCbs = [];
    activePostFlushCbs = null;
    postFlushIndex = 0;
    resolvedPromise = /* @__PURE__ */ Promise.resolve();
    currentFlushPromise = null;
    RECURSION_LIMIT = 100;
    getId = (job) => job.id == null ? job.flags & 2 ? -1 : Infinity : job.id;
    isHmrUpdating = false;
    setHmrUpdating = (v) => {
      try {
        return isHmrUpdating;
      } finally {
        isHmrUpdating = v;
      }
    };
    hmrDirtyComponents = /* @__PURE__ */ new Map();
    if (true) {
      getGlobalThis().__VUE_HMR_RUNTIME__ = {
        createRecord: tryWrap(createRecord),
        rerender: tryWrap(rerender),
        reload: tryWrap(reload)
      };
    }
    map = /* @__PURE__ */ new Map();
    buffer = [];
    devtoolsNotInstalled = false;
    devtoolsComponentAdded = /* @__PURE__ */ createDevtoolsComponentHook(
      "component:added"
      /* COMPONENT_ADDED */
    );
    devtoolsComponentUpdated = /* @__PURE__ */ createDevtoolsComponentHook(
      "component:updated"
      /* COMPONENT_UPDATED */
    );
    _devtoolsComponentRemoved = /* @__PURE__ */ createDevtoolsComponentHook(
      "component:removed"
      /* COMPONENT_REMOVED */
    );
    devtoolsComponentRemoved = (component) => {
      if (devtools$1 && typeof devtools$1.cleanupBuffer === "function" && // remove the component if it wasn't buffered
      !devtools$1.cleanupBuffer(component)) {
        _devtoolsComponentRemoved(component);
      }
    };
    devtoolsPerfStart = /* @__PURE__ */ createDevtoolsPerformanceHook(
      "perf:start"
      /* PERFORMANCE_START */
    );
    devtoolsPerfEnd = /* @__PURE__ */ createDevtoolsPerformanceHook(
      "perf:end"
      /* PERFORMANCE_END */
    );
    currentRenderingInstance = null;
    currentScopeId = null;
    ssrContextKey = /* @__PURE__ */ Symbol.for("v-scx");
    useSSRContext = () => {
      {
        const ctx = inject(ssrContextKey);
        if (!ctx) {
          warn$1(
            `Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build.`
          );
        }
        return ctx;
      }
    };
    TeleportEndKey = /* @__PURE__ */ Symbol("_vte");
    isTeleport = (type) => type.__isTeleport;
    leaveCbKey = /* @__PURE__ */ Symbol("_leaveCb");
    enterCbKey = /* @__PURE__ */ Symbol("_enterCb");
    TransitionHookValidator = [Function, Array];
    BaseTransitionPropsValidators = {
      mode: String,
      appear: Boolean,
      persisted: Boolean,
      // enter
      onBeforeEnter: TransitionHookValidator,
      onEnter: TransitionHookValidator,
      onAfterEnter: TransitionHookValidator,
      onEnterCancelled: TransitionHookValidator,
      // leave
      onBeforeLeave: TransitionHookValidator,
      onLeave: TransitionHookValidator,
      onAfterLeave: TransitionHookValidator,
      onLeaveCancelled: TransitionHookValidator,
      // appear
      onBeforeAppear: TransitionHookValidator,
      onAppear: TransitionHookValidator,
      onAfterAppear: TransitionHookValidator,
      onAppearCancelled: TransitionHookValidator
    };
    recursiveGetSubtree = (instance) => {
      const subTree = instance.subTree;
      return subTree.component ? recursiveGetSubtree(subTree.component) : subTree;
    };
    BaseTransitionImpl = {
      name: `BaseTransition`,
      props: BaseTransitionPropsValidators,
      setup(props, { slots }) {
        const instance = getCurrentInstance();
        const state2 = useTransitionState();
        return () => {
          const children = slots.default && getTransitionRawChildren(slots.default(), true);
          const child = children && children.length ? findNonCommentChild(children) : (
            // Keep explicit default-slot conditionals on the same transition path
            // as regular v-if branches, which render a comment placeholder.
            instance.subTree ? createCommentVNode() : void 0
          );
          if (!child) {
            return;
          }
          const rawProps = toRaw(props);
          const { mode } = rawProps;
          if (mode && mode !== "in-out" && mode !== "out-in" && mode !== "default") {
            warn$1(`invalid <transition> mode: ${mode}`);
          }
          if (state2.isLeaving) {
            return emptyPlaceholder(child);
          }
          const innerChild = getInnerChild$1(child);
          if (!innerChild) {
            return emptyPlaceholder(child);
          }
          let enterHooks = resolveTransitionHooks(
            innerChild,
            rawProps,
            state2,
            instance,
            // #11061, ensure enterHooks is fresh after clone
            (hooks) => enterHooks = hooks
          );
          if (innerChild.type !== Comment) {
            setTransitionHooks(innerChild, enterHooks);
          }
          let oldInnerChild = instance.subTree && getInnerChild$1(instance.subTree);
          if (oldInnerChild && oldInnerChild.type !== Comment && !isSameVNodeType(oldInnerChild, innerChild) && recursiveGetSubtree(instance).type !== Comment) {
            let leavingHooks = resolveTransitionHooks(
              oldInnerChild,
              rawProps,
              state2,
              instance
            );
            setTransitionHooks(oldInnerChild, leavingHooks);
            if (mode === "out-in" && innerChild.type !== Comment) {
              state2.isLeaving = true;
              leavingHooks.afterLeave = () => {
                state2.isLeaving = false;
                if (!(instance.job.flags & 8)) {
                  instance.update();
                }
                delete leavingHooks.afterLeave;
                oldInnerChild = void 0;
              };
              return emptyPlaceholder(child);
            } else if (mode === "in-out" && innerChild.type !== Comment) {
              leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
                const leavingVNodesCache = getLeavingNodesForType(
                  state2,
                  oldInnerChild
                );
                leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild;
                el[leaveCbKey] = () => {
                  earlyRemove();
                  el[leaveCbKey] = void 0;
                  delete enterHooks.delayedLeave;
                  oldInnerChild = void 0;
                };
                enterHooks.delayedLeave = () => {
                  delayedLeave();
                  delete enterHooks.delayedLeave;
                  oldInnerChild = void 0;
                };
              };
            } else {
              oldInnerChild = void 0;
            }
          } else if (oldInnerChild) {
            oldInnerChild = void 0;
          }
          return child;
        };
      }
    };
    BaseTransition = BaseTransitionImpl;
    knownTemplateRefs = /* @__PURE__ */ new WeakSet();
    pendingSetRefMap = /* @__PURE__ */ new WeakMap();
    requestIdleCallback = getGlobalThis().requestIdleCallback || ((cb) => setTimeout(cb, 1));
    cancelIdleCallback = getGlobalThis().cancelIdleCallback || ((id) => clearTimeout(id));
    isAsyncWrapper = (i) => !!i.type.__asyncLoader;
    isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
    createHook = (lifecycle) => (hook, target = currentInstance) => {
      if (!isInSSRComponentSetup || lifecycle === "sp") {
        injectHook(lifecycle, (...args) => hook(...args), target);
      }
    };
    onBeforeMount = createHook("bm");
    onMounted = createHook("m");
    onBeforeUpdate = createHook(
      "bu"
    );
    onUpdated = createHook("u");
    onBeforeUnmount = createHook(
      "bum"
    );
    onUnmounted = createHook("um");
    onServerPrefetch = createHook(
      "sp"
    );
    onRenderTriggered = createHook("rtg");
    onRenderTracked = createHook("rtc");
    COMPONENTS = "components";
    NULL_DYNAMIC_COMPONENT = /* @__PURE__ */ Symbol.for("v-ndc");
    getPublicInstance = (i) => {
      if (!i) return null;
      if (isStatefulComponent(i)) return getComponentPublicInstance(i);
      return getPublicInstance(i.parent);
    };
    publicPropertiesMap = // Move PURE marker to new line to workaround compiler discarding it
    // due to type annotation
    /* @__PURE__ */ extend(/* @__PURE__ */ Object.create(null), {
      $: (i) => i,
      $el: (i) => i.vnode.el,
      $data: (i) => i.data,
      $props: (i) => true ? shallowReadonly(i.props) : i.props,
      $attrs: (i) => true ? shallowReadonly(i.attrs) : i.attrs,
      $slots: (i) => true ? shallowReadonly(i.slots) : i.slots,
      $refs: (i) => true ? shallowReadonly(i.refs) : i.refs,
      $parent: (i) => getPublicInstance(i.parent),
      $root: (i) => getPublicInstance(i.root),
      $host: (i) => i.ce,
      $emit: (i) => i.emit,
      $options: (i) => __VUE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type,
      $forceUpdate: (i) => i.f || (i.f = () => {
        queueJob(i.update);
      }),
      $nextTick: (i) => i.n || (i.n = nextTick.bind(i.proxy)),
      $watch: (i) => __VUE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP
    });
    isReservedPrefix = (key) => key === "_" || key === "$";
    hasSetupBinding = (state2, key) => state2 !== EMPTY_OBJ && !state2.__isScriptSetup && hasOwn(state2, key);
    PublicInstanceProxyHandlers = {
      get({ _: instance }, key) {
        if (key === "__v_skip") {
          return true;
        }
        const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
        if (key === "__isVue") {
          return true;
        }
        if (key[0] !== "$") {
          const n = accessCache[key];
          if (n !== void 0) {
            switch (n) {
              case 1:
                return setupState[key];
              case 2:
                return data[key];
              case 4:
                return ctx[key];
              case 3:
                return props[key];
            }
          } else if (hasSetupBinding(setupState, key)) {
            accessCache[key] = 1;
            return setupState[key];
          } else if (__VUE_OPTIONS_API__ && data !== EMPTY_OBJ && hasOwn(data, key)) {
            accessCache[key] = 2;
            return data[key];
          } else if (hasOwn(props, key)) {
            accessCache[key] = 3;
            return props[key];
          } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
            accessCache[key] = 4;
            return ctx[key];
          } else if (!__VUE_OPTIONS_API__ || shouldCacheAccess) {
            accessCache[key] = 0;
          }
        }
        const publicGetter = publicPropertiesMap[key];
        let cssModule, globalProperties;
        if (publicGetter) {
          if (key === "$attrs") {
            track(instance.attrs, "get", "");
            markAttrsAccessed();
          } else if (key === "$slots") {
            track(instance, "get", key);
          }
          return publicGetter(instance);
        } else if (
          // css module (injected by vue-loader)
          (cssModule = type.__cssModules) && (cssModule = cssModule[key])
        ) {
          return cssModule;
        } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
          accessCache[key] = 4;
          return ctx[key];
        } else if (
          // global properties
          globalProperties = appContext.config.globalProperties, hasOwn(globalProperties, key)
        ) {
          {
            return globalProperties[key];
          }
        } else if (currentRenderingInstance && (!isString(key) || // #1091 avoid internal isRef/isVNode checks on component instance leading
        // to infinite warning loop
        key.indexOf("__v") !== 0)) {
          if (data !== EMPTY_OBJ && isReservedPrefix(key[0]) && hasOwn(data, key)) {
            warn$1(
              `Property ${JSON.stringify(
                key
              )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
            );
          } else if (instance === currentRenderingInstance) {
            warn$1(
              `Property ${JSON.stringify(key)} was accessed during render but is not defined on instance.`
            );
          }
        }
      },
      set({ _: instance }, key, value) {
        const { data, setupState, ctx } = instance;
        if (hasSetupBinding(setupState, key)) {
          setupState[key] = value;
          return true;
        } else if (setupState.__isScriptSetup && hasOwn(setupState, key)) {
          warn$1(`Cannot mutate <script setup> binding "${key}" from Options API.`);
          return false;
        } else if (__VUE_OPTIONS_API__ && data !== EMPTY_OBJ && hasOwn(data, key)) {
          data[key] = value;
          return true;
        } else if (hasOwn(instance.props, key)) {
          warn$1(`Attempting to mutate prop "${key}". Props are readonly.`);
          return false;
        }
        if (key[0] === "$" && key.slice(1) in instance) {
          warn$1(
            `Attempting to mutate public property "${key}". Properties starting with $ are reserved and readonly.`
          );
          return false;
        } else {
          if (key in instance.appContext.config.globalProperties) {
            Object.defineProperty(ctx, key, {
              enumerable: true,
              configurable: true,
              value
            });
          } else {
            ctx[key] = value;
          }
        }
        return true;
      },
      has({
        _: { data, setupState, accessCache, ctx, appContext, props, type }
      }, key) {
        let cssModules;
        return !!(accessCache[key] || __VUE_OPTIONS_API__ && data !== EMPTY_OBJ && key[0] !== "$" && hasOwn(data, key) || hasSetupBinding(setupState, key) || hasOwn(props, key) || hasOwn(ctx, key) || hasOwn(publicPropertiesMap, key) || hasOwn(appContext.config.globalProperties, key) || (cssModules = type.__cssModules) && cssModules[key]);
      },
      defineProperty(target, key, descriptor) {
        if (descriptor.get != null) {
          target._.accessCache[key] = 0;
        } else if (hasOwn(descriptor, "value")) {
          this.set(target, key, descriptor.value, null);
        }
        return Reflect.defineProperty(target, key, descriptor);
      }
    };
    if (true) {
      PublicInstanceProxyHandlers.ownKeys = (target) => {
        warn$1(
          `Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead.`
        );
        return Reflect.ownKeys(target);
      };
    }
    shouldCacheAccess = true;
    internalOptionMergeStrats = {
      data: mergeDataFn,
      props: mergeEmitsOrPropsOptions,
      emits: mergeEmitsOrPropsOptions,
      // objects
      methods: mergeObjectOptions,
      computed: mergeObjectOptions,
      // lifecycle
      beforeCreate: mergeAsArray,
      created: mergeAsArray,
      beforeMount: mergeAsArray,
      mounted: mergeAsArray,
      beforeUpdate: mergeAsArray,
      updated: mergeAsArray,
      beforeDestroy: mergeAsArray,
      beforeUnmount: mergeAsArray,
      destroyed: mergeAsArray,
      unmounted: mergeAsArray,
      activated: mergeAsArray,
      deactivated: mergeAsArray,
      errorCaptured: mergeAsArray,
      serverPrefetch: mergeAsArray,
      // assets
      components: mergeObjectOptions,
      directives: mergeObjectOptions,
      // watch
      watch: mergeWatchOptions,
      // provide / inject
      provide: mergeDataFn,
      inject: mergeInject
    };
    uid$1 = 0;
    currentApp = null;
    getModelModifiers = (props, modelName) => {
      return modelName === "modelValue" || modelName === "model-value" ? props.modelModifiers : props[`${modelName}Modifiers`] || props[`${camelize(modelName)}Modifiers`] || props[`${hyphenate(modelName)}Modifiers`];
    };
    mixinEmitsCache = /* @__PURE__ */ new WeakMap();
    accessedAttrs = false;
    getChildRoot = (vnode) => {
      const rawChildren = vnode.children;
      const dynamicChildren = vnode.dynamicChildren;
      const childRoot = filterSingleRoot(rawChildren, false);
      if (!childRoot) {
        return [vnode, void 0];
      } else if (childRoot.patchFlag > 0 && childRoot.patchFlag & 2048) {
        return getChildRoot(childRoot);
      }
      const index = rawChildren.indexOf(childRoot);
      const dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1;
      const setRoot = (updatedRoot) => {
        rawChildren[index] = updatedRoot;
        if (dynamicChildren) {
          if (dynamicIndex > -1) {
            dynamicChildren[dynamicIndex] = updatedRoot;
          } else if (updatedRoot.patchFlag > 0) {
            vnode.dynamicChildren = [...dynamicChildren, updatedRoot];
          }
        }
      };
      return [normalizeVNode(childRoot), setRoot];
    };
    getFunctionalFallthrough = (attrs) => {
      let res;
      for (const key in attrs) {
        if (key === "class" || key === "style" || isOn(key)) {
          (res || (res = {}))[key] = attrs[key];
        }
      }
      return res;
    };
    filterModelListeners = (attrs, props) => {
      const res = {};
      for (const key in attrs) {
        if (!isModelListener(key) || !(key.slice(9) in props)) {
          res[key] = attrs[key];
        }
      }
      return res;
    };
    isElementRoot = (vnode) => {
      return vnode.shapeFlag & (6 | 1) || vnode.type === Comment;
    };
    internalObjectProto = {};
    createInternalObject = () => Object.create(internalObjectProto);
    isInternalObject = (obj) => Object.getPrototypeOf(obj) === internalObjectProto;
    mixinPropsCache = /* @__PURE__ */ new WeakMap();
    isSimpleType = /* @__PURE__ */ makeMap(
      "String,Number,Boolean,Function,Symbol,BigInt"
    );
    isInternalKey = (key) => key === "_" || key === "_ctx" || key === "$stable";
    normalizeSlotValue = (value) => isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)];
    normalizeSlot = (key, rawSlot, ctx) => {
      if (rawSlot._n) {
        return rawSlot;
      }
      const normalized = withCtx((...args) => {
        if (currentInstance && !(ctx === null && currentRenderingInstance) && !(ctx && ctx.root !== currentInstance.root)) {
          warn$1(
            `Slot "${key}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
          );
        }
        return normalizeSlotValue(rawSlot(...args));
      }, ctx);
      normalized._c = false;
      return normalized;
    };
    normalizeObjectSlots = (rawSlots, slots, instance) => {
      const ctx = rawSlots._ctx;
      for (const key in rawSlots) {
        if (isInternalKey(key)) continue;
        const value = rawSlots[key];
        if (isFunction(value)) {
          slots[key] = normalizeSlot(key, value, ctx);
        } else if (value != null) {
          if (true) {
            warn$1(
              `Non-function value encountered for slot "${key}". Prefer function slots for better performance.`
            );
          }
          const normalized = normalizeSlotValue(value);
          slots[key] = () => normalized;
        }
      }
    };
    normalizeVNodeSlots = (instance, children) => {
      if (!isKeepAlive(instance.vnode) && true) {
        warn$1(
          `Non-function value encountered for default slot. Prefer function slots for better performance.`
        );
      }
      const normalized = normalizeSlotValue(children);
      instance.slots.default = () => normalized;
    };
    assignSlots = (slots, children, optimized) => {
      for (const key in children) {
        if (optimized || !isInternalKey(key)) {
          slots[key] = children[key];
        }
      }
    };
    initSlots = (instance, children, optimized) => {
      const slots = instance.slots = createInternalObject();
      if (instance.vnode.shapeFlag & 32) {
        const type = children._;
        if (type) {
          assignSlots(slots, children, optimized);
          if (optimized) {
            def(slots, "_", type, true);
          }
        } else {
          normalizeObjectSlots(children, slots);
        }
      } else if (children) {
        normalizeVNodeSlots(instance, children);
      }
    };
    updateSlots = (instance, children, optimized) => {
      const { vnode, slots } = instance;
      let needDeletionCheck = true;
      let deletionComparisonTarget = EMPTY_OBJ;
      if (vnode.shapeFlag & 32) {
        const type = children._;
        if (type) {
          if (isHmrUpdating) {
            assignSlots(slots, children, optimized);
            trigger(instance, "set", "$slots");
          } else if (optimized && type === 1) {
            needDeletionCheck = false;
          } else {
            assignSlots(slots, children, optimized);
          }
        } else {
          needDeletionCheck = !children.$stable;
          normalizeObjectSlots(children, slots);
        }
        deletionComparisonTarget = children;
      } else if (children) {
        normalizeVNodeSlots(instance, children);
        deletionComparisonTarget = { default: 1 };
      }
      if (needDeletionCheck) {
        for (const key in slots) {
          if (!isInternalKey(key) && deletionComparisonTarget[key] == null) {
            delete slots[key];
          }
        }
      }
    };
    queuePostRenderEffect = queueEffectWithSuspense;
    isSuspense = (type) => type.__isSuspense;
    Fragment = /* @__PURE__ */ Symbol.for("v-fgt");
    Text = /* @__PURE__ */ Symbol.for("v-txt");
    Comment = /* @__PURE__ */ Symbol.for("v-cmt");
    Static = /* @__PURE__ */ Symbol.for("v-stc");
    blockStack = [];
    currentBlock = null;
    isBlockTreeEnabled = 1;
    createVNodeWithArgsTransform = (...args) => {
      return _createVNode(
        ...vnodeArgsTransformer ? vnodeArgsTransformer(args, currentRenderingInstance) : args
      );
    };
    normalizeKey = ({ key }) => key != null ? key : null;
    normalizeRef = ({
      ref: ref2,
      ref_key,
      ref_for
    }) => {
      if (typeof ref2 === "number") {
        ref2 = "" + ref2;
      }
      return ref2 != null ? isString(ref2) || isRef2(ref2) || isFunction(ref2) ? { i: currentRenderingInstance, r: ref2, k: ref_key, f: !!ref_for } : ref2 : null;
    };
    createVNode = true ? createVNodeWithArgsTransform : _createVNode;
    emptyAppContext = createAppContext();
    uid = 0;
    currentInstance = null;
    getCurrentInstance = () => currentInstance || currentRenderingInstance;
    {
      const g = getGlobalThis();
      const registerGlobalSetter = (key, setter) => {
        let setters;
        if (!(setters = g[key])) setters = g[key] = [];
        setters.push(setter);
        return (v) => {
          if (setters.length > 1) setters.forEach((set) => set(v));
          else setters[0](v);
        };
      };
      internalSetCurrentInstance = registerGlobalSetter(
        `__VUE_INSTANCE_SETTERS__`,
        (v) => currentInstance = v
      );
      setInSSRSetupState = registerGlobalSetter(
        `__VUE_SSR_SETTERS__`,
        (v) => isInSSRComponentSetup = v
      );
    }
    setCurrentInstance = (instance) => {
      const prev = currentInstance;
      internalSetCurrentInstance(instance);
      instance.scope.on();
      return () => {
        instance.scope.off();
        internalSetCurrentInstance(prev);
      };
    };
    unsetCurrentInstance = () => {
      currentInstance && currentInstance.scope.off();
      internalSetCurrentInstance(null);
    };
    isBuiltInTag = /* @__PURE__ */ makeMap("slot,component");
    isInSSRComponentSetup = false;
    isRuntimeOnly = () => !compile;
    attrsProxyHandlers = true ? {
      get(target, key) {
        markAttrsAccessed();
        track(target, "get", "");
        return target[key];
      },
      set() {
        warn$1(`setupContext.attrs is readonly.`);
        return false;
      },
      deleteProperty() {
        warn$1(`setupContext.attrs is readonly.`);
        return false;
      }
    } : {
      get(target, key) {
        track(target, "get", "");
        return target[key];
      }
    };
    classifyRE = /(?:^|[-_])\w/g;
    classify = (str) => str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, "");
    computed2 = (getterOrOptions, debugOptions) => {
      const c = computed(getterOrOptions, debugOptions, isInSSRComponentSetup);
      if (true) {
        const i = getCurrentInstance();
        if (i && i.appContext.config.warnRecursiveComputed) {
          c._warnRecursive = true;
        }
      }
      return c;
    };
    version = "3.5.38";
    warn2 = true ? warn$1 : NOOP;
  }
});

// node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js
function resolveTransitionProps(rawProps) {
  const baseProps = {};
  for (const key in rawProps) {
    if (!(key in DOMTransitionPropsValidators)) {
      baseProps[key] = rawProps[key];
    }
  }
  if (rawProps.css === false) {
    return baseProps;
  }
  const {
    name = "v",
    type,
    duration,
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    appearFromClass = enterFromClass,
    appearActiveClass = enterActiveClass,
    appearToClass = enterToClass,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`
  } = rawProps;
  const durations = normalizeDuration(duration);
  const enterDuration = durations && durations[0];
  const leaveDuration = durations && durations[1];
  const {
    onBeforeEnter,
    onEnter,
    onEnterCancelled,
    onLeave,
    onLeaveCancelled,
    onBeforeAppear = onBeforeEnter,
    onAppear = onEnter,
    onAppearCancelled = onEnterCancelled
  } = baseProps;
  const finishEnter = (el, isAppear, done, isCancelled) => {
    el._enterCancelled = isCancelled;
    removeTransitionClass(el, isAppear ? appearToClass : enterToClass);
    removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass);
    done && done();
  };
  const finishLeave = (el, done) => {
    el._isLeaving = false;
    removeTransitionClass(el, leaveFromClass);
    removeTransitionClass(el, leaveToClass);
    removeTransitionClass(el, leaveActiveClass);
    done && done();
  };
  const makeEnterHook = (isAppear) => {
    return (el, done) => {
      const hook = isAppear ? onAppear : onEnter;
      const resolve2 = () => finishEnter(el, isAppear, done);
      callHook2(hook, [el, resolve2]);
      nextFrame(() => {
        removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass);
        addTransitionClass(el, isAppear ? appearToClass : enterToClass);
        if (!hasExplicitCallback(hook)) {
          whenTransitionEnds(el, type, enterDuration, resolve2);
        }
      });
    };
  };
  return extend(baseProps, {
    onBeforeEnter(el) {
      callHook2(onBeforeEnter, [el]);
      addTransitionClass(el, enterFromClass);
      addTransitionClass(el, enterActiveClass);
    },
    onBeforeAppear(el) {
      callHook2(onBeforeAppear, [el]);
      addTransitionClass(el, appearFromClass);
      addTransitionClass(el, appearActiveClass);
    },
    onEnter: makeEnterHook(false),
    onAppear: makeEnterHook(true),
    onLeave(el, done) {
      el._isLeaving = true;
      const resolve2 = () => finishLeave(el, done);
      addTransitionClass(el, leaveFromClass);
      if (!el._enterCancelled) {
        forceReflow(el);
        addTransitionClass(el, leaveActiveClass);
      } else {
        addTransitionClass(el, leaveActiveClass);
        forceReflow(el);
      }
      nextFrame(() => {
        if (!el._isLeaving) {
          return;
        }
        removeTransitionClass(el, leaveFromClass);
        addTransitionClass(el, leaveToClass);
        if (!hasExplicitCallback(onLeave)) {
          whenTransitionEnds(el, type, leaveDuration, resolve2);
        }
      });
      callHook2(onLeave, [el, resolve2]);
    },
    onEnterCancelled(el) {
      finishEnter(el, false, void 0, true);
      callHook2(onEnterCancelled, [el]);
    },
    onAppearCancelled(el) {
      finishEnter(el, true, void 0, true);
      callHook2(onAppearCancelled, [el]);
    },
    onLeaveCancelled(el) {
      finishLeave(el);
      callHook2(onLeaveCancelled, [el]);
    }
  });
}
function normalizeDuration(duration) {
  if (duration == null) {
    return null;
  } else if (isObject(duration)) {
    return [NumberOf(duration.enter), NumberOf(duration.leave)];
  } else {
    const n = NumberOf(duration);
    return [n, n];
  }
}
function NumberOf(val) {
  const res = toNumber(val);
  if (true) {
    assertNumber(res, "<transition> explicit duration");
  }
  return res;
}
function addTransitionClass(el, cls) {
  cls.split(/\s+/).forEach((c) => c && el.classList.add(c));
  (el[vtcKey] || (el[vtcKey] = /* @__PURE__ */ new Set())).add(cls);
}
function removeTransitionClass(el, cls) {
  cls.split(/\s+/).forEach((c) => c && el.classList.remove(c));
  const _vtc = el[vtcKey];
  if (_vtc) {
    _vtc.delete(cls);
    if (!_vtc.size) {
      el[vtcKey] = void 0;
    }
  }
}
function nextFrame(cb) {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb);
  });
}
function whenTransitionEnds(el, expectedType, explicitTimeout, resolve2) {
  const id = el._endId = ++endId;
  const resolveIfNotStale = () => {
    if (id === el._endId) {
      resolve2();
    }
  };
  if (explicitTimeout != null) {
    return setTimeout(resolveIfNotStale, explicitTimeout);
  }
  const { type, timeout, propCount } = getTransitionInfo(el, expectedType);
  if (!type) {
    return resolve2();
  }
  const endEvent = type + "end";
  let ended = 0;
  const end = () => {
    el.removeEventListener(endEvent, onEnd);
    resolveIfNotStale();
  };
  const onEnd = (e) => {
    if (e.target === el && ++ended >= propCount) {
      end();
    }
  };
  setTimeout(() => {
    if (ended < propCount) {
      end();
    }
  }, timeout + 1);
  el.addEventListener(endEvent, onEnd);
}
function getTransitionInfo(el, expectedType) {
  const styles = window.getComputedStyle(el);
  const getStyleProperties = (key) => (styles[key] || "").split(", ");
  const transitionDelays = getStyleProperties(`${TRANSITION}Delay`);
  const transitionDurations = getStyleProperties(`${TRANSITION}Duration`);
  const transitionTimeout = getTimeout(transitionDelays, transitionDurations);
  const animationDelays = getStyleProperties(`${ANIMATION}Delay`);
  const animationDurations = getStyleProperties(`${ANIMATION}Duration`);
  const animationTimeout = getTimeout(animationDelays, animationDurations);
  let type = null;
  let timeout = 0;
  let propCount = 0;
  if (expectedType === TRANSITION) {
    if (transitionTimeout > 0) {
      type = TRANSITION;
      timeout = transitionTimeout;
      propCount = transitionDurations.length;
    }
  } else if (expectedType === ANIMATION) {
    if (animationTimeout > 0) {
      type = ANIMATION;
      timeout = animationTimeout;
      propCount = animationDurations.length;
    }
  } else {
    timeout = Math.max(transitionTimeout, animationTimeout);
    type = timeout > 0 ? transitionTimeout > animationTimeout ? TRANSITION : ANIMATION : null;
    propCount = type ? type === TRANSITION ? transitionDurations.length : animationDurations.length : 0;
  }
  const hasTransform = type === TRANSITION && /\b(?:transform|all)(?:,|$)/.test(
    getStyleProperties(`${TRANSITION}Property`).toString()
  );
  return {
    type,
    timeout,
    propCount,
    hasTransform
  };
}
function getTimeout(delays, durations) {
  while (delays.length < durations.length) {
    delays = delays.concat(delays);
  }
  return Math.max(...durations.map((d, i) => toMs(d) + toMs(delays[i])));
}
function toMs(s) {
  if (s === "auto") return 0;
  return Number(s.slice(0, -1).replace(",", ".")) * 1e3;
}
function forceReflow(el) {
  const targetDocument = el ? el.ownerDocument : document;
  return targetDocument.body.offsetHeight;
}
function patchClass(el, value, isSVG) {
  const transitionClasses = el[vtcKey];
  if (transitionClasses) {
    value = (value ? [value, ...transitionClasses] : [...transitionClasses]).join(" ");
  }
  if (value == null) {
    el.removeAttribute("class");
  } else if (isSVG) {
    el.setAttribute("class", value);
  } else {
    el.className = value;
  }
}
function setDisplay(el, value) {
  el.style.display = value ? el[vShowOriginalDisplay] : "none";
  el[vShowHidden] = !value;
}
function patchStyle(el, prev, next) {
  const style = el.style;
  const isCssString = isString(next);
  let hasControlledDisplay = false;
  if (next && !isCssString) {
    if (prev) {
      if (!isString(prev)) {
        for (const key in prev) {
          if (next[key] == null) {
            setStyle(style, key, "");
          }
        }
      } else {
        for (const prevStyle of prev.split(";")) {
          const key = prevStyle.slice(0, prevStyle.indexOf(":")).trim();
          if (next[key] == null) {
            setStyle(style, key, "");
          }
        }
      }
    }
    for (const key in next) {
      if (key === "display") {
        hasControlledDisplay = true;
      }
      const value = next[key];
      if (value != null) {
        if (!shouldPreserveTextareaResizeStyle(
          el,
          key,
          !isString(prev) && prev ? prev[key] : void 0,
          value
        )) {
          setStyle(style, key, value);
        }
      } else {
        setStyle(style, key, "");
      }
    }
  } else {
    if (isCssString) {
      if (prev !== next) {
        const cssVarText = style[CSS_VAR_TEXT];
        if (cssVarText) {
          next += ";" + cssVarText;
        }
        style.cssText = next;
        hasControlledDisplay = displayRE.test(next);
      }
    } else if (prev) {
      el.removeAttribute("style");
    }
  }
  if (vShowOriginalDisplay in el) {
    el[vShowOriginalDisplay] = hasControlledDisplay ? style.display : "";
    if (el[vShowHidden]) {
      style.display = "none";
    }
  }
}
function setStyle(style, name, val) {
  if (isArray(val)) {
    val.forEach((v) => setStyle(style, name, v));
  } else {
    if (val == null) val = "";
    if (true) {
      if (semicolonRE.test(val)) {
        warn2(
          `Unexpected semicolon at the end of '${name}' style value: '${val}'`
        );
      }
    }
    if (name.startsWith("--")) {
      style.setProperty(name, val);
    } else {
      const prefixed = autoPrefix(style, name);
      if (importantRE.test(val)) {
        style.setProperty(
          hyphenate(prefixed),
          val.replace(importantRE, ""),
          "important"
        );
      } else {
        style[prefixed] = val;
      }
    }
  }
}
function autoPrefix(style, rawName) {
  const cached = prefixCache[rawName];
  if (cached) {
    return cached;
  }
  let name = camelize(rawName);
  if (name !== "filter" && name in style) {
    return prefixCache[rawName] = name;
  }
  name = capitalize(name);
  for (let i = 0; i < prefixes.length; i++) {
    const prefixed = prefixes[i] + name;
    if (prefixed in style) {
      return prefixCache[rawName] = prefixed;
    }
  }
  return rawName;
}
function shouldPreserveTextareaResizeStyle(el, key, prev, next) {
  return el.tagName === "TEXTAREA" && (key === "width" || key === "height") && isString(next) && prev === next;
}
function patchAttr(el, key, value, isSVG, instance, isBoolean = isSpecialBooleanAttr(key)) {
  if (isSVG && key.startsWith("xlink:")) {
    if (value == null) {
      el.removeAttributeNS(xlinkNS, key.slice(6, key.length));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    if (value == null || isBoolean && !includeBooleanAttr(value)) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(
        key,
        isBoolean ? "" : isSymbol(value) ? String(value) : value
      );
    }
  }
}
function patchDOMProp(el, key, value, parentComponent, attrName) {
  if (key === "innerHTML" || key === "textContent") {
    if (value != null) {
      el[key] = key === "innerHTML" ? unsafeToTrustedHTML(value) : value;
    }
    return;
  }
  const tag = el.tagName;
  if (key === "value" && tag !== "PROGRESS" && // custom elements may use _value internally
  !tag.includes("-")) {
    const oldValue = tag === "OPTION" ? el.getAttribute("value") || "" : el.value;
    const newValue = value == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      el.type === "checkbox" ? "on" : ""
    ) : String(value);
    if (oldValue !== newValue || !("_value" in el)) {
      el.value = newValue;
    }
    if (value == null) {
      el.removeAttribute(key);
    }
    el._value = value;
    return;
  }
  let needRemove = false;
  if (value === "" || value == null) {
    const type = typeof el[key];
    if (type === "boolean") {
      value = includeBooleanAttr(value);
    } else if (value == null && type === "string") {
      value = "";
      needRemove = true;
    } else if (type === "number") {
      value = 0;
      needRemove = true;
    }
  }
  try {
    el[key] = value;
  } catch (e) {
    if (!needRemove) {
      warn2(
        `Failed setting prop "${key}" on <${tag.toLowerCase()}>: value ${value} is invalid.`,
        e
      );
    }
  }
  needRemove && el.removeAttribute(attrName || key);
}
function addEventListener(el, event, handler, options) {
  el.addEventListener(event, handler, options);
}
function removeEventListener(el, event, handler, options) {
  el.removeEventListener(event, handler, options);
}
function patchEvent(el, rawName, prevValue, nextValue, instance = null) {
  const invokers = el[veiKey] || (el[veiKey] = {});
  const existingInvoker = invokers[rawName];
  if (nextValue && existingInvoker) {
    existingInvoker.value = true ? sanitizeEventValue(nextValue, rawName) : nextValue;
  } else {
    const [name, options] = parseName(rawName);
    if (nextValue) {
      const invoker = invokers[rawName] = createInvoker(
        true ? sanitizeEventValue(nextValue, rawName) : nextValue,
        instance
      );
      addEventListener(el, name, invoker, options);
    } else if (existingInvoker) {
      removeEventListener(el, name, existingInvoker, options);
      invokers[rawName] = void 0;
    }
  }
}
function parseName(name) {
  let options;
  if (optionsModifierRE.test(name)) {
    options = {};
    let m;
    while (m = name.match(optionsModifierRE)) {
      name = name.slice(0, name.length - m[0].length);
      options[m[0].toLowerCase()] = true;
    }
  }
  const event = name[2] === ":" ? name.slice(3) : hyphenate(name.slice(2));
  return [event, options];
}
function createInvoker(initialValue, instance) {
  const invoker = (e) => {
    if (!e._vts) {
      e._vts = Date.now();
    } else if (e._vts <= invoker.attached) {
      return;
    }
    const value = invoker.value;
    if (isArray(value)) {
      const originalStop = e.stopImmediatePropagation;
      e.stopImmediatePropagation = () => {
        originalStop.call(e);
        e._stopped = true;
      };
      const handlers = value.slice();
      const args = [e];
      for (let i = 0; i < handlers.length; i++) {
        if (e._stopped) {
          break;
        }
        const handler = handlers[i];
        if (handler) {
          callWithAsyncErrorHandling(
            handler,
            instance,
            5,
            args
          );
        }
      }
    } else {
      callWithAsyncErrorHandling(
        value,
        instance,
        5,
        [e]
      );
    }
  };
  invoker.value = initialValue;
  invoker.attached = getNow();
  return invoker;
}
function sanitizeEventValue(value, propName) {
  if (isFunction(value) || isArray(value)) {
    return value;
  }
  warn2(
    `Wrong type passed as event handler to ${propName} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof value}.`
  );
  return NOOP;
}
function shouldSetAsProp(el, key, value, isSVG) {
  if (isSVG) {
    if (key === "innerHTML" || key === "textContent") {
      return true;
    }
    if (key in el && isNativeOn(key) && isFunction(value)) {
      return true;
    }
    return false;
  }
  if (key === "spellcheck" || key === "draggable" || key === "translate" || key === "autocorrect") {
    return false;
  }
  if (key === "sandbox" && el.tagName === "IFRAME") {
    return false;
  }
  if (key === "form") {
    return false;
  }
  if (key === "list" && el.tagName === "INPUT") {
    return false;
  }
  if (key === "type" && el.tagName === "TEXTAREA") {
    return false;
  }
  if (key === "width" || key === "height") {
    const tag = el.tagName;
    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS" || tag === "SOURCE") {
      return false;
    }
  }
  if (isNativeOn(key) && isString(value)) {
    return false;
  }
  return key in el;
}
function shouldSetAsPropForVueCE(el, key) {
  const props = (
    // @ts-expect-error _def is private
    el._def.props
  );
  if (!props) {
    return false;
  }
  const camelKey = camelize(key);
  return Array.isArray(props) ? props.some((prop) => camelize(prop) === camelKey) : Object.keys(props).some((prop) => camelize(prop) === camelKey);
}
function callPendingCbs(c) {
  const el = c.el;
  if (el[moveCbKey]) {
    el[moveCbKey]();
  }
  if (el[enterCbKey2]) {
    el[enterCbKey2]();
  }
}
function recordPosition(c) {
  newPositionMap.set(c, getPosition(c.el));
}
function applyTranslation(c) {
  const oldPos = positionMap.get(c);
  const newPos = newPositionMap.get(c);
  const dx = oldPos.left - newPos.left;
  const dy = oldPos.top - newPos.top;
  if (dx || dy) {
    const el = c.el;
    const s = el.style;
    const rect = el.getBoundingClientRect();
    let scaleX = 1;
    let scaleY = 1;
    if (el.offsetWidth) scaleX = rect.width / el.offsetWidth;
    if (el.offsetHeight) scaleY = rect.height / el.offsetHeight;
    if (!Number.isFinite(scaleX) || scaleX === 0) scaleX = 1;
    if (!Number.isFinite(scaleY) || scaleY === 0) scaleY = 1;
    if (Math.abs(scaleX - 1) < 0.01) scaleX = 1;
    if (Math.abs(scaleY - 1) < 0.01) scaleY = 1;
    s.transform = s.webkitTransform = `translate(${dx / scaleX}px,${dy / scaleY}px)`;
    s.transitionDuration = "0s";
    return c;
  }
}
function getPosition(el) {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top
  };
}
function hasCSSTransform(el, root, moveClass) {
  const clone = el.cloneNode();
  const _vtc = el[vtcKey];
  if (_vtc) {
    _vtc.forEach((cls) => {
      cls.split(/\s+/).forEach((c) => c && clone.classList.remove(c));
    });
  }
  moveClass.split(/\s+/).forEach((c) => c && clone.classList.add(c));
  clone.style.display = "none";
  const container = root.nodeType === 1 ? root : root.parentNode;
  container.appendChild(clone);
  const { hasTransform } = getTransitionInfo(clone);
  container.removeChild(clone);
  return hasTransform;
}
function onCompositionStart(e) {
  e.target.composing = true;
}
function onCompositionEnd(e) {
  const target = e.target;
  if (target.composing) {
    target.composing = false;
    target.dispatchEvent(new Event("input"));
  }
}
function castValue(value, trim, number) {
  if (trim) value = value.trim();
  if (number) value = looseToNumber(value);
  return value;
}
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions));
}
function resolveRootNamespace(container) {
  if (container instanceof SVGElement) {
    return "svg";
  }
  if (typeof MathMLElement === "function" && container instanceof MathMLElement) {
    return "mathml";
  }
}
function injectNativeTagCheck(app) {
  Object.defineProperty(app.config, "isNativeTag", {
    value: (tag) => isHTMLTag(tag) || isSVGTag(tag) || isMathMLTag(tag),
    writable: false
  });
}
function injectCompilerOptionsCheck(app) {
  if (isRuntimeOnly()) {
    const isCustomElement = app.config.isCustomElement;
    Object.defineProperty(app.config, "isCustomElement", {
      get() {
        return isCustomElement;
      },
      set() {
        warn2(
          `The \`isCustomElement\` config option is deprecated. Use \`compilerOptions.isCustomElement\` instead.`
        );
      }
    });
    const compilerOptions = app.config.compilerOptions;
    const msg = `The \`compilerOptions\` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, \`compilerOptions\` must be passed to \`@vue/compiler-dom\` in the build setup instead.
- For vue-loader: pass it via vue-loader's \`compilerOptions\` loader option.
- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader
- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-sfc`;
    Object.defineProperty(app.config, "compilerOptions", {
      get() {
        warn2(msg);
        return compilerOptions;
      },
      set() {
        warn2(msg);
      }
    });
  }
}
function normalizeContainer(container) {
  if (isString(container)) {
    const res = document.querySelector(container);
    if (!res) {
      warn2(
        `Failed to mount app: mount target selector "${container}" returned null.`
      );
    }
    return res;
  }
  if (window.ShadowRoot && container instanceof window.ShadowRoot && container.mode === "closed") {
    warn2(
      `mounting on a ShadowRoot with \`{mode: "closed"}\` may lead to unpredictable bugs`
    );
  }
  return container;
}
var policy, tt, unsafeToTrustedHTML, svgNS, mathmlNS, doc, templateContainer, nodeOps, TRANSITION, ANIMATION, vtcKey, DOMTransitionPropsValidators, TransitionPropsValidators, decorate$1, Transition, callHook2, hasExplicitCallback, endId, vShowOriginalDisplay, vShowHidden, vShow, CSS_VAR_TEXT, displayRE, semicolonRE, importantRE, prefixes, prefixCache, xlinkNS, veiKey, optionsModifierRE, cachedNow, p, getNow, isNativeOn, patchProp, positionMap, newPositionMap, moveCbKey, enterCbKey2, decorate, TransitionGroupImpl, TransitionGroup, getModelAssigner, assignKey, vModelText, systemModifiers, modifierGuards, withModifiers, keyNames, withKeys, rendererOptions, renderer, createApp;
var init_runtime_dom_esm_bundler = __esm({
  "node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js"() {
    init_runtime_core_esm_bundler();
    init_runtime_core_esm_bundler();
    init_shared_esm_bundler();
    policy = void 0;
    tt = typeof window !== "undefined" && window.trustedTypes;
    if (tt) {
      try {
        policy = /* @__PURE__ */ tt.createPolicy("vue", {
          createHTML: (val) => val
        });
      } catch (e) {
        warn2(`Error creating trusted types policy: ${e}`);
      }
    }
    unsafeToTrustedHTML = policy ? (val) => policy.createHTML(val) : (val) => val;
    svgNS = "http://www.w3.org/2000/svg";
    mathmlNS = "http://www.w3.org/1998/Math/MathML";
    doc = typeof document !== "undefined" ? document : null;
    templateContainer = doc && /* @__PURE__ */ doc.createElement("template");
    nodeOps = {
      insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null);
      },
      remove: (child) => {
        const parent = child.parentNode;
        if (parent) {
          parent.removeChild(child);
        }
      },
      createElement: (tag, namespace, is, props) => {
        const el = namespace === "svg" ? doc.createElementNS(svgNS, tag) : namespace === "mathml" ? doc.createElementNS(mathmlNS, tag) : is ? doc.createElement(tag, { is }) : doc.createElement(tag);
        if (tag === "select" && props && props.multiple != null) {
          el.setAttribute("multiple", props.multiple);
        }
        return el;
      },
      createText: (text) => doc.createTextNode(text),
      createComment: (text) => doc.createComment(text),
      setText: (node, text) => {
        node.nodeValue = text;
      },
      setElementText: (el, text) => {
        el.textContent = text;
      },
      parentNode: (node) => node.parentNode,
      nextSibling: (node) => node.nextSibling,
      querySelector: (selector) => doc.querySelector(selector),
      setScopeId(el, id) {
        el.setAttribute(id, "");
      },
      // __UNSAFE__
      // Reason: innerHTML.
      // Static content here can only come from compiled templates.
      // As long as the user only uses trusted templates, this is safe.
      insertStaticContent(content, parent, anchor, namespace, start, end) {
        const before = anchor ? anchor.previousSibling : parent.lastChild;
        if (start && (start === end || start.nextSibling)) {
          while (true) {
            parent.insertBefore(start.cloneNode(true), anchor);
            if (start === end || !(start = start.nextSibling)) break;
          }
        } else {
          templateContainer.innerHTML = unsafeToTrustedHTML(
            namespace === "svg" ? `<svg>${content}</svg>` : namespace === "mathml" ? `<math>${content}</math>` : content
          );
          const template = templateContainer.content;
          if (namespace === "svg" || namespace === "mathml") {
            const wrapper = template.firstChild;
            while (wrapper.firstChild) {
              template.appendChild(wrapper.firstChild);
            }
            template.removeChild(wrapper);
          }
          parent.insertBefore(template, anchor);
        }
        return [
          // first
          before ? before.nextSibling : parent.firstChild,
          // last
          anchor ? anchor.previousSibling : parent.lastChild
        ];
      }
    };
    TRANSITION = "transition";
    ANIMATION = "animation";
    vtcKey = /* @__PURE__ */ Symbol("_vtc");
    DOMTransitionPropsValidators = {
      name: String,
      type: String,
      css: {
        type: Boolean,
        default: true
      },
      duration: [String, Number, Object],
      enterFromClass: String,
      enterActiveClass: String,
      enterToClass: String,
      appearFromClass: String,
      appearActiveClass: String,
      appearToClass: String,
      leaveFromClass: String,
      leaveActiveClass: String,
      leaveToClass: String
    };
    TransitionPropsValidators = /* @__PURE__ */ extend(
      {},
      BaseTransitionPropsValidators,
      DOMTransitionPropsValidators
    );
    decorate$1 = (t) => {
      t.displayName = "Transition";
      t.props = TransitionPropsValidators;
      return t;
    };
    Transition = /* @__PURE__ */ decorate$1(
      (props, { slots }) => h(BaseTransition, resolveTransitionProps(props), slots)
    );
    callHook2 = (hook, args = []) => {
      if (isArray(hook)) {
        hook.forEach((h2) => h2(...args));
      } else if (hook) {
        hook(...args);
      }
    };
    hasExplicitCallback = (hook) => {
      return hook ? isArray(hook) ? hook.some((h2) => h2.length > 1) : hook.length > 1 : false;
    };
    endId = 0;
    vShowOriginalDisplay = /* @__PURE__ */ Symbol("_vod");
    vShowHidden = /* @__PURE__ */ Symbol("_vsh");
    vShow = {
      // used for prop mismatch check during hydration
      name: "show",
      beforeMount(el, { value }, { transition }) {
        el[vShowOriginalDisplay] = el.style.display === "none" ? "" : el.style.display;
        if (transition && value) {
          transition.beforeEnter(el);
        } else {
          setDisplay(el, value);
        }
      },
      mounted(el, { value }, { transition }) {
        if (transition && value) {
          transition.enter(el);
        }
      },
      updated(el, { value, oldValue }, { transition }) {
        if (!value === !oldValue) return;
        if (transition) {
          if (value) {
            transition.beforeEnter(el);
            setDisplay(el, true);
            transition.enter(el);
          } else {
            transition.leave(el, () => {
              setDisplay(el, false);
            });
          }
        } else {
          setDisplay(el, value);
        }
      },
      beforeUnmount(el, { value }) {
        setDisplay(el, value);
      }
    };
    CSS_VAR_TEXT = /* @__PURE__ */ Symbol(true ? "CSS_VAR_TEXT" : "");
    displayRE = /(?:^|;)\s*display\s*:/;
    semicolonRE = /[^\\];\s*$/;
    importantRE = /\s*!important$/;
    prefixes = ["Webkit", "Moz", "ms"];
    prefixCache = {};
    xlinkNS = "http://www.w3.org/1999/xlink";
    veiKey = /* @__PURE__ */ Symbol("_vei");
    optionsModifierRE = /(?:Once|Passive|Capture)$/;
    cachedNow = 0;
    p = /* @__PURE__ */ Promise.resolve();
    getNow = () => cachedNow || (p.then(() => cachedNow = 0), cachedNow = Date.now());
    isNativeOn = (key) => key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && // lowercase letter
    key.charCodeAt(2) > 96 && key.charCodeAt(2) < 123;
    patchProp = (el, key, prevValue, nextValue, namespace, parentComponent) => {
      const isSVG = namespace === "svg";
      if (key === "class") {
        patchClass(el, nextValue, isSVG);
      } else if (key === "style") {
        patchStyle(el, prevValue, nextValue);
      } else if (isOn(key)) {
        if (!isModelListener(key)) {
          patchEvent(el, key, prevValue, nextValue, parentComponent);
        }
      } else if (key[0] === "." ? (key = key.slice(1), true) : key[0] === "^" ? (key = key.slice(1), false) : shouldSetAsProp(el, key, nextValue, isSVG)) {
        patchDOMProp(el, key, nextValue);
        if (!el.tagName.includes("-") && (key === "value" || key === "checked" || key === "selected")) {
          patchAttr(el, key, nextValue, isSVG, parentComponent, key !== "value");
        }
      } else if (
        // #11081 force set props for possible async custom element
        el._isVueCE && // #12408 check if it's declared prop or it's async custom element
        (shouldSetAsPropForVueCE(el, key) || // @ts-expect-error _def is private
        el._def.__asyncLoader && (/[A-Z]/.test(key) || !isString(nextValue)))
      ) {
        patchDOMProp(el, camelize(key), nextValue, parentComponent, key);
      } else {
        if (key === "true-value") {
          el._trueValue = nextValue;
        } else if (key === "false-value") {
          el._falseValue = nextValue;
        }
        patchAttr(el, key, nextValue, isSVG);
      }
    };
    positionMap = /* @__PURE__ */ new WeakMap();
    newPositionMap = /* @__PURE__ */ new WeakMap();
    moveCbKey = /* @__PURE__ */ Symbol("_moveCb");
    enterCbKey2 = /* @__PURE__ */ Symbol("_enterCb");
    decorate = (t) => {
      delete t.props.mode;
      return t;
    };
    TransitionGroupImpl = /* @__PURE__ */ decorate({
      name: "TransitionGroup",
      props: /* @__PURE__ */ extend({}, TransitionPropsValidators, {
        tag: String,
        moveClass: String
      }),
      setup(props, { slots }) {
        const instance = getCurrentInstance();
        const state2 = useTransitionState();
        let prevChildren;
        let children;
        onUpdated(() => {
          if (!prevChildren.length) {
            return;
          }
          const moveClass = props.moveClass || `${props.name || "v"}-move`;
          if (!hasCSSTransform(
            prevChildren[0].el,
            instance.vnode.el,
            moveClass
          )) {
            prevChildren = [];
            return;
          }
          prevChildren.forEach(callPendingCbs);
          prevChildren.forEach(recordPosition);
          const movedChildren = prevChildren.filter(applyTranslation);
          forceReflow(instance.vnode.el);
          movedChildren.forEach((c) => {
            const el = c.el;
            const style = el.style;
            addTransitionClass(el, moveClass);
            style.transform = style.webkitTransform = style.transitionDuration = "";
            const cb = el[moveCbKey] = (e) => {
              if (e && e.target !== el) {
                return;
              }
              if (!e || e.propertyName.endsWith("transform")) {
                el.removeEventListener("transitionend", cb);
                el[moveCbKey] = null;
                removeTransitionClass(el, moveClass);
              }
            };
            el.addEventListener("transitionend", cb);
          });
          prevChildren = [];
        });
        return () => {
          const rawProps = toRaw(props);
          const cssTransitionProps = resolveTransitionProps(rawProps);
          let tag = rawProps.tag || Fragment;
          prevChildren = [];
          if (children) {
            for (let i = 0; i < children.length; i++) {
              const child = children[i];
              if (child.el && child.el instanceof Element && // Hidden v-show nodes have no previous layout box to animate from.
              !child.el[vShowHidden]) {
                prevChildren.push(child);
                setTransitionHooks(
                  child,
                  resolveTransitionHooks(
                    child,
                    cssTransitionProps,
                    state2,
                    instance
                  )
                );
                positionMap.set(child, getPosition(child.el));
              }
            }
          }
          children = slots.default ? getTransitionRawChildren(slots.default()) : [];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.key != null) {
              setTransitionHooks(
                child,
                resolveTransitionHooks(child, cssTransitionProps, state2, instance)
              );
            } else if (child.type !== Text) {
              warn2(`<TransitionGroup> children must be keyed.`);
            }
          }
          return createVNode(tag, null, children);
        };
      }
    });
    TransitionGroup = TransitionGroupImpl;
    getModelAssigner = (vnode) => {
      const fn = vnode.props["onUpdate:modelValue"] || false;
      return isArray(fn) ? (value) => invokeArrayFns(fn, value) : fn;
    };
    assignKey = /* @__PURE__ */ Symbol("_assign");
    vModelText = {
      created(el, { modifiers: { lazy, trim, number } }, vnode) {
        el[assignKey] = getModelAssigner(vnode);
        const castToNumber = number || vnode.props && vnode.props.type === "number";
        addEventListener(el, lazy ? "change" : "input", (e) => {
          if (e.target.composing) return;
          el[assignKey](castValue(el.value, trim, castToNumber));
        });
        if (trim || castToNumber) {
          addEventListener(el, "change", () => {
            el.value = castValue(el.value, trim, castToNumber);
          });
        }
        if (!lazy) {
          addEventListener(el, "compositionstart", onCompositionStart);
          addEventListener(el, "compositionend", onCompositionEnd);
          addEventListener(el, "change", onCompositionEnd);
        }
      },
      // set value on mounted so it's after min/max for type="range"
      mounted(el, { value }) {
        el.value = value == null ? "" : value;
      },
      beforeUpdate(el, { value, oldValue, modifiers: { lazy, trim, number } }, vnode) {
        el[assignKey] = getModelAssigner(vnode);
        if (el.composing) return;
        const elValue = (number || el.type === "number") && !/^0\d/.test(el.value) ? looseToNumber(el.value) : el.value;
        const newValue = value == null ? "" : value;
        if (elValue === newValue) {
          return;
        }
        const rootNode = el.getRootNode();
        if ((rootNode instanceof Document || rootNode instanceof ShadowRoot) && rootNode.activeElement === el && el.type !== "range") {
          if (lazy && value === oldValue) {
            return;
          }
          if (trim && el.value.trim() === newValue) {
            return;
          }
        }
        el.value = newValue;
      }
    };
    systemModifiers = ["ctrl", "shift", "alt", "meta"];
    modifierGuards = {
      stop: (e) => e.stopPropagation(),
      prevent: (e) => e.preventDefault(),
      self: (e) => e.target !== e.currentTarget,
      ctrl: (e) => !e.ctrlKey,
      shift: (e) => !e.shiftKey,
      alt: (e) => !e.altKey,
      meta: (e) => !e.metaKey,
      left: (e) => "button" in e && e.button !== 0,
      middle: (e) => "button" in e && e.button !== 1,
      right: (e) => "button" in e && e.button !== 2,
      exact: (e, modifiers) => systemModifiers.some((m) => e[`${m}Key`] && !modifiers.includes(m))
    };
    withModifiers = (fn, modifiers) => {
      if (!fn) return fn;
      const cache = fn._withMods || (fn._withMods = {});
      const cacheKey = modifiers.join(".");
      return cache[cacheKey] || (cache[cacheKey] = ((event, ...args) => {
        for (let i = 0; i < modifiers.length; i++) {
          const guard = modifierGuards[modifiers[i]];
          if (guard && guard(event, modifiers)) return;
        }
        return fn(event, ...args);
      }));
    };
    keyNames = {
      esc: "escape",
      space: " ",
      up: "arrow-up",
      left: "arrow-left",
      right: "arrow-right",
      down: "arrow-down",
      delete: "backspace"
    };
    withKeys = (fn, modifiers) => {
      const cache = fn._withKeys || (fn._withKeys = {});
      const cacheKey = modifiers.join(".");
      return cache[cacheKey] || (cache[cacheKey] = ((event) => {
        if (!("key" in event)) {
          return;
        }
        const eventKey = hyphenate(event.key);
        if (modifiers.some(
          (k) => k === eventKey || keyNames[k] === eventKey
        )) {
          return fn(event);
        }
      }));
    };
    rendererOptions = /* @__PURE__ */ extend({ patchProp }, nodeOps);
    createApp = ((...args) => {
      const app = ensureRenderer().createApp(...args);
      if (true) {
        injectNativeTagCheck(app);
        injectCompilerOptionsCheck(app);
      }
      const { mount } = app;
      app.mount = (containerOrSelector) => {
        const container = normalizeContainer(containerOrSelector);
        if (!container) return;
        const component = app._component;
        if (!isFunction(component) && !component.render && !component.template) {
          component.template = container.innerHTML;
        }
        if (container.nodeType === 1) {
          container.textContent = "";
        }
        const proxy = mount(container, false, resolveRootNamespace(container));
        if (container instanceof Element) {
          container.removeAttribute("v-cloak");
          container.setAttribute("data-v-app", "");
        }
        return proxy;
      };
      return app;
    });
  }
});

// node_modules/vue/dist/vue.runtime.esm-bundler.js
function initDev() {
  {
    initCustomFormatter();
  }
}
var init_vue_runtime_esm_bundler = __esm({
  "node_modules/vue/dist/vue.runtime.esm-bundler.js"() {
    init_runtime_dom_esm_bundler();
    init_runtime_dom_esm_bundler();
    if (true) {
      initDev();
    }
  }
});

// node_modules/@baklavajs/renderer-vue/dist/renderer-vue.es.mjs
function isInputElement(el) {
  return INPUT_ELEMENT_TAGS.includes(el.tagName);
}
function providePlugin(viewModel) {
  viewModelRef = viewModel;
}
function useViewModel() {
  if (!viewModelRef) {
    throw new Error("providePlugin() must be called before usePlugin()");
  }
  return {
    viewModel: viewModelRef
  };
}
function useGraph() {
  const { viewModel } = useViewModel();
  return {
    graph: toRef(viewModel.value, "displayedGraph"),
    switchGraph: viewModel.value.switchGraph
  };
}
function useDragMove(positionRef) {
  const { graph } = useGraph();
  const draggingStartPoint = ref(null);
  const draggingStartPosition = ref(null);
  const dragging = computed2(() => !!draggingStartPoint.value);
  const onPointerDown = (ev) => {
    draggingStartPoint.value = {
      x: ev.pageX,
      y: ev.pageY
    };
    draggingStartPosition.value = {
      x: positionRef.value.x,
      y: positionRef.value.y
    };
  };
  const onPointerMove = (ev) => {
    if (draggingStartPoint.value) {
      const dx = ev.pageX - draggingStartPoint.value.x;
      const dy = ev.pageY - draggingStartPoint.value.y;
      positionRef.value.x = draggingStartPosition.value.x + dx / graph.value.scaling;
      positionRef.value.y = draggingStartPosition.value.y + dy / graph.value.scaling;
    }
  };
  const onPointerUp = () => {
    draggingStartPoint.value = null;
    draggingStartPosition.value = null;
  };
  return { dragging, onPointerDown, onPointerMove, onPointerUp };
}
function checkRecursion(editor, currentGraph, graphNodeType) {
  if (!currentGraph.template) {
    return false;
  }
  if (getGraphNodeTypeString(currentGraph.template) === graphNodeType) {
    return true;
  }
  const template = editor.graphTemplates.find((t) => getGraphNodeTypeString(t) === graphNodeType);
  if (!template) {
    return false;
  }
  const containedGraphNodes = template.nodes.filter((n) => n.type.startsWith(GRAPH_NODE_TYPE_PREFIX));
  return containedGraphNodes.some((n) => checkRecursion(editor, currentGraph, n.type));
}
function useNodeCategories(viewModel) {
  return computed2(() => {
    const nodeTypeEntries = Array.from(viewModel.value.editor.nodeTypes.entries());
    const categoryNames = new Set(nodeTypeEntries.map(([, ni]) => ni.category));
    const categories = [];
    for (const c of categoryNames.values()) {
      let nodeTypesInCategory = nodeTypeEntries.filter(([, ni]) => ni.category === c);
      if (viewModel.value.displayedGraph.template) {
        nodeTypesInCategory = nodeTypesInCategory.filter(
          ([nt]) => !checkRecursion(viewModel.value.editor, viewModel.value.displayedGraph, nt)
        );
      } else {
        nodeTypesInCategory = nodeTypesInCategory.filter(
          ([nt]) => ![GRAPH_INPUT_NODE_TYPE, GRAPH_OUTPUT_NODE_TYPE].includes(nt)
        );
      }
      if (nodeTypesInCategory.length > 0) {
        categories.push({
          name: c,
          nodeTypes: Object.fromEntries(nodeTypesInCategory)
        });
      }
    }
    categories.sort((a, b) => {
      if (a.name === "default") {
        return -1;
      } else if (b.name === "default") {
        return 1;
      } else {
        return a.name > b.name ? 1 : -1;
      }
    });
    return categories;
  });
}
function useTransform() {
  const { graph } = useGraph();
  const transform = (x, y) => {
    const tx = x / graph.value.scaling - graph.value.panning.x;
    const ty = y / graph.value.scaling - graph.value.panning.y;
    return [tx, ty];
  };
  return { transform };
}
function usePanZoom() {
  const { viewModel } = useViewModel();
  const { graph } = useGraph();
  let pointerCache = [];
  let prevDiff = -1;
  let midpoint = { x: 0, y: 0 };
  const panningRef = computed2(() => graph.value.panning);
  const dragMove = useDragMove(panningRef);
  const styles = computed2(() => ({
    "transform-origin": "0 0",
    "transform": `scale(${graph.value.scaling}) translate(${graph.value.panning.x}px, ${graph.value.panning.y}px)`
  }));
  const applyZoom = (centerX, centerY, newScale) => {
    if (newScale < viewModel.value.settings.panZoom.minScale) {
      newScale = viewModel.value.settings.panZoom.minScale;
    } else if (newScale > viewModel.value.settings.panZoom.maxScale) {
      newScale = viewModel.value.settings.panZoom.maxScale;
    }
    const currentPoint = [
      centerX / graph.value.scaling - graph.value.panning.x,
      centerY / graph.value.scaling - graph.value.panning.y
    ];
    const newPoint = [centerX / newScale - graph.value.panning.x, centerY / newScale - graph.value.panning.y];
    const diff = [newPoint[0] - currentPoint[0], newPoint[1] - currentPoint[1]];
    graph.value.panning.x += diff[0];
    graph.value.panning.y += diff[1];
    graph.value.scaling = newScale;
  };
  const onMouseWheel = (ev) => {
    ev.preventDefault();
    let scrollAmount = ev.deltaY;
    if (ev.deltaMode === 1) {
      scrollAmount *= 32;
    }
    const newScale = graph.value.scaling * (1 - scrollAmount / 3e3);
    applyZoom(ev.offsetX, ev.offsetY, newScale);
  };
  const getCoordsFromCache = () => ({
    ax: pointerCache[0].clientX,
    ay: pointerCache[0].clientY,
    bx: pointerCache[1].clientX,
    by: pointerCache[1].clientY
  });
  const onPointerDown = (ev) => {
    pointerCache.push(ev);
    dragMove.onPointerDown(ev);
    if (pointerCache.length === 2) {
      const { ax, ay, bx, by } = getCoordsFromCache();
      midpoint = {
        x: ax + (bx - ax) / 2,
        y: ay + (by - ay) / 2
      };
    }
  };
  const onPointerMove = (ev) => {
    for (let i = 0; i < pointerCache.length; i++) {
      if (ev.pointerId == pointerCache[i].pointerId) {
        pointerCache[i] = ev;
        break;
      }
    }
    if (pointerCache.length == 2) {
      const { ax, ay, bx, by } = getCoordsFromCache();
      const dx = ax - bx;
      const dy = ay - by;
      const curDiff = Math.sqrt(dx * dx + dy * dy);
      if (prevDiff > 0) {
        const newScale = graph.value.scaling * (1 + (curDiff - prevDiff) / 500);
        applyZoom(midpoint.x, midpoint.y, newScale);
      }
      prevDiff = curDiff;
    } else {
      dragMove.onPointerMove(ev);
    }
  };
  const onPointerUp = (ev) => {
    pointerCache = pointerCache.filter((p2) => p2.pointerId !== ev.pointerId);
    prevDiff = -1;
    dragMove.onPointerUp();
  };
  return { styles, ...dragMove, onPointerDown, onPointerMove, onPointerUp, onMouseWheel };
}
function provideTemporaryConnection() {
  const { graph } = useGraph();
  const temporaryConnection = ref(null);
  const hoveringOver = ref(null);
  const onMouseMove = (ev) => {
    if (temporaryConnection.value) {
      temporaryConnection.value.mx = ev.offsetX / graph.value.scaling - graph.value.panning.x;
      temporaryConnection.value.my = ev.offsetY / graph.value.scaling - graph.value.panning.y;
    }
  };
  const onMouseDown = () => {
    if (hoveringOver.value) {
      if (temporaryConnection.value) {
        return;
      }
      const connection = graph.value.connections.find((c) => c.to === hoveringOver.value);
      if (hoveringOver.value.isInput && connection) {
        temporaryConnection.value = {
          status: TemporaryConnectionState.NONE,
          from: connection.from
        };
        graph.value.removeConnection(connection);
      } else {
        temporaryConnection.value = {
          status: TemporaryConnectionState.NONE,
          from: hoveringOver.value
        };
      }
      temporaryConnection.value.mx = void 0;
      temporaryConnection.value.my = void 0;
    }
  };
  const onMouseUp = () => {
    if (temporaryConnection.value && hoveringOver.value) {
      if (temporaryConnection.value.from === hoveringOver.value) {
        return;
      }
      graph.value.addConnection(temporaryConnection.value.from, temporaryConnection.value.to);
    }
    temporaryConnection.value = null;
  };
  const hoveredOver = (ni) => {
    hoveringOver.value = ni ?? null;
    if (ni && temporaryConnection.value) {
      temporaryConnection.value.to = ni;
      const checkConnectionResult = graph.value.checkConnection(
        temporaryConnection.value.from,
        temporaryConnection.value.to
      );
      temporaryConnection.value.status = checkConnectionResult.connectionAllowed ? TemporaryConnectionState.ALLOWED : TemporaryConnectionState.FORBIDDEN;
      if (checkConnectionResult.connectionAllowed) {
        const ids = checkConnectionResult.connectionsInDanger.map((c) => c.id);
        graph.value.connections.forEach((c) => {
          if (ids.includes(c.id)) {
            c.isInDanger = true;
          }
        });
      }
    } else if (!ni && temporaryConnection.value) {
      temporaryConnection.value.to = void 0;
      temporaryConnection.value.status = TemporaryConnectionState.NONE;
      graph.value.connections.forEach((c) => {
        c.isInDanger = false;
      });
    }
  };
  provide(TEMPORARY_CONNECTION_HANDLER_INJECTION_SYMBOL, {
    temporaryConnection,
    hoveredOver
  });
  return { temporaryConnection, onMouseMove, onMouseDown, onMouseUp, hoveredOver };
}
function useTemporaryConnection() {
  const temporaryConnection = inject(TEMPORARY_CONNECTION_HANDLER_INJECTION_SYMBOL);
  if (!temporaryConnection) {
    throw new Error("useTemporaryConnection must be used within a BaklavaEditor");
  }
  return temporaryConnection;
}
function useContextMenu(viewModel) {
  const show = ref(false);
  const x = ref(0);
  const y = ref(0);
  const categories = useNodeCategories(viewModel);
  const { transform } = useTransform();
  const nodeItems = computed2(() => {
    let defaultNodes = [];
    const categoryItems = {};
    for (const category of categories.value) {
      const mappedNodes = Object.entries(category.nodeTypes).map(([nodeType, info]) => ({
        label: info.title,
        value: "addNode:" + nodeType
      }));
      if (category.name === "default") {
        defaultNodes = mappedNodes;
      } else {
        categoryItems[category.name] = mappedNodes;
      }
    }
    const menuItems = [
      ...Object.entries(categoryItems).map(([category, items2]) => ({
        label: category,
        submenu: items2
      }))
    ];
    if (menuItems.length > 0 && defaultNodes.length > 0) {
      menuItems.push({ isDivider: true });
    }
    menuItems.push(...defaultNodes);
    return menuItems;
  });
  const items = computed2(() => {
    if (viewModel.value.settings.contextMenu.additionalItems.length === 0) {
      return nodeItems.value;
    } else {
      return [
        { label: "Add node", submenu: nodeItems.value },
        ...viewModel.value.settings.contextMenu.additionalItems.map((item) => {
          if ("isDivider" in item || "submenu" in item) {
            return item;
          } else {
            return {
              label: item.label,
              value: "command:" + item.command,
              disabled: !viewModel.value.commandHandler.canExecuteCommand(item.command)
            };
          }
        })
      ];
    }
  });
  function open(ev) {
    const target = ev.target;
    if (!(target instanceof Element) || isInputElement(target)) {
      return;
    }
    ev.preventDefault();
    show.value = true;
    const bounding = target.getBoundingClientRect();
    const editor = target.closest(".baklava-editor");
    const editorBounding = editor.getBoundingClientRect();
    x.value = bounding.x + ev.offsetX - editorBounding.x;
    y.value = bounding.y + ev.offsetY - editorBounding.y;
  }
  function onClick(value) {
    if (value.startsWith("addNode:")) {
      const nodeType = value.substring("addNode:".length);
      const nodeInformation = viewModel.value.editor.nodeTypes.get(nodeType);
      if (!nodeInformation) {
        return;
      }
      const instance = reactive(new nodeInformation.type());
      viewModel.value.displayedGraph.addNode(instance);
      const [transformedX, transformedY] = transform(x.value, y.value);
      instance.position.x = transformedX;
      instance.position.y = transformedY;
    } else if (value.startsWith("command:")) {
      const command = value.substring("command:".length);
      if (viewModel.value.commandHandler.canExecuteCommand(command)) {
        viewModel.value.commandHandler.executeCommand(command);
      }
    }
  }
  return { show, x, y, items, open, onClick };
}
function useSelectionBox(editorEl) {
  const { viewModel } = useViewModel();
  const { graph } = useGraph();
  const nodes = computed2(() => graph.value.nodes);
  const startSelection = ref(false);
  const isSelecting = ref(false);
  const start = ref([0, 0]);
  const end = ref([0, 0]);
  watch2(
    viewModel,
    () => {
      if (viewModel.value.commandHandler.hasCommand(START_SELECTION_BOX_COMMAND)) {
        return;
      }
      viewModel.value.commandHandler.registerCommand(START_SELECTION_BOX_COMMAND, {
        canExecute: () => true,
        execute() {
          startSelection.value = true;
        }
      });
      viewModel.value.commandHandler.registerHotkey(["b"], START_SELECTION_BOX_COMMAND);
    },
    { immediate: true }
  );
  function getCoordinatesFromEvent(ev) {
    return [
      ev.clientX - editorEl.value.getBoundingClientRect().left,
      ev.clientY - editorEl.value.getBoundingClientRect().top
    ];
  }
  function onPointerDown(ev) {
    if (startSelection.value) {
      isSelecting.value = true;
      startSelection.value = false;
      start.value = getCoordinatesFromEvent(ev);
      end.value = getCoordinatesFromEvent(ev);
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      return true;
    }
    return false;
  }
  function onPointerMove(ev) {
    start.value = getCoordinatesFromEvent(ev);
  }
  function onPointerUp(ev) {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    start.value = getCoordinatesFromEvent(ev);
    isSelecting.value = false;
    const selectedNodes = getNodesInSelection();
    for (const node of selectedNodes) {
      viewModel.value.displayedGraph.selectedNodes.push(node);
    }
  }
  function getNodesInSelection() {
    const selectionBoxRect = getSelectionBoxRect();
    const editor = document.querySelector(".baklava-editor");
    const editorBounding = editor.getBoundingClientRect();
    return nodes.value.filter((node) => {
      const nodeRect = getNodeRect2(node, editorBounding);
      return isRectOverlap(selectionBoxRect, nodeRect);
    });
  }
  function getSelectionBoxRect() {
    return {
      left: Math.min(start.value[0], end.value[0]),
      top: Math.min(start.value[1], end.value[1]),
      right: Math.max(start.value[0], end.value[0]),
      bottom: Math.max(start.value[1], end.value[1])
    };
  }
  function getNodeRect2(node, editorBounding) {
    const domNode = document.getElementById(node.id);
    const rect = domNode ? domNode.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
    const left = rect.x - editorBounding.left;
    const top = rect.y - editorBounding.top;
    return {
      left,
      top,
      right: left + rect.width,
      bottom: top + rect.height
    };
  }
  function isRectOverlap(rect1, rect2) {
    return rect1.left < rect2.right && rect1.right > rect2.left && rect1.top < rect2.bottom && rect1.bottom > rect2.top;
  }
  function getStyles() {
    return {
      width: Math.abs(end.value[0] - start.value[0]) + "px",
      height: Math.abs(end.value[1] - start.value[1]) + "px",
      left: (end.value[0] > start.value[0] ? start.value[0] : end.value[0]) + "px",
      top: (end.value[1] > start.value[1] ? start.value[1] : end.value[1]) + "px"
    };
  }
  return reactive({
    startSelection,
    isSelecting,
    start,
    end,
    onPointerDown,
    getStyles
  });
}
function _sfc_render$p(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", {
    class: "background",
    style: normalizeStyle(_ctx.styles)
  }, null, 4);
}
function tryOnScopeDispose(fn, failSilently) {
  if (getCurrentScope()) {
    onScopeDispose(fn, failSilently);
    return true;
  }
  return false;
}
function objectPick(obj, keys2, omitUndefined = false) {
  return keys2.reduce((n, k) => {
    if (k in obj) {
      if (!omitUndefined || obj[k] !== void 0) n[k] = obj[k];
    }
    return n;
  }, {});
}
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}
function toRefs2(objectRef, options = {}) {
  if (!isRef2(objectRef)) return toRefs(objectRef);
  const result = Array.isArray(objectRef.value) ? Array.from({ length: objectRef.value.length }) : {};
  for (const key in objectRef.value) result[key] = customRef(() => ({
    get() {
      return objectRef.value[key];
    },
    set(v) {
      var _toValue;
      if ((_toValue = toValue(options.replaceRef)) !== null && _toValue !== void 0 ? _toValue : true) if (Array.isArray(objectRef.value)) {
        const copy = [...objectRef.value];
        copy[key] = v;
        objectRef.value = copy;
      } else {
        const newObject = {
          ...objectRef.value,
          [key]: v
        };
        Object.setPrototypeOf(newObject, Object.getPrototypeOf(objectRef.value));
        objectRef.value = newObject;
      }
      else objectRef.value[key] = v;
    }
  }));
  return result;
}
function watchImmediate(source, cb, options) {
  return watch2(source, cb, {
    ...options,
    immediate: true
  });
}
function unrefElement(elRef) {
  var _$el;
  const plain = toValue(elRef);
  return (_$el = plain === null || plain === void 0 ? void 0 : plain.$el) !== null && _$el !== void 0 ? _$el : plain;
}
function useEventListener(...args) {
  const cleanups = [];
  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
  const register = (el, event, listener, options) => {
    el.addEventListener(event, listener, options);
    return () => el.removeEventListener(event, listener, options);
  };
  const firstParamTargets = computed2(() => {
    const test = toArray(toValue(args[0])).filter((e) => e != null);
    return test.every((e) => typeof e !== "string") ? test : void 0;
  });
  const stopWatch = watchImmediate(() => {
    var _firstParamTargets$va, _firstParamTargets$va2;
    return [
      (_firstParamTargets$va = (_firstParamTargets$va2 = firstParamTargets.value) === null || _firstParamTargets$va2 === void 0 ? void 0 : _firstParamTargets$va2.map((e) => unrefElement(e))) !== null && _firstParamTargets$va !== void 0 ? _firstParamTargets$va : [defaultWindow].filter((e) => e != null),
      toArray(toValue(firstParamTargets.value ? args[1] : args[0])),
      toArray(unref(firstParamTargets.value ? args[2] : args[1])),
      toValue(firstParamTargets.value ? args[3] : args[2])
    ];
  }, ([raw_targets, raw_events, raw_listeners, raw_options]) => {
    cleanup();
    if (!(raw_targets === null || raw_targets === void 0 ? void 0 : raw_targets.length) || !(raw_events === null || raw_events === void 0 ? void 0 : raw_events.length) || !(raw_listeners === null || raw_listeners === void 0 ? void 0 : raw_listeners.length)) return;
    const optionsClone = isObject2(raw_options) ? { ...raw_options } : raw_options;
    cleanups.push(...raw_targets.flatMap((el) => raw_events.flatMap((event) => raw_listeners.map((listener) => register(el, event, listener, optionsClone)))));
  }, { flush: "post" });
  const stop2 = () => {
    stopWatch();
    cleanup();
  };
  tryOnScopeDispose(cleanup);
  return stop2;
}
function onClickOutside(target, handler, options = {}) {
  const { window: window$1 = defaultWindow, ignore = [], capture = true, detectIframe = false, controls = false } = options;
  if (!window$1) return controls ? {
    stop: noop,
    cancel: noop,
    trigger: noop
  } : noop;
  let shouldListen = true;
  const shouldIgnore = (event) => {
    return toValue(ignore).some((target$1) => {
      if (typeof target$1 === "string") return Array.from(window$1.document.querySelectorAll(target$1)).some((el) => el === event.target || event.composedPath().includes(el));
      else {
        const el = unrefElement(target$1);
        return el && (event.target === el || event.composedPath().includes(el));
      }
    });
  };
  function hasMultipleRoots(target$1) {
    const vm = toValue(target$1);
    return vm && vm.$.subTree.shapeFlag === 16;
  }
  function checkMultipleRoots(target$1, event) {
    const vm = toValue(target$1);
    const children = vm.$.subTree && vm.$.subTree.children;
    if (children == null || !Array.isArray(children)) return false;
    return children.some((child) => child.el === event.target || event.composedPath().includes(child.el));
  }
  const listener = (event) => {
    const el = unrefElement(target);
    if (event.target == null) return;
    if (!(el instanceof Element) && hasMultipleRoots(target) && checkMultipleRoots(target, event)) return;
    if (!el || el === event.target || event.composedPath().includes(el)) return;
    if ("detail" in event && event.detail === 0) shouldListen = !shouldIgnore(event);
    if (!shouldListen) {
      shouldListen = true;
      return;
    }
    handler(event);
  };
  let isProcessingClick = false;
  const cleanup = [
    useEventListener(window$1, "click", (event) => {
      if (!isProcessingClick) {
        isProcessingClick = true;
        setTimeout(() => {
          isProcessingClick = false;
        }, 0);
        listener(event);
      }
    }, {
      passive: true,
      capture
    }),
    useEventListener(window$1, "pointerdown", (e) => {
      const el = unrefElement(target);
      shouldListen = !shouldIgnore(e) && !!(el && !e.composedPath().includes(el));
    }, { passive: true }),
    detectIframe && useEventListener(window$1, "blur", (event) => {
      setTimeout(() => {
        var _window$document$acti;
        const el = unrefElement(target);
        if (((_window$document$acti = window$1.document.activeElement) === null || _window$document$acti === void 0 ? void 0 : _window$document$acti.tagName) === "IFRAME" && !(el === null || el === void 0 ? void 0 : el.contains(window$1.document.activeElement))) handler(event);
      }, 0);
    }, { passive: true })
  ].filter(Boolean);
  const stop2 = () => cleanup.forEach((fn) => fn());
  if (controls) return {
    stop: stop2,
    cancel: () => {
      shouldListen = false;
    },
    trigger: (event) => {
      shouldListen = true;
      listener(event);
      shouldListen = false;
    }
  };
  return stop2;
}
function usePointer(options = {}) {
  const { target = defaultWindow } = options;
  const isInside = shallowRef(false);
  const state2 = shallowRef(options.initialValue || {});
  Object.assign(state2.value, defaultState, state2.value);
  const handler = (event) => {
    isInside.value = true;
    if (options.pointerTypes && !options.pointerTypes.includes(event.pointerType)) return;
    state2.value = objectPick(event, keys, false);
  };
  if (target) {
    const listenerOptions = { passive: true };
    useEventListener(target, [
      "pointerdown",
      "pointermove",
      "pointerup"
    ], handler, listenerOptions);
    useEventListener(target, "pointerleave", () => isInside.value = false, listenerOptions);
  }
  return {
    ...toRefs2(state2),
    isInside
  };
}
function _sfc_render$o(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$r, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("circle", {
      cx: "12",
      cy: "12",
      r: "1"
    }, null, -1),
    createBaseVNode("circle", {
      cx: "12",
      cy: "19",
      r: "1"
    }, null, -1),
    createBaseVNode("circle", {
      cx: "12",
      cy: "5",
      r: "1"
    }, null, -1)
  ])]);
}
function _sfc_render$n(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("path", {
    class: normalizeClass(["baklava-connection", _ctx.classes]),
    d: _ctx.d
  }, null, 10, _hoisted_1$o);
}
function getDomElementOfNode(node) {
  return document.getElementById(node.id);
}
function getDomElements(ni) {
  const interfaceDOM = document.getElementById(ni.id);
  const portDOM = interfaceDOM?.getElementsByClassName("__port");
  return {
    node: interfaceDOM?.closest(".baklava-node") ?? null,
    interface: interfaceDOM,
    port: portDOM && portDOM.length > 0 ? portDOM[0] : null
  };
}
function _sfc_render$m(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_connection_view = resolveComponent("connection-view");
  return openBlock(), createBlock(_component_connection_view, {
    x1: _ctx.d.x1,
    y1: _ctx.d.y1,
    x2: _ctx.d.x2,
    y2: _ctx.d.y2,
    state: _ctx.state
  }, null, 8, ["x1", "y1", "x2", "y2", "state"]);
}
function getPortCoordinates(resolved) {
  if (resolved.node && resolved.interface && resolved.port) {
    return [
      resolved.node.offsetLeft + resolved.interface.offsetLeft + resolved.port.offsetLeft + resolved.port.clientWidth / 2,
      resolved.node.offsetTop + resolved.interface.offsetTop + resolved.port.offsetTop + resolved.port.clientHeight / 2
    ];
  } else {
    return [0, 0];
  }
}
function _sfc_render$l(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_connection_view = resolveComponent("connection-view");
  return openBlock(), createBlock(_component_connection_view, {
    x1: _ctx.d.input[0],
    y1: _ctx.d.input[1],
    x2: _ctx.d.output[0],
    y2: _ctx.d.output[1],
    state: _ctx.status,
    "is-temporary": ""
  }, null, 8, ["x1", "y1", "x2", "y2", "state"]);
}
function _sfc_render$k(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", {
    ref: "el",
    class: normalizeClass(["baklava-sidebar", { "--open": _ctx.graph.sidebar.visible }]),
    style: normalizeStyle(_ctx.styles)
  }, [
    _ctx.resizable ? (openBlock(), createElementBlock("div", {
      key: 0,
      class: "__resizer",
      onMousedown: _cache[0] || (_cache[0] = (...args) => _ctx.startResize && _ctx.startResize(...args))
    }, null, 32)) : createCommentVNode("", true),
    createBaseVNode("div", _hoisted_1$n, [
      createBaseVNode("button", {
        tabindex: "-1",
        class: "__close",
        onClick: _cache[1] || (_cache[1] = (...args) => _ctx.close && _ctx.close(...args))
      }, "\xD7"),
      createBaseVNode("div", _hoisted_2$6, [
        createBaseVNode("b", null, toDisplayString(_ctx.node ? _ctx.node.title : ""), 1)
      ])
    ]),
    (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.displayedInterfaces, (intf) => {
      return openBlock(), createElementBlock("div", {
        key: intf.id,
        class: "__interface"
      }, [
        (openBlock(), createBlock(resolveDynamicComponent(intf.component), {
          modelValue: intf.value,
          "onUpdate:modelValue": ($event) => intf.value = $event,
          node: _ctx.node,
          intf
        }, null, 8, ["modelValue", "onUpdate:modelValue", "node", "intf"]))
      ]);
    }), 128))
  ], 6);
}
function _sfc_render$j(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_vertical_dots = resolveComponent("vertical-dots");
  const _component_context_menu = resolveComponent("context-menu");
  return openBlock(), createElementBlock("div", {
    class: "baklava-node --palette",
    "data-node-type": _ctx.type
  }, [
    createBaseVNode("div", _hoisted_2$5, [
      createBaseVNode("div", _hoisted_3$4, toDisplayString(_ctx.title), 1),
      _ctx.hasContextMenu ? (openBlock(), createElementBlock("div", _hoisted_4$4, [
        createVNode(_component_vertical_dots, {
          class: "--clickable",
          onPointerdown: _cache[0] || (_cache[0] = withModifiers(() => {
          }, ["stop", "prevent"])),
          onClick: withModifiers(_ctx.openContextMenu, ["stop", "prevent"])
        }, null, 8, ["onClick"]),
        createVNode(_component_context_menu, {
          modelValue: _ctx.showContextMenu,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => _ctx.showContextMenu = $event),
          x: -100,
          y: 0,
          items: _ctx.contextMenuItems,
          onClick: _ctx.onContextMenuClick,
          onPointerdown: _cache[2] || (_cache[2] = withModifiers(() => {
          }, ["stop", "prevent"]))
        }, null, 8, ["modelValue", "items", "onClick"])
      ])) : createCommentVNode("", true)
    ])
  ], 8, _hoisted_1$m);
}
function _sfc_render$i(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("button", {
    class: "baklava-toolbar-entry baklava-toolbar-button",
    disabled: !_ctx.viewModel.commandHandler.canExecuteCommand(_ctx.command),
    title: _ctx.title,
    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.viewModel.commandHandler.executeCommand(_ctx.command))
  }, [
    _ctx.icon ? (openBlock(), createBlock(resolveDynamicComponent(_ctx.icon), { key: 0 })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
      createTextVNode(toDisplayString(_ctx.title), 1)
    ], 64))
  ], 8, _hoisted_1$k);
}
function useHotkeyHandler(executeCommand) {
  const pressedKeys = ref([]);
  const handlers = ref([]);
  const handleKeyDown = (ev) => {
    if (!pressedKeys.value.includes(ev.key)) {
      pressedKeys.value.push(ev.key);
    }
    if (document.activeElement && isInputElement(document.activeElement)) {
      return;
    }
    handlers.value.forEach((h2) => {
      if (h2.keys.every((k) => pressedKeys.value.includes(k))) {
        if (h2.options?.preventDefault) {
          ev.preventDefault();
        }
        if (h2.options?.stopPropagation) {
          ev.stopPropagation();
        }
        executeCommand(h2.commandName);
      }
    });
  };
  const handleKeyUp = (ev) => {
    const index = pressedKeys.value.indexOf(ev.key);
    if (index >= 0) {
      pressedKeys.value.splice(index, 1);
    }
  };
  const registerHotkey = (keys2, commandName, options) => {
    handlers.value.push({ keys: keys2, commandName, options });
  };
  return { pressedKeys, handleKeyDown, handleKeyUp, registerHotkey };
}
function unsafeStringify2(arr, offset = 0) {
  return (byteToHex2[arr[offset + 0]] + byteToHex2[arr[offset + 1]] + byteToHex2[arr[offset + 2]] + byteToHex2[arr[offset + 3]] + "-" + byteToHex2[arr[offset + 4]] + byteToHex2[arr[offset + 5]] + "-" + byteToHex2[arr[offset + 6]] + byteToHex2[arr[offset + 7]] + "-" + byteToHex2[arr[offset + 8]] + byteToHex2[arr[offset + 9]] + "-" + byteToHex2[arr[offset + 10]] + byteToHex2[arr[offset + 11]] + byteToHex2[arr[offset + 12]] + byteToHex2[arr[offset + 13]] + byteToHex2[arr[offset + 14]] + byteToHex2[arr[offset + 15]]).toLowerCase();
}
function rng2() {
  if (!getRandomValues2) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
    getRandomValues2 = crypto.getRandomValues.bind(crypto);
  }
  return getRandomValues2(rnds82);
}
function _v42(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng2();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify2(rnds);
}
function v42(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v42(options);
}
function registerSaveSubgraphCommand(displayedGraph, handler) {
  const saveSubgraph = () => {
    const graph = displayedGraph.value;
    if (!graph.template) {
      throw new Error("Graph template property not set");
    }
    graph.template.update(graph.save());
    graph.template.panning = graph.panning;
    graph.template.scaling = graph.scaling;
  };
  handler.registerCommand(SAVE_SUBGRAPH_COMMAND, {
    canExecute: () => displayedGraph.value !== displayedGraph.value.editor?.graph,
    execute: saveSubgraph
  });
}
function isValidator(intf) {
  return "validate" in intf;
}
function _sfc_render$g(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$g, [..._cache[0] || (_cache[0] = [
    createBaseVNode("polyline", { points: "6 9 12 15 18 9" }, null, -1)
  ])]);
}
function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [
    withDirectives(createBaseVNode("input", {
      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.v = $event),
      type: "text",
      class: "baklava-input",
      placeholder: _ctx.intf.name,
      title: _ctx.intf.name
    }, null, 8, _hoisted_1$b), [
      [vModelText, _ctx.v]
    ])
  ]);
}
function registerCreateSubgraphCommand(displayedGraph, handler, switchGraph) {
  const canCreateSubgraph = () => {
    return displayedGraph.value.selectedNodes.filter((n) => !IGNORE_NODE_TYPES.includes(n.type)).length > 0;
  };
  const createSubgraph = () => {
    const { viewModel } = useViewModel();
    const graph = displayedGraph.value;
    const editor = displayedGraph.value.editor;
    if (graph.selectedNodes.length === 0) {
      return;
    }
    const selectedNodes = graph.selectedNodes.filter((n) => !IGNORE_NODE_TYPES.includes(n.type));
    const selectedNodesInputs = selectedNodes.flatMap((n) => Object.values(n.inputs));
    const selectedNodesOutputs = selectedNodes.flatMap((n) => Object.values(n.outputs));
    const inputConnections = graph.connections.filter(
      (c) => !selectedNodesOutputs.includes(c.from) && selectedNodesInputs.includes(c.to)
    );
    const outputConnections = graph.connections.filter(
      (c) => selectedNodesOutputs.includes(c.from) && !selectedNodesInputs.includes(c.to)
    );
    const innerConnections = graph.connections.filter(
      (c) => selectedNodesOutputs.includes(c.from) && selectedNodesInputs.includes(c.to)
    );
    const nodeStates = selectedNodes.map((n) => n.save());
    const connectionStates = innerConnections.map((c) => ({
      id: c.id,
      from: c.from.id,
      to: c.to.id
    }));
    const interfaceIdMap = /* @__PURE__ */ new Map();
    const { xLeft, xRight, yTop } = getBoundingBoxForNodes(selectedNodes);
    for (const [idx, conn] of inputConnections.entries()) {
      const inputNode = new SubgraphInputNode();
      inputNode.inputs.name.value = conn.to.name;
      nodeStates.push({
        ...inputNode.save(),
        position: { x: xRight - viewModel.value.settings.nodes.defaultWidth - 100, y: yTop + idx * 200 }
      });
      connectionStates.push({ id: v42(), from: inputNode.outputs.placeholder.id, to: conn.to.id });
      interfaceIdMap.set(conn.to.id, inputNode.graphInterfaceId);
    }
    for (const [idx, conn] of outputConnections.entries()) {
      const outputNode = new SubgraphOutputNode();
      outputNode.inputs.name.value = conn.from.name;
      nodeStates.push({
        ...outputNode.save(),
        position: { x: xLeft + 100, y: yTop + idx * 200 }
      });
      connectionStates.push({ id: v42(), from: conn.from.id, to: outputNode.inputs.placeholder.id });
      interfaceIdMap.set(conn.from.id, outputNode.graphInterfaceId);
    }
    const subgraphTemplate = reactive(
      new GraphTemplate(
        {
          connections: connectionStates,
          nodes: nodeStates,
          // ignored, but still providing to make TS happy
          inputs: [],
          outputs: []
        },
        editor
      )
    );
    editor.addGraphTemplate(subgraphTemplate);
    const nt = editor.nodeTypes.get(getGraphNodeTypeString(subgraphTemplate));
    if (!nt) {
      throw new Error("Unable to create subgraph: Could not find corresponding graph node type");
    }
    graph.activeTransactions++;
    const node = reactive(new nt.type());
    graph.addNode(node);
    const averageX = Math.round(
      selectedNodes.map((n) => n.position.x).reduce((p2, c) => p2 + c, 0) / selectedNodes.length
    );
    const averageY = Math.round(
      selectedNodes.map((n) => n.position.y).reduce((p2, c) => p2 + c, 0) / selectedNodes.length
    );
    node.position.x = averageX;
    node.position.y = averageY;
    inputConnections.forEach((c) => {
      graph.removeConnection(c);
      graph.addConnection(c.from, node.inputs[interfaceIdMap.get(c.to.id)]);
    });
    outputConnections.forEach((c) => {
      graph.removeConnection(c);
      graph.addConnection(node.outputs[interfaceIdMap.get(c.from.id)], c.to);
    });
    selectedNodes.forEach((n) => graph.removeNode(n));
    graph.activeTransactions--;
    if (handler.canExecuteCommand(SAVE_SUBGRAPH_COMMAND)) {
      handler.executeCommand(SAVE_SUBGRAPH_COMMAND);
    }
    switchGraph(subgraphTemplate);
    displayedGraph.value.panning = { ...graph.panning };
    displayedGraph.value.scaling = graph.scaling;
  };
  handler.registerCommand(CREATE_SUBGRAPH_COMMAND, {
    canExecute: canCreateSubgraph,
    execute: createSubgraph
  });
}
function getBoundingBoxForNodes(nodes) {
  const xRight = nodes.reduce((acc, cur) => {
    const x = cur.position.x;
    return x < acc ? x : acc;
  }, Infinity);
  const yTop = nodes.reduce((acc, cur) => {
    const y = cur.position.y;
    return y < acc ? y : acc;
  }, Infinity);
  const xLeft = nodes.reduce((acc, cur) => {
    const x = cur.position.x + cur.width;
    return x > acc ? x : acc;
  }, -Infinity);
  return { xLeft, xRight, yTop };
}
function useHistory(graph, commandHandler) {
  const token = Symbol("HistoryToken");
  const maxSteps = ref(200);
  const steps = ref([]);
  const changeBySelf = ref(false);
  const currentIndex = ref(-1);
  const activeTransaction = ref(false);
  const transactionSteps = ref([]);
  const addStep = (step) => {
    if (changeBySelf.value) {
      return;
    }
    if (activeTransaction.value) {
      transactionSteps.value.push(step);
    } else {
      if (currentIndex.value !== steps.value.length - 1) {
        steps.value = steps.value.slice(0, currentIndex.value + 1);
      }
      steps.value.push(step);
      while (steps.value.length > maxSteps.value) {
        steps.value.shift();
      }
      currentIndex.value = steps.value.length - 1;
    }
  };
  const startTransaction = () => {
    activeTransaction.value = true;
  };
  const commitTransaction = () => {
    activeTransaction.value = false;
    if (transactionSteps.value.length > 0) {
      addStep(new TransactionStep(transactionSteps.value));
      transactionSteps.value = [];
    }
  };
  const canUndo = () => steps.value.length !== 0 && currentIndex.value !== -1;
  const undo = () => {
    if (!canUndo()) {
      return;
    }
    changeBySelf.value = true;
    steps.value[currentIndex.value--].undo(graph.value);
    changeBySelf.value = false;
  };
  const canRedo = () => steps.value.length !== 0 && currentIndex.value < steps.value.length - 1;
  const redo = () => {
    if (!canRedo()) {
      return;
    }
    changeBySelf.value = true;
    steps.value[++currentIndex.value].redo(graph.value);
    changeBySelf.value = false;
  };
  const clear = () => {
    steps.value = [];
    currentIndex.value = -1;
  };
  watch2(
    graph,
    (newGraph, oldGraph) => {
      if (oldGraph) {
        oldGraph.events.addNode.unsubscribe(token);
        oldGraph.events.removeNode.unsubscribe(token);
        oldGraph.events.addConnection.unsubscribe(token);
        oldGraph.events.removeConnection.unsubscribe(token);
      }
      if (newGraph) {
        newGraph.events.addNode.subscribe(token, (node) => {
          addStep(new NodeStep("addNode", node.id));
        });
        newGraph.events.removeNode.subscribe(token, (node) => {
          addStep(new NodeStep("removeNode", node.save()));
        });
        newGraph.events.addConnection.subscribe(token, (conn) => {
          addStep(new ConnectionStep("addConnection", conn.id));
        });
        newGraph.events.removeConnection.subscribe(token, (conn) => {
          addStep(new ConnectionStep("removeConnection", conn));
        });
      }
    },
    { immediate: true }
  );
  commandHandler.registerCommand(UNDO_COMMAND, {
    canExecute: canUndo,
    execute: undo
  });
  commandHandler.registerCommand(REDO_COMMAND, {
    canExecute: canRedo,
    execute: redo
  });
  commandHandler.registerCommand(START_TRANSACTION_COMMAND, {
    canExecute: () => !activeTransaction.value,
    execute: startTransaction
  });
  commandHandler.registerCommand(COMMIT_TRANSACTION_COMMAND, {
    canExecute: () => activeTransaction.value,
    execute: commitTransaction
  });
  commandHandler.registerCommand(CLEAR_HISTORY_COMMAND, {
    canExecute: () => steps.value.length > 0,
    execute: clear
  });
  commandHandler.registerHotkey(["Control", "z"], UNDO_COMMAND);
  commandHandler.registerHotkey(["Control", "y"], REDO_COMMAND);
  return reactive({
    maxSteps
  });
}
function registerDeleteNodesCommand(displayedGraph, handler) {
  handler.registerCommand(DELETE_NODES_COMMAND, {
    canExecute: () => displayedGraph.value.selectedNodes.length > 0,
    execute() {
      handler.executeCommand(START_TRANSACTION_COMMAND);
      for (let i = displayedGraph.value.selectedNodes.length - 1; i >= 0; i--) {
        const n = displayedGraph.value.selectedNodes[i];
        displayedGraph.value.removeNode(n);
      }
      handler.executeCommand(COMMIT_TRANSACTION_COMMAND);
    }
  });
  handler.registerHotkey(["Delete"], DELETE_NODES_COMMAND);
}
function registerSwitchToMainGraphCommand(displayedGraph, handler, switchGraph) {
  handler.registerCommand(SWITCH_TO_MAIN_GRAPH_COMMAND, {
    canExecute: () => displayedGraph.value !== displayedGraph.value.editor.graph,
    execute: () => {
      handler.executeCommand(SAVE_SUBGRAPH_COMMAND);
      switchGraph(displayedGraph.value.editor.graph);
    }
  });
}
function useSwitchGraph(editor, displayedGraph) {
  const switchGraph = (newGraph) => {
    let newGraphInstance;
    if (!isTemplate(newGraph)) {
      if (newGraph !== editor.value.graph) {
        throw new Error(
          "Can only switch using 'Graph' instance when it is the root graph. Otherwise a 'GraphTemplate' must be used."
        );
      }
      newGraphInstance = newGraph;
    } else {
      newGraphInstance = new Graph(editor.value);
      newGraph.createGraph(newGraphInstance);
    }
    if (displayedGraph.value && displayedGraph.value !== editor.value.graph) {
      displayedGraph.value.destroy();
    }
    newGraphInstance.panning = newGraphInstance.panning ?? newGraph.panning ?? { x: 0, y: 0 };
    newGraphInstance.scaling = newGraphInstance.scaling ?? newGraph.scaling ?? 1;
    newGraphInstance.selectedNodes = newGraphInstance.selectedNodes ?? [];
    newGraphInstance.sidebar = newGraphInstance.sidebar ?? { visible: false, nodeId: "", optionName: "" };
    displayedGraph.value = newGraphInstance;
  };
  return { switchGraph };
}
function registerGraphCommands(displayedGraph, handler, switchGraph) {
  registerDeleteNodesCommand(displayedGraph, handler);
  registerCreateSubgraphCommand(displayedGraph, handler, switchGraph);
  registerSaveSubgraphCommand(displayedGraph, handler);
  registerSwitchToMainGraphCommand(displayedGraph, handler, switchGraph);
}
function useClipboard(displayedGraph, editor, commandHandler) {
  const token = Symbol("ClipboardToken");
  const nodeBuffer = ref("");
  const connectionBuffer = ref("");
  const isEmpty = computed2(() => !nodeBuffer.value);
  const clear = () => {
    nodeBuffer.value = "";
    connectionBuffer.value = "";
  };
  const copy = () => {
    const interfacesOfSelectedNodes = displayedGraph.value.selectedNodes.flatMap((n) => [
      ...Object.values(n.inputs),
      ...Object.values(n.outputs)
    ]);
    const connections = displayedGraph.value.connections.filter(
      (conn) => interfacesOfSelectedNodes.includes(conn.from) || interfacesOfSelectedNodes.includes(conn.to)
    ).map((conn) => ({ from: conn.from.id, to: conn.to.id }));
    connectionBuffer.value = JSON.stringify(connections);
    nodeBuffer.value = JSON.stringify(displayedGraph.value.selectedNodes.map((n) => n.save()));
  };
  const findInterface = (nodes, id, io) => {
    for (const n of nodes) {
      let intf;
      if (!io || io === "input") {
        intf = Object.values(n.inputs).find((intf2) => intf2.id === id);
      }
      if (!intf && (!io || io === "output")) {
        intf = Object.values(n.outputs).find((intf2) => intf2.id === id);
      }
      if (intf) {
        return intf;
      }
    }
    return void 0;
  };
  const paste = () => {
    if (isEmpty.value) {
      return;
    }
    const idmap = /* @__PURE__ */ new Map();
    const parsedNodeBuffer = JSON.parse(nodeBuffer.value);
    const parsedConnectionBuffer = JSON.parse(connectionBuffer.value);
    const newNodes = [];
    const newConnections = [];
    const graph = displayedGraph.value;
    commandHandler.executeCommand(START_TRANSACTION_COMMAND);
    for (const oldNode of parsedNodeBuffer) {
      const nodeType = editor.value.nodeTypes.get(oldNode.type);
      if (!nodeType) {
        console.warn(`Node type ${oldNode.type} not registered`);
        return;
      }
      const copiedNode = new nodeType.type();
      const generatedId = copiedNode.id;
      newNodes.push(copiedNode);
      copiedNode.hooks.beforeLoad.subscribe(token, (nodeState) => {
        const ns = nodeState;
        if (ns.position) {
          ns.position.x += 100;
          ns.position.y += 100;
        }
        copiedNode.hooks.beforeLoad.unsubscribe(token);
        return ns;
      });
      graph.addNode(copiedNode);
      copiedNode.load({ ...oldNode, id: generatedId });
      copiedNode.id = generatedId;
      idmap.set(oldNode.id, generatedId);
      for (const intf of Object.values(copiedNode.inputs)) {
        const newIntfId = v42();
        idmap.set(intf.id, newIntfId);
        intf.id = newIntfId;
      }
      for (const intf of Object.values(copiedNode.outputs)) {
        const newIntfId = v42();
        idmap.set(intf.id, newIntfId);
        intf.id = newIntfId;
      }
    }
    for (const c of parsedConnectionBuffer) {
      const fromIntf = findInterface(newNodes, idmap.get(c.from), "output");
      const toIntf = findInterface(newNodes, idmap.get(c.to), "input");
      if (!fromIntf || !toIntf) {
        continue;
      }
      const newConnection = graph.addConnection(fromIntf, toIntf);
      if (newConnection) {
        newConnections.push(newConnection);
      }
    }
    displayedGraph.value.selectedNodes = newNodes;
    commandHandler.executeCommand(COMMIT_TRANSACTION_COMMAND);
    return {
      newNodes,
      newConnections
    };
  };
  commandHandler.registerCommand(COPY_COMMAND, {
    canExecute: () => displayedGraph.value.selectedNodes.length > 0,
    execute: copy
  });
  commandHandler.registerHotkey(["Control", "c"], COPY_COMMAND);
  commandHandler.registerCommand(PASTE_COMMAND, {
    canExecute: () => !isEmpty.value,
    execute: paste
  });
  commandHandler.registerHotkey(["Control", "v"], PASTE_COMMAND);
  commandHandler.registerCommand(CLEAR_CLIPBOARD_COMMAND, {
    canExecute: () => true,
    execute: clear
  });
  return reactive({ isEmpty });
}
function setViewNodeProperties(node, settings) {
  node.position = node.position ?? { x: 0, y: 0 };
  node.disablePointerEvents = false;
  node.twoColumn = node.twoColumn ?? false;
  node.width = node.width ?? settings.defaultWidth;
}
function registerOpenSidebarCommand(displayedGraph, handler) {
  handler.registerCommand(OPEN_SIDEBAR_COMMAND, {
    execute: (nodeId) => {
      displayedGraph.value.sidebar.nodeId = nodeId;
      displayedGraph.value.sidebar.visible = true;
    },
    canExecute: () => true
  });
}
function registerSidebarCommands(displayedGraph, handler) {
  registerOpenSidebarCommand(displayedGraph, handler);
}
function registerZoomToFitCommands(displayedGraph, handler, settings) {
  handler.registerCommand(ZOOM_TO_FIT_RECT_COMMAND, {
    canExecute: () => true,
    execute: (rect) => zoomToFitRect(displayedGraph.value, settings, rect)
  });
  handler.registerCommand(ZOOM_TO_FIT_NODES_COMMAND, {
    canExecute: () => true,
    execute: (nodes) => zoomToFitNodes(displayedGraph.value, settings, nodes)
  });
  handler.registerCommand(ZOOM_TO_FIT_GRAPH_COMMAND, {
    canExecute: () => displayedGraph.value.nodes.length > 0,
    execute: () => zoomToFitGraph(displayedGraph.value, settings)
  });
  handler.registerHotkey(["f"], ZOOM_TO_FIT_GRAPH_COMMAND);
}
function zoomToFitRect(graph, settings, rect) {
  const padding = {
    left: settings.zoomToFit.paddingLeft,
    right: settings.zoomToFit.paddingRight,
    top: settings.zoomToFit.paddingTop,
    bottom: settings.zoomToFit.paddingBottom
  };
  const editorEl = document.querySelector(".baklava-editor");
  const editorBounding = editorEl.getBoundingClientRect();
  const editorWidth = Math.max(0, editorBounding.width - padding.left - padding.right);
  const editorHeight = Math.max(0, editorBounding.height - padding.top - padding.bottom);
  rect = normalizeRect(rect);
  const rectWidth = rect.x2 - rect.x1;
  const rectHeight = rect.y2 - rect.y1;
  const widthRatio = rectWidth === 0 ? Infinity : editorWidth / rectWidth;
  const heightRatio = rectHeight == 0 ? Infinity : editorHeight / rectHeight;
  let scale = Math.min(widthRatio, heightRatio);
  if (scale === 0 || !Number.isFinite(scale)) {
    scale = 1;
  }
  if (scale < settings.panZoom.minScale) {
    scale = settings.panZoom.minScale;
  }
  if (scale > settings.panZoom.maxScale) {
    scale = settings.panZoom.maxScale;
  }
  const remainingEditorWidth = Math.max(0, editorWidth / scale - rectWidth);
  const remainingEditorHeight = Math.max(0, editorHeight / scale - rectHeight);
  const offsetX = -rect.x1 + padding.left / scale + remainingEditorWidth / 2;
  const offsetY = -rect.y1 + padding.top / scale + remainingEditorHeight / 2;
  graph.panning.x = offsetX;
  graph.panning.y = offsetY;
  graph.scaling = scale;
}
function zoomToFitNodes(graph, settings, nodes) {
  if (nodes.length === 0) {
    return;
  }
  const nodeRects = nodes.map(getNodeRect);
  const boundingRect = {
    x1: Math.min(...nodeRects.map((i) => i.x1)),
    y1: Math.min(...nodeRects.map((i) => i.y1)),
    x2: Math.max(...nodeRects.map((i) => i.x2)),
    y2: Math.max(...nodeRects.map((i) => i.y2))
  };
  zoomToFitRect(graph, settings, boundingRect);
}
function zoomToFitGraph(graph, settings) {
  zoomToFitNodes(graph, settings, graph.nodes);
}
function getNodeRect(node) {
  const domElement = document.getElementById(node.id);
  const width = domElement?.offsetWidth ?? 0;
  const height = domElement?.offsetHeight ?? 0;
  const posX = node.position?.x ?? 0;
  const posY = node.position?.y ?? 0;
  return {
    x1: posX,
    y1: posY,
    x2: posX + width,
    y2: posY + height
  };
}
function normalizeRect(rect) {
  return {
    x1: Math.min(rect.x1, rect.x2),
    y1: Math.min(rect.y1, rect.y2),
    x2: Math.max(rect.x1, rect.x2),
    y2: Math.max(rect.y1, rect.y2)
  };
}
function _sfc_render$9(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$9, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("path", { d: "M9 13l-4 -4l4 -4m-4 4h11a4 4 0 0 1 0 8h-1" }, null, -1)
  ])]);
}
function _sfc_render$8(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$8, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("path", { d: "M15 13l4 -4l-4 -4m4 4h-11a4 4 0 0 0 0 8h1" }, null, -1)
  ])]);
}
function _sfc_render$7(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$7, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("line", {
      x1: "5",
      y1: "12",
      x2: "19",
      y2: "12"
    }, null, -1),
    createBaseVNode("line", {
      x1: "5",
      y1: "12",
      x2: "11",
      y2: "18"
    }, null, -1),
    createBaseVNode("line", {
      x1: "5",
      y1: "12",
      x2: "11",
      y2: "6"
    }, null, -1)
  ])]);
}
function _sfc_render$6(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$6, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("path", { d: "M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" }, null, -1),
    createBaseVNode("rect", {
      x: "9",
      y: "3",
      width: "6",
      height: "4",
      rx: "2"
    }, null, -1)
  ])]);
}
function _sfc_render$5(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$5, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("rect", {
      x: "8",
      y: "8",
      width: "12",
      height: "12",
      rx: "2"
    }, null, -1),
    createBaseVNode("path", { d: "M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" }, null, -1)
  ])]);
}
function _sfc_render$4(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$4, [..._cache[0] || (_cache[0] = [
    createBaseVNode("path", {
      stroke: "none",
      d: "M0 0h24v24H0z",
      fill: "none"
    }, null, -1),
    createBaseVNode("path", { d: "M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2" }, null, -1),
    createBaseVNode("circle", {
      cx: "12",
      cy: "14",
      r: "2"
    }, null, -1),
    createBaseVNode("polyline", { points: "14 4 14 8 8 8 8 4" }, null, -1)
  ])]);
}
function _sfc_render$3(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$3, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M10 3h4v4h-4z"></path><path d="M3 17h4v4h-4z"></path><path d="M17 17h4v4h-4z"></path><path d="M7 17l5 -4l5 4"></path><line x1="12" y1="7" x2="12" y2="13"></line>', 6)
  ])]);
}
function _sfc_render$2(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$2, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M8 8m0 1a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1z"></path><path d="M12 20v.01"></path><path d="M16 20v.01"></path><path d="M8 20v.01"></path><path d="M4 20v.01"></path><path d="M4 16v.01"></path><path d="M4 12v.01"></path><path d="M4 8v.01"></path><path d="M4 4v.01"></path><path d="M8 4v.01"></path><path d="M12 4v.01"></path><path d="M16 4v.01"></path><path d="M20 4v.01"></path><path d="M20 8v.01"></path><path d="M20 12v.01"></path><path d="M20 16v.01"></path><path d="M20 20v.01"></path>', 18)
  ])]);
}
function _sfc_render$1(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1$1, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 7l16 0"></path><path d="M10 11l0 6"></path><path d="M14 11l0 6"></path><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>', 6)
  ])]);
}
function _sfc_render(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 8v-2a2 2 0 0 1 2 -2h2"></path><path d="M4 16v2a2 2 0 0 0 2 2h2"></path><path d="M16 4h2a2 2 0 0 1 2 2v2"></path><path d="M16 20h2a2 2 0 0 0 2 -2v-2"></path><path d="M8 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path><path d="M16 16l-2.5 -2.5"></path>', 7)
  ])]);
}
function useBaklava(existingEditor) {
  const editor = ref(existingEditor ?? new Editor());
  const token = Symbol("ViewModelToken");
  const _displayedGraph = ref(null);
  const displayedGraph = shallowReadonly(_displayedGraph);
  const { switchGraph } = useSwitchGraph(editor, _displayedGraph);
  const isSubgraph = computed2(() => displayedGraph.value && displayedGraph.value !== editor.value.graph);
  const settings = reactive(DEFAULT_SETTINGS());
  const commandHandler = useCommandHandler();
  const history = useHistory(displayedGraph, commandHandler);
  const clipboard = useClipboard(displayedGraph, editor, commandHandler);
  const hooks = {
    /** Called whenever a node is rendered */
    renderNode: new SequentialHook(null),
    /** Called whenever an interface is rendered */
    renderInterface: new SequentialHook(null)
  };
  registerGraphCommands(displayedGraph, commandHandler, switchGraph);
  registerSidebarCommands(displayedGraph, commandHandler);
  registerZoomToFitCommands(displayedGraph, commandHandler, settings);
  watch2(
    editor,
    (newValue, oldValue) => {
      if (oldValue) {
        oldValue.events.registerGraph.unsubscribe(token);
        oldValue.graphEvents.beforeAddNode.unsubscribe(token);
        newValue.nodeHooks.beforeLoad.unsubscribe(token);
        newValue.nodeHooks.afterSave.unsubscribe(token);
        newValue.graphTemplateHooks.beforeLoad.unsubscribe(token);
        newValue.graphTemplateHooks.afterSave.unsubscribe(token);
        newValue.graph.hooks.load.unsubscribe(token);
        newValue.graph.hooks.save.unsubscribe(token);
      }
      if (newValue) {
        newValue.nodeHooks.beforeLoad.subscribe(token, (state2, node) => {
          node.position = state2.position ?? { x: 0, y: 0 };
          node.width = state2.width ?? settings.nodes.defaultWidth;
          node.twoColumn = state2.twoColumn ?? false;
          return state2;
        });
        newValue.nodeHooks.afterSave.subscribe(token, (state2, node) => {
          state2.position = node.position;
          state2.width = node.width;
          state2.twoColumn = node.twoColumn;
          return state2;
        });
        newValue.graphTemplateHooks.beforeLoad.subscribe(token, (state2, template) => {
          template.panning = state2.panning;
          template.scaling = state2.scaling;
          return state2;
        });
        newValue.graphTemplateHooks.afterSave.subscribe(token, (state2, template) => {
          state2.panning = template.panning;
          state2.scaling = template.scaling;
          return state2;
        });
        newValue.graph.hooks.load.subscribe(token, (state2, graph) => {
          graph.panning = state2.panning;
          graph.scaling = state2.scaling;
          return state2;
        });
        newValue.graph.hooks.save.subscribe(token, (state2, graph) => {
          state2.panning = graph.panning;
          state2.scaling = graph.scaling;
          return state2;
        });
        newValue.graphEvents.beforeAddNode.subscribe(
          token,
          (node) => setViewNodeProperties(node, { defaultWidth: settings.nodes.defaultWidth })
        );
        editor.value.registerNodeType(SubgraphInputNode, { category: "Subgraphs" });
        editor.value.registerNodeType(SubgraphOutputNode, { category: "Subgraphs" });
        switchGraph(newValue.graph);
      }
    },
    { immediate: true }
  );
  return reactive({
    editor,
    displayedGraph,
    isSubgraph,
    settings,
    commandHandler,
    history,
    clipboard,
    hooks,
    switchGraph
  });
}
var INPUT_ELEMENT_TAGS, viewModelRef, TemporaryConnectionState, TEMPORARY_CONNECTION_HANDLER_INJECTION_SYMBOL, START_SELECTION_BOX_COMMAND, _sfc_main$y, _export_sfc, Background, isClient, toString, isObject2, noop, defaultWindow, defaultState, keys, _hoisted_1$s, _hoisted_2$9, _hoisted_3$7, _sfc_main$x, _sfc_main$w, _hoisted_1$r, VerticalDots, _hoisted_1$q, _hoisted_2$8, _hoisted_3$6, _sfc_main$v, _hoisted_1$p, _hoisted_2$7, _hoisted_3$5, _hoisted_4$5, _hoisted_5$1, _sfc_main$u, _sfc_main$t, _hoisted_1$o, ConnectionView, _sfc_main$s, ConnectionWrapper, _sfc_main$r, TemporaryConnection, _sfc_main$q, _hoisted_1$n, _hoisted_2$6, Sidebar, _sfc_main$p, _sfc_main$o, _hoisted_1$m, _hoisted_2$5, _hoisted_3$4, _hoisted_4$4, PaletteEntry, _hoisted_1$l, _sfc_main$n, _sfc_main$m, _hoisted_1$k, ToolbarButton, _sfc_main$l, _hoisted_1$j, _sfc_main$k, useCommandHandler, byteToHex2, getRandomValues2, rnds82, randomUUID2, native, SAVE_SUBGRAPH_COMMAND, _sfc_main$j, MAX_STRING_LENGTH, BaseNumericInterface, useBaseNumericInterface, _sfc_main$h, _hoisted_1$g, Arrow, _sfc_main$g, _hoisted_1$e, _hoisted_2$2, _hoisted_3$2, _hoisted_4$2, _sfc_main$f, NumberInterface, _sfc_main$e, _sfc_main$d, _sfc_main$c, _sfc_main$b, _hoisted_1$b, TextInputInterfaceComponent, TextInputInterface, _sfc_main$a, SubgraphInputNode, SubgraphOutputNode, CREATE_SUBGRAPH_COMMAND, IGNORE_NODE_TYPES, NodeStep, ConnectionStep, TransactionStep, UNDO_COMMAND, REDO_COMMAND, START_TRANSACTION_COMMAND, COMMIT_TRANSACTION_COMMAND, CLEAR_HISTORY_COMMAND, DELETE_NODES_COMMAND, SWITCH_TO_MAIN_GRAPH_COMMAND, isTemplate, COPY_COMMAND, PASTE_COMMAND, CLEAR_CLIPBOARD_COMMAND, OPEN_SIDEBAR_COMMAND, ZOOM_TO_FIT_RECT_COMMAND, ZOOM_TO_FIT_NODES_COMMAND, ZOOM_TO_FIT_GRAPH_COMMAND, _sfc_main$9, _hoisted_1$9, ArrowBackUp, _sfc_main$8, _hoisted_1$8, ArrowForwardUp, _sfc_main$7, _hoisted_1$7, ArrowLeft, _sfc_main$6, _hoisted_1$6, Clipboard, _sfc_main$5, _hoisted_1$5, Copy, _sfc_main$4, _hoisted_1$4, DeviceFloppy, _sfc_main$3, _hoisted_1$3, Hierarchy2, _sfc_main$2, _hoisted_1$2, SelectAll, _sfc_main$1, _hoisted_1$1, Trash, _sfc_main, _hoisted_1, ZoomScan, TOOLBAR_COMMANDS, DEFAULT_TOOLBAR_COMMANDS, TOOLBAR_SUBGRAPH_COMMANDS, DEFAULT_TOOLBAR_SUBGRAPH_COMMANDS, DEFAULT_SETTINGS;
var init_renderer_vue_es = __esm({
  "node_modules/@baklavajs/renderer-vue/dist/renderer-vue.es.mjs"() {
    init_vue_runtime_esm_bundler();
    init_esm2();
    init_esm();
    INPUT_ELEMENT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
    viewModelRef = null;
    TemporaryConnectionState = /* @__PURE__ */ ((TemporaryConnectionState2) => {
      TemporaryConnectionState2[TemporaryConnectionState2["NONE"] = 0] = "NONE";
      TemporaryConnectionState2[TemporaryConnectionState2["ALLOWED"] = 1] = "ALLOWED";
      TemporaryConnectionState2[TemporaryConnectionState2["FORBIDDEN"] = 2] = "FORBIDDEN";
      return TemporaryConnectionState2;
    })(TemporaryConnectionState || {});
    TEMPORARY_CONNECTION_HANDLER_INJECTION_SYMBOL = Symbol();
    START_SELECTION_BOX_COMMAND = "START_SELECTION_BOX";
    _sfc_main$y = defineComponent({
      setup() {
        const { viewModel } = useViewModel();
        const { graph } = useGraph();
        const styles = computed2(() => {
          const config = viewModel.value.settings.background;
          const positionLeft = graph.value.panning.x * graph.value.scaling;
          const positionTop = graph.value.panning.y * graph.value.scaling;
          const size = graph.value.scaling * config.gridSize;
          const subSize = size / config.gridDivision;
          const backgroundSize = `${size}px ${size}px, ${size}px ${size}px`;
          const subGridBackgroundSize = graph.value.scaling > config.subGridVisibleThreshold ? `, ${subSize}px ${subSize}px, ${subSize}px ${subSize}px` : "";
          return {
            backgroundPosition: `left ${positionLeft}px top ${positionTop}px`,
            backgroundSize: `${backgroundSize} ${subGridBackgroundSize}`
          };
        });
        return { styles };
      }
    });
    _export_sfc = (sfc, props) => {
      const target = sfc.__vccOpts || sfc;
      for (const [key, val] of props) {
        target[key] = val;
      }
      return target;
    };
    Background = /* @__PURE__ */ _export_sfc(_sfc_main$y, [["render", _sfc_render$p]]);
    isClient = typeof window !== "undefined" && typeof document !== "undefined";
    typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;
    toString = Object.prototype.toString;
    isObject2 = (val) => toString.call(val) === "[object Object]";
    noop = () => {
    };
    defaultWindow = isClient ? window : void 0;
    defaultState = {
      x: 0,
      y: 0,
      pointerId: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      width: 0,
      height: 0,
      twist: 0,
      pointerType: null
    };
    keys = /* @__PURE__ */ Object.keys(defaultState);
    _hoisted_1$s = ["onMouseenter", "onMouseleave", "onClick"];
    _hoisted_2$9 = { class: "flex-fill" };
    _hoisted_3$7 = {
      key: 0,
      class: "__submenu-icon",
      style: { "line-height": "1em" }
    };
    _sfc_main$x = /* @__PURE__ */ defineComponent({
      __name: "ContextMenu",
      props: {
        modelValue: { type: Boolean },
        items: {},
        x: { default: 0 },
        y: { default: 0 },
        isNested: { type: Boolean, default: false },
        isFlipped: { default: () => ({ x: false, y: false }) },
        flippable: { type: Boolean, default: false }
      },
      emits: ["update:modelValue", "click"],
      setup(__props, { emit: __emit }) {
        const props = __props;
        const emit2 = __emit;
        let activeMenuResetTimeout = null;
        const el = ref(null);
        const activeMenu = ref(-1);
        const height = ref(0);
        const rootIsFlipped = ref({ x: false, y: false });
        const flippedX = computed2(() => props.flippable && (rootIsFlipped.value.x || props.isFlipped.x));
        const flippedY = computed2(() => props.flippable && (rootIsFlipped.value.y || props.isFlipped.y));
        const styles = computed2(() => {
          const s = {};
          if (!props.isNested) {
            s.top = (flippedY.value ? props.y - height.value : props.y) + "px";
            s.left = props.x + "px";
          }
          return s;
        });
        const classes = computed2(() => {
          return {
            "--flipped-x": flippedX.value,
            "--flipped-y": flippedY.value,
            "--nested": props.isNested
          };
        });
        const itemsWithHoverProperty = computed2(() => props.items.map((i) => ({ ...i, hover: false })));
        watch2([() => props.y, () => props.items], () => {
          height.value = props.items.length * 30;
          const parentWidth = el.value?.parentElement?.offsetWidth ?? 0;
          const parentHeight = el.value?.parentElement?.offsetHeight ?? 0;
          rootIsFlipped.value.x = !props.isNested && props.x > parentWidth * 0.75;
          rootIsFlipped.value.y = !props.isNested && props.y + height.value > parentHeight - 20;
        });
        onClickOutside(el, () => {
          if (props.modelValue) {
            emit2("update:modelValue", false);
          }
        });
        const onClick = (item) => {
          if (!item.submenu && item.value) {
            emit2("click", item.value);
            emit2("update:modelValue", false);
          }
        };
        const onChildClick = (value) => {
          emit2("click", value);
          activeMenu.value = -1;
          if (!props.isNested) {
            emit2("update:modelValue", false);
          }
        };
        const onMouseEnter = (event, index) => {
          if (props.items[index].submenu) {
            activeMenu.value = index;
            if (activeMenuResetTimeout !== null) {
              clearTimeout(activeMenuResetTimeout);
              activeMenuResetTimeout = null;
            }
          }
        };
        const onMouseLeave = (event, index) => {
          if (props.items[index].submenu) {
            activeMenuResetTimeout = window.setTimeout(() => {
              activeMenu.value = -1;
              activeMenuResetTimeout = null;
            }, 200);
          }
        };
        return (_ctx, _cache) => {
          const _component_ContextMenu = resolveComponent("ContextMenu", true);
          return openBlock(), createBlock(Transition, { name: "slide-fade" }, {
            default: withCtx(() => [
              withDirectives(createBaseVNode("div", {
                ref_key: "el",
                ref: el,
                class: normalizeClass(["baklava-context-menu", classes.value]),
                style: normalizeStyle(styles.value)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(itemsWithHoverProperty.value, (item, index) => {
                  return openBlock(), createElementBlock(Fragment, null, [
                    item.isDivider ? (openBlock(), createElementBlock("div", {
                      key: `d-${index}`,
                      class: "divider"
                    })) : (openBlock(), createElementBlock("div", {
                      key: `i-${index}`,
                      class: normalizeClass(["item", { "submenu": !!item.submenu, "--disabled": !!item.disabled }]),
                      onMouseenter: ($event) => onMouseEnter($event, index),
                      onMouseleave: ($event) => onMouseLeave($event, index),
                      onClick: withModifiers(($event) => onClick(item), ["stop", "prevent"])
                    }, [
                      createBaseVNode("div", _hoisted_2$9, toDisplayString(item.label), 1),
                      item.submenu ? (openBlock(), createElementBlock("div", _hoisted_3$7, [..._cache[0] || (_cache[0] = [
                        createBaseVNode("svg", {
                          width: "13",
                          height: "13",
                          viewBox: "-60 120 250 250"
                        }, [
                          createBaseVNode("path", {
                            d: "M160.875 279.5625 L70.875 369.5625 L70.875 189.5625 L160.875 279.5625 Z",
                            stroke: "none",
                            fill: "white"
                          })
                        ], -1)
                      ])])) : createCommentVNode("", true),
                      item.submenu ? (openBlock(), createBlock(_component_ContextMenu, {
                        key: 1,
                        "model-value": activeMenu.value === index,
                        items: item.submenu,
                        "is-nested": true,
                        "is-flipped": { x: flippedX.value, y: flippedY.value },
                        flippable: __props.flippable,
                        onClick: onChildClick
                      }, null, 8, ["model-value", "items", "is-flipped", "flippable"])) : createCommentVNode("", true)
                    ], 42, _hoisted_1$s))
                  ], 64);
                }), 256))
              ], 6), [
                [vShow, __props.modelValue]
              ])
            ]),
            _: 1
          });
        };
      }
    });
    _sfc_main$w = {};
    _hoisted_1$r = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    VerticalDots = /* @__PURE__ */ _export_sfc(_sfc_main$w, [["render", _sfc_render$o]]);
    _hoisted_1$q = ["id"];
    _hoisted_2$8 = {
      key: 0,
      class: "__tooltip"
    };
    _hoisted_3$6 = {
      key: 2,
      class: "align-middle"
    };
    _sfc_main$v = /* @__PURE__ */ defineComponent({
      __name: "NodeInterface",
      props: {
        node: {},
        intf: {}
      },
      setup(__props) {
        const ellipsis = (value, characters = 100) => {
          const stringValue = typeof value?.toString === "function" ? String(value) : "";
          if (stringValue.length > characters) {
            return stringValue.slice(0, characters) + "...";
          }
          return stringValue;
        };
        const props = __props;
        const { viewModel } = useViewModel();
        const { hoveredOver, temporaryConnection } = useTemporaryConnection();
        const el = ref(null);
        const isConnected = computed2(() => props.intf.connectionCount > 0);
        const isHovered = ref(false);
        const showTooltip = computed2(() => viewModel.value.settings.displayValueOnHover && isHovered.value);
        const classes = computed2(() => ({
          "--input": props.intf.isInput,
          "--output": !props.intf.isInput,
          "--connected": isConnected.value
        }));
        const showComponent = computed2(
          () => props.intf.component && (!props.intf.isInput || !props.intf.port || props.intf.connectionCount === 0)
        );
        const startHover = () => {
          isHovered.value = true;
          hoveredOver(props.intf);
        };
        const endHover = () => {
          isHovered.value = false;
          hoveredOver(void 0);
        };
        const onRender = () => {
          if (el.value) {
            viewModel.value.hooks.renderInterface.execute({ intf: props.intf, el: el.value });
          }
        };
        const openSidebar = () => {
          const sidebar2 = viewModel.value.displayedGraph.sidebar;
          sidebar2.nodeId = props.node.id;
          sidebar2.optionName = props.intf.name;
          sidebar2.visible = true;
        };
        onMounted(onRender);
        onUpdated(onRender);
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock("div", {
            id: __props.intf.id,
            ref_key: "el",
            ref: el,
            class: normalizeClass(["baklava-node-interface", classes.value])
          }, [
            __props.intf.port ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: normalizeClass(["__port", { "--selected": unref(temporaryConnection)?.from === __props.intf }]),
              onPointerover: startHover,
              onPointerout: endHover
            }, [
              renderSlot(_ctx.$slots, "portTooltip", { showTooltip: showTooltip.value }, () => [
                showTooltip.value === true ? (openBlock(), createElementBlock("span", _hoisted_2$8, toDisplayString(ellipsis(__props.intf.value)), 1)) : createCommentVNode("", true)
              ])
            ], 34)) : createCommentVNode("", true),
            showComponent.value ? (openBlock(), createBlock(resolveDynamicComponent(__props.intf.component), {
              key: 1,
              modelValue: __props.intf.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => __props.intf.value = $event),
              node: __props.node,
              intf: __props.intf,
              onOpenSidebar: openSidebar
            }, null, 40, ["modelValue", "node", "intf"])) : (openBlock(), createElementBlock("span", _hoisted_3$6, toDisplayString(__props.intf.name), 1))
          ], 10, _hoisted_1$q);
        };
      }
    });
    _hoisted_1$p = ["id", "data-node-type"];
    _hoisted_2$7 = { class: "__title-label" };
    _hoisted_3$5 = { class: "__menu" };
    _hoisted_4$5 = { class: "__outputs" };
    _hoisted_5$1 = { class: "__inputs" };
    _sfc_main$u = /* @__PURE__ */ defineComponent({
      __name: "Node",
      props: {
        node: {},
        selected: { type: Boolean, default: false },
        dragging: { type: Boolean }
      },
      emits: ["select", "start-drag"],
      setup(__props, { emit: __emit }) {
        const props = __props;
        const emit2 = __emit;
        const { viewModel } = useViewModel();
        const { graph, switchGraph } = useGraph();
        const el = ref(null);
        const renaming = ref(false);
        const tempName = ref("");
        const renameInputEl = ref(null);
        const isResizing = ref(false);
        let resizeStartWidth = 0;
        let resizeStartMouseX = 0;
        const showContextMenu = ref(false);
        const contextMenuItems = computed2(() => {
          const items = [
            { value: "rename", label: "Rename" },
            { value: "delete", label: "Delete" }
          ];
          if (props.node.type.startsWith(GRAPH_NODE_TYPE_PREFIX)) {
            items.push({ value: "editSubgraph", label: "Edit Subgraph" });
          }
          return items;
        });
        const classes = computed2(() => ({
          "--selected": props.selected,
          "--dragging": props.dragging,
          "--two-column": !!props.node.twoColumn
        }));
        const classesContent = computed2(() => ({
          "--reverse-y": props.node.reverseY ?? viewModel.value.settings.nodes.reverseY
        }));
        const styles = computed2(() => ({
          "top": `${props.node.position?.y ?? 0}px`,
          "left": `${props.node.position?.x ?? 0}px`,
          "--width": `${props.node.width ?? viewModel.value.settings.nodes.defaultWidth}px`
        }));
        const displayedInputs = computed2(() => Object.values(props.node.inputs).filter((ni) => !ni.hidden));
        const displayedOutputs = computed2(() => Object.values(props.node.outputs).filter((ni) => !ni.hidden));
        const select = () => {
          emit2("select");
        };
        const startDrag = (ev) => {
          if (!props.selected) {
            select();
          }
          emit2("start-drag", ev);
        };
        const openContextMenu = () => {
          showContextMenu.value = true;
        };
        const onContextMenuClick = async (action) => {
          switch (action) {
            case "delete":
              graph.value.removeNode(props.node);
              break;
            case "rename":
              tempName.value = props.node.title;
              renaming.value = true;
              await nextTick();
              renameInputEl.value?.focus();
              break;
            case "editSubgraph":
              switchGraph(props.node.template);
              break;
          }
        };
        const doneRenaming = () => {
          props.node.title = tempName.value;
          renaming.value = false;
        };
        const onRender = () => {
          if (el.value) {
            viewModel.value.hooks.renderNode.execute({ node: props.node, el: el.value });
          }
        };
        const startResize = (ev) => {
          isResizing.value = true;
          resizeStartWidth = props.node.width;
          resizeStartMouseX = ev.clientX;
          ev.preventDefault();
        };
        const doResize = (ev) => {
          if (!isResizing.value) return;
          const deltaX = ev.clientX - resizeStartMouseX;
          const newWidth = resizeStartWidth + deltaX / graph.value.scaling;
          const minWidth = viewModel.value.settings.nodes.minWidth;
          const maxWidth = viewModel.value.settings.nodes.maxWidth;
          props.node.width = Math.max(minWidth, Math.min(maxWidth, newWidth));
        };
        const stopResize = () => {
          isResizing.value = false;
        };
        onMounted(() => {
          onRender();
          window.addEventListener("mousemove", doResize);
          window.addEventListener("mouseup", stopResize);
        });
        onUpdated(onRender);
        onBeforeUnmount(() => {
          window.removeEventListener("mousemove", doResize);
          window.removeEventListener("mouseup", stopResize);
        });
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock("div", {
            id: __props.node.id,
            ref_key: "el",
            ref: el,
            class: normalizeClass(["baklava-node", classes.value]),
            style: normalizeStyle(styles.value),
            "data-node-type": __props.node.type,
            onPointerdown: select
          }, [
            unref(viewModel).settings.nodes.resizable ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "__resize-handle",
              onMousedown: startResize
            }, null, 32)) : createCommentVNode("", true),
            renderSlot(_ctx.$slots, "title", {}, () => [
              createBaseVNode("div", {
                class: "__title",
                onPointerdown: withModifiers(startDrag, ["self", "stop"]),
                onContextmenu: withModifiers(openContextMenu, ["prevent"])
              }, [
                !renaming.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createBaseVNode("div", _hoisted_2$7, toDisplayString(__props.node.title), 1),
                  createBaseVNode("div", _hoisted_3$5, [
                    createVNode(VerticalDots, {
                      class: "--clickable",
                      onClick: openContextMenu
                    }),
                    createVNode(unref(_sfc_main$x), {
                      modelValue: showContextMenu.value,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => showContextMenu.value = $event),
                      x: 0,
                      y: 0,
                      items: contextMenuItems.value,
                      onClick: onContextMenuClick
                    }, null, 8, ["modelValue", "items"])
                  ])
                ], 64)) : withDirectives((openBlock(), createElementBlock("input", {
                  key: 1,
                  ref_key: "renameInputEl",
                  ref: renameInputEl,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => tempName.value = $event),
                  type: "text",
                  class: "baklava-input",
                  placeholder: "Node Name",
                  onBlur: doneRenaming,
                  onKeydown: withKeys(doneRenaming, ["enter"])
                }, null, 544)), [
                  [vModelText, tempName.value]
                ])
              ], 32)
            ]),
            renderSlot(_ctx.$slots, "content", {}, () => [
              createBaseVNode("div", {
                class: normalizeClass(["__content", classesContent.value]),
                onKeydown: _cache[2] || (_cache[2] = withKeys(withModifiers(() => {
                }, ["stop"]), ["delete"]))
              }, [
                createBaseVNode("div", _hoisted_4$5, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(displayedOutputs.value, (output) => {
                    return renderSlot(_ctx.$slots, "nodeInterface", {
                      key: output.id,
                      type: "output",
                      node: __props.node,
                      intf: output
                    }, () => [
                      createVNode(_sfc_main$v, {
                        node: __props.node,
                        intf: output
                      }, null, 8, ["node", "intf"])
                    ]);
                  }), 128))
                ]),
                createBaseVNode("div", _hoisted_5$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(displayedInputs.value, (input) => {
                    return renderSlot(_ctx.$slots, "nodeInterface", {
                      key: input.id,
                      type: "input",
                      node: __props.node,
                      intf: input
                    }, () => [
                      createVNode(_sfc_main$v, {
                        node: __props.node,
                        intf: input
                      }, null, 8, ["node", "intf"])
                    ]);
                  }), 128))
                ])
              ], 34)
            ])
          ], 46, _hoisted_1$p);
        };
      }
    });
    _sfc_main$t = defineComponent({
      props: {
        x1: {
          type: Number,
          required: true
        },
        y1: {
          type: Number,
          required: true
        },
        x2: {
          type: Number,
          required: true
        },
        y2: {
          type: Number,
          required: true
        },
        state: {
          type: Number,
          default: TemporaryConnectionState.NONE
        },
        isTemporary: {
          type: Boolean,
          default: false
        }
      },
      setup(props) {
        const { viewModel } = useViewModel();
        const { graph } = useGraph();
        const transform = (x, y) => {
          const tx = (x + graph.value.panning.x) * graph.value.scaling;
          const ty = (y + graph.value.panning.y) * graph.value.scaling;
          return [tx, ty];
        };
        const d = computed2(() => {
          const [tx1, ty1] = transform(props.x1, props.y1);
          const [tx2, ty2] = transform(props.x2, props.y2);
          if (viewModel.value.settings.useStraightConnections) {
            return `M ${tx1} ${ty1} L ${tx2} ${ty2}`;
          } else {
            const dx = 0.3 * Math.abs(tx1 - tx2);
            return `M ${tx1} ${ty1} C ${tx1 + dx} ${ty1}, ${tx2 - dx} ${ty2}, ${tx2} ${ty2}`;
          }
        });
        const classes = computed2(() => ({
          "--temporary": props.isTemporary,
          "--allowed": props.state === TemporaryConnectionState.ALLOWED,
          "--forbidden": props.state === TemporaryConnectionState.FORBIDDEN
        }));
        return { d, classes };
      }
    });
    _hoisted_1$o = ["d"];
    ConnectionView = /* @__PURE__ */ _export_sfc(_sfc_main$t, [["render", _sfc_render$n]]);
    _sfc_main$s = defineComponent({
      components: {
        "connection-view": ConnectionView
      },
      props: {
        connection: {
          type: Object,
          required: true
        }
      },
      setup(props) {
        const { graph } = useGraph();
        let resizeObserver;
        const d = ref({ x1: 0, y1: 0, x2: 0, y2: 0 });
        const state2 = computed2(
          () => props.connection.isInDanger ? TemporaryConnectionState.FORBIDDEN : TemporaryConnectionState.NONE
        );
        const fromNodePosition = computed2(() => graph.value.findNodeById(props.connection.from.nodeId)?.position);
        const toNodePosition = computed2(() => graph.value.findNodeById(props.connection.to.nodeId)?.position);
        const getPortCoordinates2 = (resolved) => {
          if (resolved.node && resolved.interface && resolved.port) {
            return [
              resolved.node.offsetLeft + resolved.interface.offsetLeft + resolved.port.offsetLeft + resolved.port.clientWidth / 2,
              resolved.node.offsetTop + resolved.interface.offsetTop + resolved.port.offsetTop + resolved.port.clientHeight / 2
            ];
          } else {
            return [0, 0];
          }
        };
        const updateCoords = () => {
          const from = getDomElements(props.connection.from);
          const to = getDomElements(props.connection.to);
          if (from.node && to.node) {
            if (!resizeObserver) {
              resizeObserver = new ResizeObserver(() => {
                updateCoords();
              });
              resizeObserver.observe(from.node);
              resizeObserver.observe(to.node);
            }
          }
          const [x1, y1] = getPortCoordinates2(from);
          const [x2, y2] = getPortCoordinates2(to);
          d.value = { x1, y1, x2, y2 };
        };
        onMounted(async () => {
          await nextTick();
          updateCoords();
        });
        onBeforeUnmount(() => {
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
        });
        watch2([fromNodePosition, toNodePosition], () => updateCoords(), { deep: true });
        return { d, state: state2 };
      }
    });
    ConnectionWrapper = /* @__PURE__ */ _export_sfc(_sfc_main$s, [["render", _sfc_render$m]]);
    _sfc_main$r = defineComponent({
      components: {
        "connection-view": ConnectionView
      },
      props: {
        connection: {
          type: Object,
          required: true
        }
      },
      setup(props) {
        const status = computed2(() => props.connection ? props.connection.status : TemporaryConnectionState.NONE);
        const d = computed2(() => {
          if (!props.connection) {
            return {
              input: [0, 0],
              output: [0, 0]
            };
          }
          const start = getPortCoordinates(getDomElements(props.connection.from));
          const end = props.connection.to ? getPortCoordinates(getDomElements(props.connection.to)) : [props.connection.mx || start[0], props.connection.my || start[1]];
          if (props.connection.from.isInput) {
            return {
              input: end,
              output: start
            };
          } else {
            return {
              input: start,
              output: end
            };
          }
        });
        return { d, status };
      }
    });
    TemporaryConnection = /* @__PURE__ */ _export_sfc(_sfc_main$r, [["render", _sfc_render$l]]);
    _sfc_main$q = defineComponent({
      setup() {
        const { viewModel } = useViewModel();
        const { graph } = useGraph();
        const el = ref(null);
        const width = toRef(viewModel.value.settings.sidebar, "width");
        const resizable = computed2(() => viewModel.value.settings.sidebar.resizable);
        let resizeStartWidth = 0;
        let resizeStartMouseX = 0;
        const node = computed2(() => {
          const id = graph.value.sidebar.nodeId;
          return graph.value.nodes.find((x) => x.id === id);
        });
        const styles = computed2(() => ({
          width: `${width.value}px`
        }));
        const displayedInterfaces = computed2(() => {
          if (!node.value) {
            return [];
          }
          const allIntfs = [...Object.values(node.value.inputs), ...Object.values(node.value.outputs)];
          return allIntfs.filter((intf) => intf.displayInSidebar && intf.component);
        });
        const close = () => {
          graph.value.sidebar.visible = false;
        };
        const startResize = (event) => {
          resizeStartWidth = width.value;
          resizeStartMouseX = event.clientX;
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener(
            "mouseup",
            () => {
              window.removeEventListener("mousemove", onMouseMove);
            },
            { once: true }
          );
        };
        const onMouseMove = (event) => {
          const maxwidth = el.value?.parentElement?.getBoundingClientRect().width ?? 500;
          const deltaX = event.clientX - resizeStartMouseX;
          let newWidth = resizeStartWidth - deltaX;
          if (newWidth < 300) {
            newWidth = 300;
          } else if (newWidth > 0.9 * maxwidth) {
            newWidth = 0.9 * maxwidth;
          }
          width.value = newWidth;
        };
        return { el, graph, resizable, node, styles, displayedInterfaces, startResize, close };
      }
    });
    _hoisted_1$n = { class: "__header" };
    _hoisted_2$6 = { class: "__node-name" };
    Sidebar = /* @__PURE__ */ _export_sfc(_sfc_main$q, [["render", _sfc_render$k]]);
    _sfc_main$p = /* @__PURE__ */ defineComponent({
      __name: "Minimap",
      setup(__props) {
        const { viewModel } = useViewModel();
        const { graph } = useGraph();
        const canvas2 = ref(null);
        const showViewBounds = ref(false);
        let ctx;
        let dragging = false;
        let bounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
        let interval;
        const updateCanvas = () => {
          if (!ctx) {
            return;
          }
          ctx.canvas.width = canvas2.value.offsetWidth;
          ctx.canvas.height = canvas2.value.offsetHeight;
          const nodeCoords = /* @__PURE__ */ new Map();
          const nodeDomElements = /* @__PURE__ */ new Map();
          for (const n of graph.value.nodes) {
            const domElement = getDomElementOfNode(n);
            const width = domElement?.offsetWidth ?? 0;
            const height = domElement?.offsetHeight ?? 0;
            const posX = n.position?.x ?? 0;
            const posY = n.position?.y ?? 0;
            nodeCoords.set(n, {
              x1: posX,
              y1: posY,
              x2: posX + width,
              y2: posY + height
            });
            nodeDomElements.set(n, domElement);
          }
          const newBounds = {
            x1: Number.MAX_SAFE_INTEGER,
            y1: Number.MAX_SAFE_INTEGER,
            x2: Number.MIN_SAFE_INTEGER,
            y2: Number.MIN_SAFE_INTEGER
          };
          for (const nc of nodeCoords.values()) {
            if (nc.x1 < newBounds.x1) {
              newBounds.x1 = nc.x1;
            }
            if (nc.y1 < newBounds.y1) {
              newBounds.y1 = nc.y1;
            }
            if (nc.x2 > newBounds.x2) {
              newBounds.x2 = nc.x2;
            }
            if (nc.y2 > newBounds.y2) {
              newBounds.y2 = nc.y2;
            }
          }
          const padding = 50;
          newBounds.x1 -= padding;
          newBounds.y1 -= padding;
          newBounds.x2 += padding;
          newBounds.y2 += padding;
          bounds = newBounds;
          const canvasRatio = ctx.canvas.width / ctx.canvas.height;
          const boundsRatio = (bounds.x2 - bounds.x1) / (bounds.y2 - bounds.y1);
          if (canvasRatio > boundsRatio) {
            const diff = (canvasRatio - boundsRatio) * (bounds.y2 - bounds.y1) * 0.5;
            bounds.x1 -= diff;
            bounds.x2 += diff;
          } else {
            const boundsWidth = bounds.x2 - bounds.x1;
            const boundsHeight = bounds.y2 - bounds.y1;
            const diff = (boundsWidth - canvasRatio * boundsHeight) / canvasRatio * 0.5;
            bounds.y1 -= diff;
            bounds.y2 += diff;
          }
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.strokeStyle = "white";
          for (const c of graph.value.connections) {
            const [origX1, origY1] = getPortCoordinates(getDomElements(c.from));
            const [origX2, origY2] = getPortCoordinates(getDomElements(c.to));
            const [x1, y1] = transformCoordinates(origX1, origY1);
            const [x2, y2] = transformCoordinates(origX2, origY2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            if (viewModel.value.settings.useStraightConnections) {
              ctx.lineTo(x2, y2);
            } else {
              const dx = 0.3 * Math.abs(x1 - x2);
              ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
            }
            ctx.stroke();
          }
          ctx.strokeStyle = "lightgray";
          for (const [n, nc] of nodeCoords.entries()) {
            const [x1, y1] = transformCoordinates(nc.x1, nc.y1);
            const [x2, y2] = transformCoordinates(nc.x2, nc.y2);
            ctx.fillStyle = getNodeColor(nodeDomElements.get(n));
            ctx.beginPath();
            ctx.rect(x1, y1, x2 - x1, y2 - y1);
            ctx.fill();
            ctx.stroke();
          }
          if (showViewBounds.value) {
            const viewBounds = getViewBounds();
            const [x1, y1] = transformCoordinates(viewBounds.x1, viewBounds.y1);
            const [x2, y2] = transformCoordinates(viewBounds.x2, viewBounds.y2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          }
        };
        const transformCoordinates = (origX, origY) => {
          return [
            (origX - bounds.x1) / (bounds.x2 - bounds.x1) * ctx.canvas.width,
            (origY - bounds.y1) / (bounds.y2 - bounds.y1) * ctx.canvas.height
          ];
        };
        const reverseTransform = (thisX, thisY) => {
          return [
            thisX * (bounds.x2 - bounds.x1) / ctx.canvas.width + bounds.x1,
            thisY * (bounds.y2 - bounds.y1) / ctx.canvas.height + bounds.y1
          ];
        };
        const getNodeColor = (domElement) => {
          if (domElement) {
            const content = domElement.querySelector(".__content");
            if (content) {
              const contentColor = getComputedColor(content);
              if (contentColor) {
                return contentColor;
              }
            }
            const nodeColor = getComputedColor(domElement);
            if (nodeColor) {
              return nodeColor;
            }
          }
          return "gray";
        };
        const getComputedColor = (domElement) => {
          const c = getComputedStyle(domElement).backgroundColor;
          if (c && c !== "rgba(0, 0, 0, 0)") {
            return c;
          }
        };
        const getViewBounds = () => {
          const parentWidth = canvas2.value.parentElement.offsetWidth;
          const parentHeight = canvas2.value.parentElement.offsetHeight;
          const x2 = parentWidth / graph.value.scaling - graph.value.panning.x;
          const y2 = parentHeight / graph.value.scaling - graph.value.panning.y;
          return { x1: -graph.value.panning.x, y1: -graph.value.panning.y, x2, y2 };
        };
        const mousedown = (ev) => {
          if (ev.button === 0) {
            dragging = true;
            mousemove(ev);
          }
        };
        const mousemove = (ev) => {
          if (dragging) {
            const [cx, cy] = reverseTransform(ev.offsetX, ev.offsetY);
            const viewBounds = getViewBounds();
            const dx = (viewBounds.x2 - viewBounds.x1) / 2;
            const dy = (viewBounds.y2 - viewBounds.y1) / 2;
            graph.value.panning.x = -(cx - dx);
            graph.value.panning.y = -(cy - dy);
          }
        };
        const mouseup = () => {
          dragging = false;
        };
        const mouseenter = () => {
          showViewBounds.value = true;
        };
        const mouseleave = () => {
          showViewBounds.value = false;
          mouseup();
        };
        watch2([showViewBounds, graph.value.panning, () => graph.value.scaling, () => graph.value.connections.length], () => {
          updateCanvas();
        });
        const nodePositions = computed2(() => graph.value.nodes.map((n) => n.position));
        const nodeSizes = computed2(() => graph.value.nodes.map((n) => n.width));
        watch2(
          [nodePositions, nodeSizes],
          () => {
            updateCanvas();
          },
          { deep: true }
        );
        onMounted(() => {
          ctx = canvas2.value.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          updateCanvas();
          interval = setInterval(updateCanvas, 500);
        });
        onBeforeUnmount(() => {
          clearInterval(interval);
        });
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock("canvas", {
            ref_key: "canvas",
            ref: canvas2,
            class: "baklava-minimap",
            onMouseenter: mouseenter,
            onMouseleave: mouseleave,
            onMousedown: withModifiers(mousedown, ["self"]),
            onMousemove: withModifiers(mousemove, ["self"]),
            onMouseup: mouseup,
            onContextmenu: _cache[0] || (_cache[0] = withModifiers(() => {
            }, ["stop", "prevent"]))
          }, null, 544);
        };
      }
    });
    _sfc_main$o = defineComponent({
      components: { ContextMenu: _sfc_main$x, VerticalDots },
      props: {
        type: {
          type: String,
          required: true
        },
        title: {
          type: String,
          required: true
        }
      },
      setup(props) {
        const { viewModel } = useViewModel();
        const { switchGraph } = useGraph();
        const showContextMenu = ref(false);
        const hasContextMenu = computed2(() => props.type.startsWith(GRAPH_NODE_TYPE_PREFIX));
        const contextMenuItems = [
          { label: "Edit Subgraph", value: "editSubgraph" },
          { label: "Delete Subgraph", value: "deleteSubgraph" }
        ];
        const openContextMenu = () => {
          showContextMenu.value = true;
        };
        const onContextMenuClick = (action) => {
          const graphTemplateId = props.type.substring(GRAPH_NODE_TYPE_PREFIX.length);
          const graphTemplate = viewModel.value.editor.graphTemplates.find((gt) => gt.id === graphTemplateId);
          if (!graphTemplate) {
            return;
          }
          switch (action) {
            case "editSubgraph":
              switchGraph(graphTemplate);
              break;
            case "deleteSubgraph":
              viewModel.value.editor.removeGraphTemplate(graphTemplate);
              break;
          }
        };
        return { showContextMenu, hasContextMenu, contextMenuItems, openContextMenu, onContextMenuClick };
      }
    });
    _hoisted_1$m = ["data-node-type"];
    _hoisted_2$5 = { class: "__title" };
    _hoisted_3$4 = { class: "__title-label" };
    _hoisted_4$4 = {
      key: 0,
      class: "__menu"
    };
    PaletteEntry = /* @__PURE__ */ _export_sfc(_sfc_main$o, [["render", _sfc_render$j]]);
    _hoisted_1$l = { key: 0 };
    _sfc_main$n = /* @__PURE__ */ defineComponent({
      __name: "NodePalette",
      setup(__props) {
        const { viewModel } = useViewModel();
        const { x: mouseX, y: mouseY } = usePointer();
        const { transform } = useTransform();
        const categories = useNodeCategories(viewModel);
        const editorEl = inject("editorEl");
        const draggedNode = ref(null);
        const draggedNodeStyles = computed2(() => {
          if (!draggedNode.value || !editorEl?.value) {
            return {};
          }
          const { left, top } = editorEl.value.getBoundingClientRect();
          return {
            top: `${mouseY.value - top}px`,
            left: `${mouseX.value - left}px`
          };
        });
        const onDragStart = (type, nodeInformation) => {
          draggedNode.value = {
            type,
            nodeInformation
          };
          const onDragEnd = () => {
            const instance = reactive(new nodeInformation.type());
            viewModel.value.displayedGraph.addNode(instance);
            const rect = editorEl.value.getBoundingClientRect();
            const [x, y] = transform(mouseX.value - rect.left, mouseY.value - rect.top);
            instance.position.x = x;
            instance.position.y = y;
            draggedNode.value = null;
            document.removeEventListener("pointerup", onDragEnd);
          };
          document.addEventListener("pointerup", onDragEnd);
        };
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock(Fragment, null, [
            createBaseVNode("div", {
              class: "baklava-node-palette",
              onContextmenu: _cache[0] || (_cache[0] = withModifiers(() => {
              }, ["stop", "prevent"]))
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(categories), (c) => {
                return openBlock(), createElementBlock("section", {
                  key: c.name
                }, [
                  c.name !== "default" ? (openBlock(), createElementBlock("h1", _hoisted_1$l, toDisplayString(c.name), 1)) : createCommentVNode("", true),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(c.nodeTypes, (ni, nt) => {
                    return openBlock(), createBlock(PaletteEntry, {
                      key: nt,
                      type: nt,
                      title: ni.title,
                      onPointerdown: ($event) => onDragStart(nt, ni)
                    }, null, 8, ["type", "title", "onPointerdown"]);
                  }), 128))
                ]);
              }), 128))
            ], 32),
            createVNode(Transition, { name: "fade" }, {
              default: withCtx(() => [
                draggedNode.value ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  class: "baklava-dragged-node",
                  style: normalizeStyle(draggedNodeStyles.value)
                }, [
                  createVNode(PaletteEntry, {
                    type: draggedNode.value.type,
                    title: draggedNode.value.nodeInformation.title
                  }, null, 8, ["type", "title"])
                ], 4)) : createCommentVNode("", true)
              ]),
              _: 1
            })
          ], 64);
        };
      }
    });
    _sfc_main$m = defineComponent({
      props: {
        command: {
          type: String,
          required: true
        },
        title: {
          type: String,
          required: true
        },
        icon: {
          type: Object,
          required: false,
          default: void 0
        }
      },
      setup() {
        const { viewModel } = useViewModel();
        return { viewModel };
      }
    });
    _hoisted_1$k = ["disabled", "title"];
    ToolbarButton = /* @__PURE__ */ _export_sfc(_sfc_main$m, [["render", _sfc_render$i]]);
    _sfc_main$l = /* @__PURE__ */ defineComponent({
      __name: "Toolbar",
      setup(__props) {
        const { viewModel } = useViewModel();
        const isSubgraph = computed2(() => viewModel.value.displayedGraph !== viewModel.value.editor.graph);
        const commands = computed2(() => viewModel.value.settings.toolbar.commands);
        const subgraphCommands = computed2(() => viewModel.value.settings.toolbar.subgraphCommands);
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock("div", {
            class: "baklava-toolbar",
            onContextmenu: _cache[0] || (_cache[0] = withModifiers(() => {
            }, ["stop", "prevent"]))
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(commands.value, (c) => {
              return openBlock(), createBlock(ToolbarButton, {
                key: c.command,
                command: c.command,
                title: c.title,
                icon: c.icon
              }, null, 8, ["command", "title", "icon"]);
            }), 128)),
            isSubgraph.value ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(subgraphCommands.value, (c) => {
              return openBlock(), createBlock(ToolbarButton, {
                key: c.command,
                command: c.command,
                title: c.title,
                icon: c.icon
              }, null, 8, ["command", "title", "icon"]);
            }), 128)) : createCommentVNode("", true)
          ], 32);
        };
      }
    });
    _hoisted_1$j = { class: "connections-container" };
    _sfc_main$k = /* @__PURE__ */ defineComponent({
      __name: "Editor",
      props: {
        viewModel: {}
      },
      setup(__props) {
        const props = __props;
        const token = Symbol("EditorToken");
        const viewModelRef2 = toRef(props, "viewModel");
        providePlugin(viewModelRef2);
        const el = ref(null);
        provide("editorEl", el);
        const nodes = computed2(() => props.viewModel.displayedGraph.nodes);
        const dragMoves = computed2(() => props.viewModel.displayedGraph.nodes.map((n) => useDragMove(toRef(n, "position"))));
        const connections = computed2(() => props.viewModel.displayedGraph.connections);
        const selectedNodes = computed2(() => props.viewModel.displayedGraph.selectedNodes);
        const panZoom = usePanZoom();
        const temporaryConnection = provideTemporaryConnection();
        const contextMenu = useContextMenu(viewModelRef2);
        const selectionBox = useSelectionBox(el);
        const nodeContainerStyle = computed2(() => ({
          ...panZoom.styles.value
        }));
        const counter = ref(0);
        props.viewModel.editor.hooks.load.subscribe(token, (s) => {
          counter.value++;
          return s;
        });
        const onPointerMove = (ev) => {
          panZoom.onPointerMove(ev);
          temporaryConnection.onMouseMove(ev);
        };
        const onPointerDown = (ev) => {
          if (ev.button === 0) {
            if (selectionBox.onPointerDown(ev)) {
              return;
            }
            if (ev.target === el.value) {
              unselectAllNodes();
              panZoom.onPointerDown(ev);
            }
            temporaryConnection.onMouseDown();
          }
        };
        const onPointerUp = (ev) => {
          panZoom.onPointerUp(ev);
          temporaryConnection.onMouseUp();
        };
        const keyDown = (ev) => {
          if (ev.key === "Tab") {
            ev.preventDefault();
          }
          props.viewModel.commandHandler.handleKeyDown(ev);
        };
        const keyUp = (ev) => {
          props.viewModel.commandHandler.handleKeyUp(ev);
        };
        const selectNode = (node) => {
          if (!["Control", "Shift"].some((k) => props.viewModel.commandHandler.pressedKeys.includes(k))) {
            unselectAllNodes();
          }
          props.viewModel.displayedGraph.selectedNodes.push(node);
        };
        const unselectAllNodes = () => {
          props.viewModel.displayedGraph.selectedNodes = [];
        };
        const startDrag = (ev) => {
          for (const selectedNode of props.viewModel.displayedGraph.selectedNodes) {
            const idx = nodes.value.indexOf(selectedNode);
            const dragMove = dragMoves.value[idx];
            dragMove.onPointerDown(ev);
            document.addEventListener("pointermove", dragMove.onPointerMove);
          }
          document.addEventListener("pointerup", stopDrag);
        };
        const stopDrag = () => {
          for (const selectedNode of props.viewModel.displayedGraph.selectedNodes) {
            const idx = nodes.value.indexOf(selectedNode);
            const dragMove = dragMoves.value[idx];
            dragMove.onPointerUp();
            document.removeEventListener("pointermove", dragMove.onPointerMove);
          }
          document.removeEventListener("pointerup", stopDrag);
        };
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock("div", {
            ref_key: "el",
            ref: el,
            tabindex: "-1",
            class: normalizeClass(["baklava-editor", {
              "baklava-ignore-mouse": !!unref(temporaryConnection).temporaryConnection.value || unref(panZoom).dragging.value,
              "--temporary-connection": !!unref(temporaryConnection).temporaryConnection.value,
              "--start-selection-box": unref(selectionBox).startSelection
            }]),
            onPointermove: withModifiers(onPointerMove, ["self"]),
            onPointerdown: onPointerDown,
            onPointerup: onPointerUp,
            onWheel: _cache[1] || (_cache[1] = withModifiers(
              //@ts-ignore
              (...args) => unref(panZoom).onMouseWheel && unref(panZoom).onMouseWheel(...args),
              ["self"]
            )),
            onKeydown: keyDown,
            onKeyup: keyUp,
            onContextmenu: _cache[2] || (_cache[2] = withModifiers(
              //@ts-ignore
              (...args) => unref(contextMenu).open && unref(contextMenu).open(...args),
              ["self"]
            ))
          }, [
            renderSlot(_ctx.$slots, "background", {}, () => [
              createVNode(Background)
            ]),
            renderSlot(_ctx.$slots, "toolbar", {}, () => [
              __props.viewModel.settings.toolbar.enabled ? (openBlock(), createBlock(_sfc_main$l, { key: 0 })) : createCommentVNode("", true)
            ]),
            renderSlot(_ctx.$slots, "palette", {}, () => [
              __props.viewModel.settings.palette.enabled ? (openBlock(), createBlock(_sfc_main$n, { key: 0 })) : createCommentVNode("", true)
            ]),
            (openBlock(), createElementBlock("svg", _hoisted_1$j, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(connections.value, (connection) => {
                return openBlock(), createElementBlock("g", {
                  key: connection.id + counter.value.toString()
                }, [
                  renderSlot(_ctx.$slots, "connection", { connection }, () => [
                    createVNode(ConnectionWrapper, { connection }, null, 8, ["connection"])
                  ])
                ]);
              }), 128)),
              renderSlot(_ctx.$slots, "temporaryConnection", {
                temporaryConnection: unref(temporaryConnection).temporaryConnection.value
              }, () => [
                unref(temporaryConnection).temporaryConnection.value ? (openBlock(), createBlock(TemporaryConnection, {
                  key: 0,
                  connection: unref(temporaryConnection).temporaryConnection.value
                }, null, 8, ["connection"])) : createCommentVNode("", true)
              ])
            ])),
            createBaseVNode("div", {
              class: "node-container",
              style: normalizeStyle(nodeContainerStyle.value)
            }, [
              createVNode(TransitionGroup, { name: "fade" }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(nodes.value, (node, idx) => {
                    return renderSlot(_ctx.$slots, "node", {
                      key: node.id + counter.value.toString(),
                      node,
                      selected: selectedNodes.value.includes(node),
                      dragging: dragMoves.value[idx].dragging.value,
                      onSelect: ($event) => selectNode(node),
                      onStartDrag: startDrag
                    }, () => [
                      createVNode(_sfc_main$u, {
                        node,
                        selected: selectedNodes.value.includes(node),
                        dragging: dragMoves.value[idx].dragging.value,
                        onSelect: ($event) => selectNode(node),
                        onStartDrag: startDrag
                      }, null, 8, ["node", "selected", "dragging", "onSelect"])
                    ]);
                  }), 128))
                ]),
                _: 3
              })
            ], 4),
            renderSlot(_ctx.$slots, "sidebar", {}, () => [
              __props.viewModel.settings.sidebar.enabled ? (openBlock(), createBlock(Sidebar, { key: 0 })) : createCommentVNode("", true)
            ]),
            renderSlot(_ctx.$slots, "minimap", {}, () => [
              __props.viewModel.settings.enableMinimap ? (openBlock(), createBlock(_sfc_main$p, { key: 0 })) : createCommentVNode("", true)
            ]),
            renderSlot(_ctx.$slots, "contextMenu", { contextMenu: unref(contextMenu) }, () => [
              __props.viewModel.settings.contextMenu.enabled ? (openBlock(), createBlock(_sfc_main$x, {
                key: 0,
                modelValue: unref(contextMenu).show.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(contextMenu).show.value = $event),
                items: unref(contextMenu).items.value,
                x: unref(contextMenu).x.value,
                y: unref(contextMenu).y.value,
                onClick: unref(contextMenu).onClick
              }, null, 8, ["modelValue", "items", "x", "y", "onClick"])) : createCommentVNode("", true)
            ]),
            unref(selectionBox).isSelecting ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "selection-box",
              style: normalizeStyle(unref(selectionBox).getStyles())
            }, null, 4)) : createCommentVNode("", true)
          ], 34);
        };
      }
    });
    useCommandHandler = () => {
      const commands = ref(/* @__PURE__ */ new Map());
      const hasCommand = (name) => commands.value.has(name);
      const registerCommand = (name, command) => {
        if (commands.value.has(name)) {
          throw new Error(`Command "${name}" already exists`);
        }
        commands.value.set(name, command);
      };
      const executeCommand = (name, throwOnNonexisting = false, ...args) => {
        if (!commands.value.has(name)) {
          if (throwOnNonexisting) {
            throw new Error(`[CommandHandler] Command ${name} not registered`);
          } else {
            return;
          }
        }
        return commands.value.get(name).execute(...args);
      };
      const canExecuteCommand = (name, throwOnNonexisting = false, ...args) => {
        if (!commands.value.has(name)) {
          if (throwOnNonexisting) {
            throw new Error(`[CommandHandler] Command ${name} not registered`);
          } else {
            return false;
          }
        }
        return commands.value.get(name).canExecute(args);
      };
      const hotkeyHandler = useHotkeyHandler(executeCommand);
      return reactive({ hasCommand, registerCommand, executeCommand, canExecuteCommand, ...hotkeyHandler });
    };
    byteToHex2 = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex2.push((i + 256).toString(16).slice(1));
    }
    rnds82 = new Uint8Array(16);
    randomUUID2 = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    native = { randomUUID: randomUUID2 };
    SAVE_SUBGRAPH_COMMAND = "SAVE_SUBGRAPH";
    _sfc_main$j = defineComponent({
      props: {
        intf: {
          type: Object,
          required: true
        }
      },
      setup(props) {
        const onClick = () => {
          if (props.intf.callback) {
            props.intf.callback();
          }
        };
        return { onClick };
      }
    });
    MAX_STRING_LENGTH = 9;
    BaseNumericInterface = class extends NodeInterface {
      constructor(name, value, min, max) {
        super(name, value);
        this.min = min;
        this.max = max;
      }
      validate(v) {
        return (this.min === void 0 || v >= this.min) && (this.max === void 0 || v <= this.max);
      }
    };
    useBaseNumericInterface = (intf, precision = 3) => {
      const inputEl = ref(null);
      const editMode = ref(false);
      const invalid = ref(false);
      const tempValue = ref("0");
      const stringRepresentation = computed2(() => {
        const s = intf.value.value.toFixed(precision);
        return s.length > MAX_STRING_LENGTH ? intf.value.value.toExponential(MAX_STRING_LENGTH - 5) : s;
      });
      const validate = (v) => {
        if (Number.isNaN(v)) {
          return false;
        } else if (isValidator(intf.value)) {
          return intf.value.validate(v);
        } else {
          return true;
        }
      };
      const setValue = (newValue) => {
        if (validate(newValue)) {
          intf.value.value = newValue;
        }
      };
      watch2(tempValue, () => {
        invalid.value = false;
      });
      const enterEditMode = async () => {
        tempValue.value = intf.value.value.toFixed(precision);
        editMode.value = true;
        await nextTick();
        if (inputEl.value) {
          inputEl.value.focus();
        }
      };
      const leaveEditMode = () => {
        const v = parseFloat(tempValue.value);
        if (!validate(v)) {
          invalid.value = true;
        } else {
          setValue(v);
          editMode.value = false;
        }
      };
      return {
        editMode,
        invalid,
        tempValue,
        inputEl,
        stringRepresentation,
        validate,
        setValue,
        enterEditMode,
        leaveEditMode
      };
    };
    _sfc_main$h = {};
    _hoisted_1$g = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    Arrow = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$g]]);
    _sfc_main$g = defineComponent({
      components: {
        "i-arrow": Arrow
      },
      props: {
        intf: {
          type: Object,
          required: true
        }
      },
      setup(props) {
        const baseNumericInterface = useBaseNumericInterface(toRef(props, "intf"), 0);
        const increment = () => {
          baseNumericInterface.setValue(props.intf.value + 1);
        };
        const decrement = () => {
          baseNumericInterface.setValue(props.intf.value - 1);
        };
        return { ...baseNumericInterface, increment, decrement };
      }
    });
    _hoisted_1$e = { class: "baklava-num-input" };
    _hoisted_2$2 = ["title"];
    _hoisted_3$2 = { class: "__value" };
    _hoisted_4$2 = {
      key: 1,
      class: "__content"
    };
    _sfc_main$f = /* @__PURE__ */ defineComponent({
      __name: "NumberInterface",
      props: {
        intf: {}
      },
      setup(__props) {
        const props = __props;
        const { editMode, invalid, tempValue, inputEl, stringRepresentation, enterEditMode, leaveEditMode, setValue } = useBaseNumericInterface(toRef(props, "intf"));
        function increment() {
          const rounded = parseFloat((props.intf.value + 0.1).toFixed(3));
          setValue(rounded);
        }
        function decrement() {
          const rounded = parseFloat((props.intf.value - 0.1).toFixed(3));
          setValue(rounded);
        }
        return (_ctx, _cache) => {
          return openBlock(), createElementBlock("div", _hoisted_1$e, [
            createBaseVNode("div", {
              class: "__button --dec",
              onClick: decrement
            }, [
              createVNode(Arrow)
            ]),
            !unref(editMode) ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: "__content",
              onClick: _cache[0] || (_cache[0] = //@ts-ignore
              (...args) => unref(enterEditMode) && unref(enterEditMode)(...args))
            }, [
              createBaseVNode("div", {
                class: "__label",
                title: __props.intf.name
              }, toDisplayString(__props.intf.name), 9, _hoisted_2$2),
              createBaseVNode("div", _hoisted_3$2, toDisplayString(unref(stringRepresentation)), 1)
            ])) : (openBlock(), createElementBlock("div", _hoisted_4$2, [
              withDirectives(createBaseVNode("input", {
                ref_key: "inputEl",
                ref: inputEl,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef2(tempValue) ? tempValue.value = $event : null),
                type: "number",
                class: normalizeClass(["baklava-input", { "--invalid": unref(invalid) }]),
                style: { "text-align": "right" },
                onBlur: _cache[2] || (_cache[2] = //@ts-ignore
                (...args) => unref(leaveEditMode) && unref(leaveEditMode)(...args)),
                onKeydown: _cache[3] || (_cache[3] = withKeys(
                  //@ts-ignore
                  (...args) => unref(leaveEditMode) && unref(leaveEditMode)(...args),
                  ["enter"]
                ))
              }, null, 34), [
                [vModelText, unref(tempValue)]
              ])
            ])),
            createBaseVNode("div", {
              class: "__button --inc",
              onClick: increment
            }, [
              createVNode(Arrow)
            ])
          ]);
        };
      }
    });
    NumberInterface = class extends BaseNumericInterface {
      constructor() {
        super(...arguments);
        this.component = markRaw(_sfc_main$f);
      }
    };
    _sfc_main$e = defineComponent({
      components: {
        "i-arrow": Arrow
      },
      props: {
        intf: {
          type: Object,
          required: true
        }
      },
      setup(props) {
        const el = ref(null);
        const open = ref(false);
        const selectedItem = computed2(
          () => props.intf.items.find(
            (v) => typeof v === "string" ? v === props.intf.value : v.value === props.intf.value
          )
        );
        const selectedText = computed2(() => {
          if (selectedItem.value) {
            return typeof selectedItem.value === "string" ? selectedItem.value : selectedItem.value.text;
          } else {
            return "";
          }
        });
        const setSelected = (item) => {
          props.intf.value = typeof item === "string" ? item : item.value;
        };
        onClickOutside(el, () => {
          open.value = false;
        });
        return { el, open, selectedItem, selectedText, setSelected };
      }
    });
    _sfc_main$d = defineComponent({
      props: {
        intf: {
          type: Object,
          required: true
        }
      },
      setup(props) {
        const el = ref(null);
        const baseNumericInterface = useBaseNumericInterface(toRef(props, "intf"));
        const didSlide = ref(false);
        const isMouseDown = ref(false);
        const percentage = computed2(
          () => Math.min(100, Math.max(0, (props.intf.value - props.intf.min) * 100 / (props.intf.max - props.intf.min)))
        );
        const mousedown = () => {
          if (baseNumericInterface.editMode.value) {
            return;
          }
          isMouseDown.value = true;
        };
        const mouseup = () => {
          if (baseNumericInterface.editMode.value) {
            return;
          }
          if (!didSlide.value) {
            void baseNumericInterface.enterEditMode();
          }
          isMouseDown.value = false;
          didSlide.value = false;
        };
        const mouseleave = (ev) => {
          if (baseNumericInterface.editMode.value) {
            return;
          }
          if (isMouseDown.value) {
            if (ev.offsetX >= el.value.clientWidth) {
              baseNumericInterface.setValue(props.intf.max);
            } else if (ev.offsetX <= 0) {
              baseNumericInterface.setValue(props.intf.min);
            }
          }
          isMouseDown.value = false;
          didSlide.value = false;
        };
        const mousemove = (ev) => {
          if (baseNumericInterface.editMode.value) {
            return;
          }
          const v = Math.max(
            props.intf.min,
            Math.min(
              props.intf.max,
              (props.intf.max - props.intf.min) * (ev.offsetX / el.value.clientWidth) + props.intf.min
            )
          );
          if (isMouseDown.value) {
            baseNumericInterface.setValue(v);
            didSlide.value = true;
          }
        };
        return { ...baseNumericInterface, el, percentage, mousedown, mouseup, mousemove, mouseleave };
      }
    });
    _sfc_main$c = defineComponent({
      props: {
        intf: {
          type: Object,
          required: true
        }
      }
    });
    _sfc_main$b = defineComponent({
      props: {
        intf: {
          type: Object,
          required: true
        },
        modelValue: {
          type: String,
          required: true
        }
      },
      emits: ["update:modelValue"],
      setup(props, { emit: emit2 }) {
        const v = computed2({
          get: () => props.modelValue,
          set: (v2) => {
            emit2("update:modelValue", v2);
          }
        });
        return { v };
      }
    });
    _hoisted_1$b = ["placeholder", "title"];
    TextInputInterfaceComponent = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$b]]);
    TextInputInterface = class extends NodeInterface {
      constructor() {
        super(...arguments);
        this.component = markRaw(TextInputInterfaceComponent);
      }
    };
    _sfc_main$a = defineComponent({
      props: {
        intf: {
          type: Object,
          required: true
        },
        modelValue: {
          type: String,
          required: true
        }
      },
      emits: ["update:modelValue"],
      setup(props, { emit: emit2 }) {
        const v = computed2({
          get: () => props.modelValue,
          set: (v2) => {
            emit2("update:modelValue", v2);
          }
        });
        return { v };
      }
    });
    SubgraphInputNode = class extends GraphInputNode {
      constructor() {
        super(...arguments);
        this._title = "Subgraph Input";
        this.inputs = {
          name: new TextInputInterface("Name", "Input").setPort(false)
        };
        this.outputs = {
          placeholder: new NodeInterface("Connection", void 0)
        };
      }
    };
    SubgraphOutputNode = class extends GraphOutputNode {
      constructor() {
        super(...arguments);
        this._title = "Subgraph Output";
        this.inputs = {
          name: new TextInputInterface("Name", "Output").setPort(false),
          placeholder: new NodeInterface("Connection", void 0)
        };
        this.outputs = {
          output: new NodeInterface("Output", void 0).setHidden(true)
        };
      }
    };
    CREATE_SUBGRAPH_COMMAND = "CREATE_SUBGRAPH";
    IGNORE_NODE_TYPES = [GRAPH_INPUT_NODE_TYPE, GRAPH_OUTPUT_NODE_TYPE];
    NodeStep = class {
      constructor(type, data) {
        this.type = type;
        if (type === "addNode") {
          this.nodeId = data;
        } else {
          this.nodeState = data;
        }
      }
      undo(graph) {
        if (this.type === "addNode") {
          this.removeNode(graph);
        } else {
          this.addNode(graph);
        }
      }
      redo(graph) {
        if (this.type === "addNode" && this.nodeState) {
          this.addNode(graph);
        } else if (this.type === "removeNode" && this.nodeId) {
          this.removeNode(graph);
        }
      }
      addNode(graph) {
        const nodeType = graph.editor.nodeTypes.get(this.nodeState.type);
        if (!nodeType) {
          return;
        }
        const n = new nodeType.type();
        graph.addNode(n);
        n.load(this.nodeState);
        this.nodeId = n.id;
      }
      removeNode(graph) {
        const node = graph.nodes.find((n) => n.id === this.nodeId);
        if (!node) {
          return;
        }
        this.nodeState = node.save();
        graph.removeNode(node);
      }
    };
    ConnectionStep = class {
      constructor(type, data) {
        this.type = type;
        if (type === "addConnection") {
          this.connectionId = data;
        } else {
          const d = data;
          this.connectionState = {
            id: d.id,
            from: d.from.id,
            to: d.to.id
          };
        }
      }
      undo(graph) {
        if (this.type === "addConnection") {
          this.removeConnection(graph);
        } else {
          this.addConnection(graph);
        }
      }
      redo(graph) {
        if (this.type === "addConnection" && this.connectionState) {
          this.addConnection(graph);
        } else if (this.type === "removeConnection" && this.connectionId) {
          this.removeConnection(graph);
        }
      }
      addConnection(graph) {
        const fromIntf = graph.findNodeInterface(this.connectionState.from);
        const toIntf = graph.findNodeInterface(this.connectionState.to);
        if (!fromIntf || !toIntf) {
          return;
        }
        const connection = graph.addConnection(fromIntf, toIntf);
        if (connection) {
          connection.id = this.connectionState.id;
        }
        this.connectionId = connection?.id;
      }
      removeConnection(graph) {
        const connection = graph.connections.find((c) => c.id === this.connectionId);
        if (!connection) {
          return;
        }
        this.connectionState = {
          id: connection.id,
          from: connection.from.id,
          to: connection.to.id
        };
        graph.removeConnection(connection);
      }
    };
    TransactionStep = class {
      constructor(steps) {
        this.type = "transaction";
        if (steps.length === 0) {
          throw new Error("Can't create a transaction with no steps");
        }
        this.steps = steps;
      }
      undo(graph) {
        for (let i = this.steps.length - 1; i >= 0; i--) {
          this.steps[i].undo(graph);
        }
      }
      redo(graph) {
        for (let i = 0; i < this.steps.length; i++) {
          this.steps[i].redo(graph);
        }
      }
    };
    UNDO_COMMAND = "UNDO";
    REDO_COMMAND = "REDO";
    START_TRANSACTION_COMMAND = "START_TRANSACTION";
    COMMIT_TRANSACTION_COMMAND = "COMMIT_TRANSACTION";
    CLEAR_HISTORY_COMMAND = "CLEAR_HISTORY";
    DELETE_NODES_COMMAND = "DELETE_NODES";
    SWITCH_TO_MAIN_GRAPH_COMMAND = "SWITCH_TO_MAIN_GRAPH";
    isTemplate = (g) => !(g instanceof Graph);
    COPY_COMMAND = "COPY";
    PASTE_COMMAND = "PASTE";
    CLEAR_CLIPBOARD_COMMAND = "CLEAR_CLIPBOARD";
    OPEN_SIDEBAR_COMMAND = "OPEN_SIDEBAR";
    ZOOM_TO_FIT_RECT_COMMAND = "ZOOM_TO_FIT_RECT";
    ZOOM_TO_FIT_NODES_COMMAND = "ZOOM_TO_FIT_NODES";
    ZOOM_TO_FIT_GRAPH_COMMAND = "ZOOM_TO_FIT_GRAPH";
    _sfc_main$9 = {};
    _hoisted_1$9 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    ArrowBackUp = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$9]]);
    _sfc_main$8 = {};
    _hoisted_1$8 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    ArrowForwardUp = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$8]]);
    _sfc_main$7 = {};
    _hoisted_1$7 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    ArrowLeft = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$7]]);
    _sfc_main$6 = {};
    _hoisted_1$6 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    Clipboard = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$6]]);
    _sfc_main$5 = {};
    _hoisted_1$5 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    Copy = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$5]]);
    _sfc_main$4 = {};
    _hoisted_1$4 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    DeviceFloppy = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$4]]);
    _sfc_main$3 = {};
    _hoisted_1$3 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    Hierarchy2 = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$3]]);
    _sfc_main$2 = {};
    _hoisted_1$2 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "1.5",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    SelectAll = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2]]);
    _sfc_main$1 = {};
    _hoisted_1$1 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "1.5",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    Trash = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1]]);
    _sfc_main = {};
    _hoisted_1 = {
      xmlns: "http://www.w3.org/2000/svg",
      class: "baklava-icon",
      width: "24",
      height: "24",
      viewBox: "0 0 24 24",
      "stroke-width": "2",
      stroke: "currentColor",
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    };
    ZoomScan = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
    TOOLBAR_COMMANDS = {
      COPY: { command: COPY_COMMAND, title: "Copy", icon: markRaw(Copy) },
      PASTE: { command: PASTE_COMMAND, title: "Paste", icon: markRaw(Clipboard) },
      DELETE_NODES: { command: DELETE_NODES_COMMAND, title: "Delete selected nodes", icon: markRaw(Trash) },
      UNDO: { command: UNDO_COMMAND, title: "Undo", icon: markRaw(ArrowBackUp) },
      REDO: { command: REDO_COMMAND, title: "Redo", icon: markRaw(ArrowForwardUp) },
      ZOOM_TO_FIT_GRAPH: { command: ZOOM_TO_FIT_GRAPH_COMMAND, title: "Zoom to Fit", icon: markRaw(ZoomScan) },
      START_SELECTION_BOX: { command: START_SELECTION_BOX_COMMAND, title: "Box Select", icon: markRaw(SelectAll) },
      CREATE_SUBGRAPH: { command: CREATE_SUBGRAPH_COMMAND, title: "Create Subgraph", icon: markRaw(Hierarchy2) }
    };
    DEFAULT_TOOLBAR_COMMANDS = Object.values(TOOLBAR_COMMANDS);
    TOOLBAR_SUBGRAPH_COMMANDS = {
      SAVE_SUBGRAPH: { command: SAVE_SUBGRAPH_COMMAND, title: "Save Subgraph", icon: markRaw(DeviceFloppy) },
      SWITCH_TO_MAIN_GRAPH: {
        command: SWITCH_TO_MAIN_GRAPH_COMMAND,
        title: "Back to Main Graph",
        icon: markRaw(ArrowLeft)
      }
    };
    DEFAULT_TOOLBAR_SUBGRAPH_COMMANDS = Object.values(TOOLBAR_SUBGRAPH_COMMANDS);
    DEFAULT_SETTINGS = () => ({
      useStraightConnections: false,
      enableMinimap: false,
      toolbar: { enabled: true, commands: DEFAULT_TOOLBAR_COMMANDS, subgraphCommands: DEFAULT_TOOLBAR_SUBGRAPH_COMMANDS },
      palette: { enabled: true },
      background: { gridSize: 100, gridDivision: 5, subGridVisibleThreshold: 0.6 },
      sidebar: { enabled: true, width: 300, resizable: true },
      displayValueOnHover: false,
      nodes: { defaultWidth: 200, maxWidth: 320, minWidth: 150, resizable: false, reverseY: false },
      contextMenu: { enabled: true, additionalItems: [] },
      panZoom: { minScale: 0.05, maxScale: 10 },
      zoomToFit: { paddingLeft: 300, paddingRight: 50, paddingTop: 110, paddingBottom: 50 }
    });
  }
});

// node_modules/@baklavajs/interface-types/dist/esm/index.js
function setType(intf, type) {
  intf.type = type.name;
}
var NodeInterfaceType, BaklavaInterfaceTypes;
var init_esm3 = __esm({
  "node_modules/@baklavajs/interface-types/dist/esm/index.js"() {
    NodeInterfaceType = class {
      constructor(name) {
        this.name = name;
        this.conversions = [];
      }
      /**
       * A conversion makes it possible to connect two node interfaces although they have different types.
       * @param to Type to convert to
       * @param transformationFunction
       * Will be called to transform the value from one type to another.
       * A transformation to convert the type `string` to `number` could be `parseInt`.
       *
       * @returns the instance the method was called on for chaining
       */
      addConversion(to, transformationFunction = (value) => value) {
        this.conversions.push({
          targetType: to.name,
          transformationFunction
        });
        return this;
      }
    };
    BaklavaInterfaceTypes = class {
      constructor(editor, options) {
        this.types = /* @__PURE__ */ new Map();
        this.editor = editor;
        this.editor.graphEvents.checkConnection.subscribe(this, ({ from, to }, prevent) => {
          const fromType = from.type;
          const toType = to.type;
          if (!fromType || !toType) {
            return;
          } else if (!this.canConvert(fromType, toType)) {
            return prevent();
          }
        });
        if (options === null || options === void 0 ? void 0 : options.engine) {
          options.engine.hooks.transferData.subscribe(this, (value, connection) => {
            const fromType = connection.from.type;
            const toType = connection.to.type;
            if (!fromType || !toType) {
              return value;
            }
            return this.convert(fromType, toType, value);
          });
        }
        if (options === null || options === void 0 ? void 0 : options.viewPlugin) {
          options.viewPlugin.hooks.renderInterface.subscribe(this, ({ intf, el }) => {
            if (intf.type) {
              el.setAttribute("data-interface-type", intf.type);
            }
            return { intf, el };
          });
        }
      }
      /**
       * Add a new node interface type
       * @param types The types to add
       */
      addTypes(...types) {
        types.forEach((t) => {
          this.types.set(t.name, t);
        });
        return this;
      }
      getConversion(from, to) {
        var _a, _b;
        return (_b = (_a = this.types.get(from)) === null || _a === void 0 ? void 0 : _a.conversions.find((c) => c.targetType === to)) !== null && _b !== void 0 ? _b : null;
      }
      canConvert(from, to) {
        return from === to || this.types.has(from) && this.types.get(from).conversions.some((c) => c.targetType === to);
      }
      convert(from, to, value) {
        if (from === to) {
          return value;
        } else {
          const c = this.getConversion(from, to);
          if (c) {
            return c.transformationFunction(value);
          } else {
            throw Error(`Can not convert from "${from}" to "${to}"`);
          }
        }
      }
    };
  }
});

// client/src/workflow/portTypes.ts
var imageType, textType, fileType, boolType, numberType, jsonType, ALL_PORT_TYPES;
var init_portTypes = __esm({
  "client/src/workflow/portTypes.ts"() {
    init_esm3();
    imageType = new NodeInterfaceType("image");
    textType = new NodeInterfaceType("text");
    fileType = new NodeInterfaceType("file");
    boolType = new NodeInterfaceType("boolean");
    numberType = new NodeInterfaceType("number");
    jsonType = new NodeInterfaceType("json");
    ALL_PORT_TYPES = [imageType, textType, fileType, boolType, numberType, jsonType];
  }
});

// client/src/workflow/canvas.ts
var EMPTY_STATE, PORT_COLORS, WorkflowCanvas;
var init_canvas = __esm({
  "client/src/workflow/canvas.ts"() {
    init_esm2();
    init_renderer_vue_es();
    init_esm3();
    init_vue_runtime_esm_bundler();
    init_portTypes();
    EMPTY_STATE = {
      graph: { id: "__empty__", nodes: [], connections: [], panning: { x: 0, y: 0 }, scaling: 1 },
      graphTemplates: []
    };
    PORT_COLORS = {
      image: "#5c7cfa",
      text: "#20c997",
      file: "#f59f00",
      boolean: "#e64980",
      number: "#7950f2",
      json: "#1c7ed6"
    };
    WorkflowCanvas = class {
      constructor(container, registrations) {
        __publicField(this, "editor");
        __publicField(this, "app", null);
        __publicField(this, "vm", null);
        this.editor = new Editor();
        const editor = this.editor;
        const self2 = this;
        const Root = defineComponent({
          setup() {
            const baklava = useBaklava(editor);
            self2.vm = baklava;
            new BaklavaInterfaceTypes(editor, { viewPlugin: baklava }).addTypes(...ALL_PORT_TYPES);
            for (const { NodeClass, title, category } of registrations) {
              editor.registerNodeType(NodeClass, { title, category });
            }
            const groups = computed2(() => {
              const map2 = /* @__PURE__ */ new Map();
              for (const reg of registrations) {
                const list = map2.get(reg.category) ?? [];
                list.push(reg);
                map2.set(reg.category, list);
              }
              return [...map2.entries()];
            });
            function handleDrop(e) {
              e.preventDefault();
              const nodeType = e.dataTransfer?.getData("wf-node-type");
              if (!nodeType) return;
              const reg = registrations.find(
                (r) => (r.NodeClass.type ?? r.title) === nodeType
              );
              if (!reg) return;
              const g = editor.graph;
              const panX = g.panning?.x ?? 0;
              const panY = g.panning?.y ?? 0;
              const scaling = g.scaling ?? 1;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / scaling - panX;
              const y = (e.clientY - rect.top) / scaling - panY;
              const displayedGraph = self2.vm.displayedGraph;
              const instance = reactive(new reg.NodeClass());
              const placed = displayedGraph.addNode(instance);
              if (placed) {
                placed.position.x = x;
                placed.position.y = y;
              }
            }
            function renderPaletteNode(reg) {
              const inputs = (reg.ports ?? []).filter((p2) => !p2.isOutput);
              const outputs = (reg.ports ?? []).filter((p2) => p2.isOutput);
              const nodeType = reg.NodeClass.type ?? reg.title;
              return h("div", {
                class: "wf-palette-node",
                draggable: true,
                onDragstart: (e) => {
                  e.dataTransfer?.setData("wf-node-type", nodeType);
                  e.dataTransfer.effectAllowed = "copy";
                }
              }, [
                h("div", { class: "wf-palette-node-name" }, reg.title),
                inputs.length + outputs.length > 0 ? h("div", { class: "wf-palette-ports" }, [
                  h(
                    "div",
                    { class: "wf-palette-ports-in" },
                    inputs.map(
                      (p2, i) => h("span", {
                        key: `in-${i}`,
                        class: "wf-port-dot",
                        style: { background: PORT_COLORS[p2.type ?? ""] ?? "#555" },
                        title: `In: ${p2.name}`
                      })
                    )
                  ),
                  h(
                    "div",
                    { class: "wf-palette-ports-out" },
                    outputs.map(
                      (p2, i) => h("span", {
                        key: `out-${i}`,
                        class: "wf-port-dot",
                        style: { background: PORT_COLORS[p2.type ?? ""] ?? "#555" },
                        title: `Out: ${p2.name}`
                      })
                    )
                  )
                ]) : null
              ]);
            }
            return () => h("div", { class: "wf-editor-layout" }, [
              // ── Custom palette panel ───────────────────
              h(
                "div",
                { class: "wf-custom-palette" },
                groups.value.flatMap(([cat, regs]) => [
                  h("div", { class: "wf-palette-cat", key: `cat-${cat}` }, cat),
                  ...regs.map((reg) => renderPaletteNode(reg))
                ])
              ),
              // ── BaklavaJS canvas (built-in palette hidden via CSS) ──
              h(
                "div",
                {
                  class: "wf-canvas-area",
                  onDrop: handleDrop,
                  onDragover: (e) => e.preventDefault()
                },
                h(_sfc_main$k, { viewModel: baklava })
              )
            ]);
          }
        });
        this.app = createApp(Root);
        this.app.mount(container);
      }
      save() {
        return this.editor.save();
      }
      load(state2) {
        this.editor.load(state2 ? state2 : EMPTY_STATE);
      }
      clear() {
        this.editor.load(EMPTY_STATE);
      }
      destroy() {
        this.app?.unmount();
        this.app = null;
      }
    };
  }
});

// client/src/workflow/nodes.ts
function createNodeFromDefinition(def2) {
  const inputsFactory = {};
  for (const p2 of def2.inputs ?? []) {
    inputsFactory[p2.key] = () => {
      if (p2.configOnly) {
        return new TextInputInterface(p2.name, String(p2.defaultValue ?? "")).setPort(false);
      }
      const i = new NodeInterface(p2.name, p2.defaultValue ?? null);
      if (p2.type && p2.type !== "any") {
        const pt = ALL_PORT_TYPES.find((t) => t.name === p2.type);
        if (pt) setType(i, pt);
      }
      return i;
    };
  }
  const outputsFactory = {};
  for (const p2 of def2.outputs ?? []) {
    outputsFactory[p2.key] = () => {
      const i = new NodeInterface(p2.name, null);
      if (p2.type && p2.type !== "any") {
        const pt = ALL_PORT_TYPES.find((t) => t.name === p2.type);
        if (pt) setType(i, pt);
      }
      return i;
    };
  }
  const NodeClass = defineNode({ type: def2.type, title: def2.title, inputs: inputsFactory, outputs: outputsFactory });
  const ports = [
    ...(def2.inputs ?? []).filter((p2) => !p2.configOnly).map((p2) => ({ name: p2.name, type: p2.type, isOutput: false })),
    ...(def2.outputs ?? []).map((p2) => ({ name: p2.name, type: p2.type, isOutput: true }))
  ];
  return { NodeClass, title: def2.title, category: def2.category, ports };
}
function registerPluginNodes(registrations) {
  _pluginRegistrations.push(...registrations);
}
function getAllNodeRegistrations() {
  return [...BUILTIN_NODE_REGISTRATIONS, ..._pluginRegistrations];
}
var TriggerNode, ImageInputNode, ImageOutputNode, SaveNode, DownloadNode, ConfirmNode, SelectNode, IfNode, MergeNode, TextNode, NumberNode, BUILTIN_NODE_REGISTRATIONS, _pluginRegistrations;
var init_nodes = __esm({
  "client/src/workflow/nodes.ts"() {
    init_esm2();
    init_renderer_vue_es();
    init_esm3();
    init_portTypes();
    TriggerNode = defineNode({
      type: "core/trigger",
      title: "Trigger",
      inputs: {},
      outputs: {
        out: () => {
          const i = new NodeInterface("Start", false);
          setType(i, boolType);
          return i;
        }
      }
    });
    ImageInputNode = defineNode({
      type: "core/image-input",
      title: "Image Input",
      inputs: {
        imageUrl: () => new TextInputInterface("Image URL", "").setPort(false)
      },
      outputs: {
        image: () => {
          const i = new NodeInterface("Image", "");
          setType(i, imageType);
          return i;
        }
      }
    });
    ImageOutputNode = defineNode({
      type: "core/image-output",
      title: "Image Output",
      inputs: {
        image: () => {
          const i = new NodeInterface("Image", "");
          setType(i, imageType);
          return i;
        }
      },
      outputs: {}
    });
    SaveNode = defineNode({
      type: "core/save",
      title: "Save",
      inputs: {
        file: () => {
          const i = new NodeInterface("File", "");
          setType(i, fileType);
          return i;
        },
        filename: () => new TextInputInterface("Filename", "output.jpg").setPort(false)
      },
      outputs: {
        path: () => {
          const i = new NodeInterface("Saved Path", "");
          setType(i, textType);
          return i;
        }
      }
    });
    DownloadNode = defineNode({
      type: "core/download",
      title: "Download",
      inputs: {
        file: () => {
          const i = new NodeInterface("File", "");
          setType(i, fileType);
          return i;
        },
        filename: () => new TextInputInterface("Filename", "download.jpg").setPort(false)
      },
      outputs: {}
    });
    ConfirmNode = defineNode({
      type: "core/confirm",
      title: "Confirm Dialog",
      inputs: {
        in: () => new NodeInterface("In", null),
        message: () => new TextInputInterface("Message", "Continue?").setPort(false)
      },
      outputs: {
        yes: () => new NodeInterface("Yes", null),
        no: () => new NodeInterface("No", null)
      }
    });
    SelectNode = defineNode({
      type: "core/select",
      title: "Select Dialog",
      inputs: {
        title: () => new TextInputInterface("Dialog Title", "Select an item").setPort(false),
        options: () => new TextInputInterface("Options (JSON)", '["a","b"]').setPort(false)
      },
      outputs: {
        value: () => {
          const i = new NodeInterface("Selected", null);
          setType(i, jsonType);
          return i;
        }
      }
    });
    IfNode = defineNode({
      type: "core/if",
      title: "If / Else",
      inputs: {
        value: () => new NodeInterface("Value", null),
        condition: () => new TextInputInterface("Condition (JS)", "value === true").setPort(false)
      },
      outputs: {
        true: () => new NodeInterface("True", null),
        false: () => new NodeInterface("False", null)
      }
    });
    MergeNode = defineNode({
      type: "core/merge",
      title: "Merge",
      inputs: {
        a: () => new NodeInterface("A", null),
        b: () => new NodeInterface("B", null)
      },
      outputs: {
        out: () => new NodeInterface("Out", null)
      }
    });
    TextNode = defineNode({
      type: "core/text",
      title: "Text",
      inputs: {
        value: () => new TextInputInterface("Value", "").setPort(false)
      },
      outputs: {
        text: () => {
          const i = new NodeInterface("Text", "");
          setType(i, textType);
          return i;
        }
      }
    });
    NumberNode = defineNode({
      type: "core/number",
      title: "Number",
      inputs: {
        value: () => new NumberInterface("Value", 0).setPort(false)
      },
      outputs: {
        num: () => {
          const i = new NodeInterface("Number", 0);
          setType(i, numberType);
          return i;
        }
      }
    });
    BUILTIN_NODE_REGISTRATIONS = [
      {
        NodeClass: TriggerNode,
        title: "Trigger",
        category: "Core",
        ports: [{ name: "Start", type: "boolean", isOutput: true }]
      },
      {
        NodeClass: ImageInputNode,
        title: "Image Input",
        category: "Core",
        ports: [{ name: "Image", type: "image", isOutput: true }]
      },
      {
        NodeClass: ImageOutputNode,
        title: "Image Output",
        category: "Core",
        ports: [{ name: "Image", type: "image", isOutput: false }]
      },
      {
        NodeClass: SaveNode,
        title: "Save",
        category: "Core",
        ports: [
          { name: "File", type: "file", isOutput: false },
          { name: "Saved Path", type: "text", isOutput: true }
        ]
      },
      {
        NodeClass: DownloadNode,
        title: "Download",
        category: "Core",
        ports: [{ name: "File", type: "file", isOutput: false }]
      },
      {
        NodeClass: ConfirmNode,
        title: "Confirm Dialog",
        category: "Core",
        ports: [
          { name: "In", isOutput: false },
          { name: "Yes", isOutput: true },
          { name: "No", isOutput: true }
        ]
      },
      {
        NodeClass: SelectNode,
        title: "Select Dialog",
        category: "Core",
        ports: [{ name: "Selected", type: "json", isOutput: true }]
      },
      {
        NodeClass: IfNode,
        title: "If / Else",
        category: "Core",
        ports: [
          { name: "Value", isOutput: false },
          { name: "True", isOutput: true },
          { name: "False", isOutput: true }
        ]
      },
      {
        NodeClass: MergeNode,
        title: "Merge",
        category: "Core",
        ports: [
          { name: "A", isOutput: false },
          { name: "B", isOutput: false },
          { name: "Out", isOutput: true }
        ]
      },
      {
        NodeClass: TextNode,
        title: "Text",
        category: "Core",
        ports: [{ name: "Text", type: "text", isOutput: true }]
      },
      {
        NodeClass: NumberNode,
        title: "Number",
        category: "Core",
        ports: [{ name: "Number", type: "number", isOutput: true }]
      }
    ];
    _pluginRegistrations = [];
  }
});

// client/src/workflow/index.ts
async function initWorkflow() {
  if (canvas) return;
  await loadPluginWorkflowNodes();
  const wrap = document.getElementById("wf-canvas-wrap");
  canvas = new WorkflowCanvas(wrap, getAllNodeRegistrations());
  await loadWorkflowList();
  document.getElementById("wf-new").addEventListener("click", newWorkflow);
  document.getElementById("wf-save").addEventListener("click", saveActive);
  document.getElementById("wf-rename").addEventListener("click", renameActive);
  document.getElementById("wf-delete-wf").addEventListener("click", deleteActive);
  document.getElementById("wf-select").addEventListener("change", (e) => {
    openWorkflow(e.target.value);
  });
  document.getElementById("wf-tab-graph").addEventListener("click", () => switchTab("graph"));
  document.getElementById("wf-tab-gallery").addEventListener("click", () => switchTab("gallery"));
}
async function loadPluginWorkflowNodes() {
  for (const plugin of state.plugins) {
    if (!plugin.hasWorkflowNodes) continue;
    try {
      const url = `/client/plugins/${plugin.folder}/workflow-nodes.js`;
      const mod = await import(
        /* @vite-ignore */
        url
      );
      if (Array.isArray(mod.default) && mod.default.length) {
        registerPluginNodes(mod.default.map(createNodeFromDefinition));
      }
    } catch {
    }
  }
}
function switchTab(tab) {
  const isGraph = tab === "graph";
  document.getElementById("wf-canvas-wrap").style.display = isGraph ? "" : "none";
  document.getElementById("wf-gallery-view").style.display = !isGraph ? "" : "none";
  document.getElementById("wf-tab-graph").classList.toggle("active", isGraph);
  document.getElementById("wf-tab-gallery").classList.toggle("active", !isGraph);
  if (!isGraph) loadGallery();
}
async function loadGallery() {
  const el = document.getElementById("wf-gallery-view");
  const wf = workflows.find((w) => w.id === activeId);
  if (!wf?.runs?.length) {
    el.innerHTML = '<p class="wf-empty-msg">No runs recorded for this workflow yet.</p>';
    return;
  }
  el.innerHTML = '<div class="wf-loading">Loading\u2026</div>';
  const allIds = [...new Set(wf.runs.flat())];
  const jobMap = /* @__PURE__ */ new Map();
  await Promise.all(allIds.map(async (id) => {
    try {
      const j = await fetch(`/api/jobs/${id}`).then((r) => r.ok ? r.json() : null);
      if (j) jobMap.set(id, j);
    } catch {
    }
  }));
  el.innerHTML = "";
  wf.runs.forEach((run, idx) => {
    const section = document.createElement("div");
    section.className = "wf-gallery-run";
    const hdr = document.createElement("div");
    hdr.className = "wf-gallery-run-hdr";
    hdr.textContent = `Run ${idx + 1}`;
    section.appendChild(hdr);
    const grid = document.createElement("div");
    grid.className = "wf-gallery-grid";
    for (const jobId of run) {
      const job = jobMap.get(jobId);
      if (!job) continue;
      const folder = String(job.imageSettings ?? "unknown");
      const raws = Array.isArray(job.rawImage) ? job.rawImage : [];
      const outputs = Array.isArray(job.outputs) ? job.outputs : [];
      for (const url of raws) grid.appendChild(buildCard(url, "Input"));
      for (const id of outputs) grid.appendChild(buildCard(`/api/images/${folder}/${id}`, "Output"));
    }
    section.appendChild(grid);
    el.appendChild(section);
  });
}
function buildCard(url, label) {
  const card = document.createElement("div");
  card.className = "wf-gallery-card";
  const img = document.createElement("img");
  img.src = url;
  img.alt = label;
  img.loading = "lazy";
  img.onerror = () => {
    card.style.display = "none";
  };
  const lbl = document.createElement("div");
  lbl.className = "wf-gallery-card-label";
  lbl.textContent = label;
  card.append(img, lbl);
  return card;
}
async function loadWorkflowList() {
  try {
    workflows = await fetch("/api/workflows").then((r) => r.json());
  } catch {
    workflows = [];
  }
  rebuildSelect();
  if (workflows.length > 0 && !activeId) await openWorkflow(workflows[0].id);
}
function rebuildSelect() {
  const sel = document.getElementById("wf-select");
  sel.innerHTML = '<option value="">\u2014 select workflow \u2014</option>';
  for (const wf of workflows) {
    const opt = document.createElement("option");
    opt.value = wf.id;
    opt.textContent = wf.name;
    if (wf.id === activeId) opt.selected = true;
    sel.appendChild(opt);
  }
  setStatus("");
}
async function openWorkflow(id) {
  if (!id) return;
  try {
    const wf = await fetch(`/api/workflows/${id}`).then((r) => r.json());
    canvas.load(wf.graph ?? null);
    activeId = id;
    document.getElementById("wf-select").value = id;
    setDirty(false);
  } catch {
    setStatus("Failed to load workflow.");
  }
}
async function newWorkflow() {
  const name = prompt("Workflow name:", "New Workflow");
  if (!name) return;
  try {
    const wf = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    }).then((r) => r.json());
    workflows.push(wf);
    activeId = wf.id;
    canvas.clear();
    rebuildSelect();
    setDirty(false);
  } catch {
    setStatus("Failed to create workflow.");
  }
}
async function saveActive() {
  if (!activeId || !canvas) return;
  try {
    const wf = workflows.find((w) => w.id === activeId);
    const graph = canvas.save();
    await fetch(`/api/workflows/${activeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph, runs: wf?.runs ?? [] })
    });
    if (wf) wf.graph = graph;
    setDirty(false);
    setStatus("Saved \u2713");
    setTimeout(() => setStatus(""), 2e3);
  } catch {
    setStatus("Save failed.");
  }
}
async function renameActive() {
  if (!activeId) return;
  const wf = workflows.find((w) => w.id === activeId);
  const name = prompt("New name:", wf?.name ?? "");
  if (!name || name === wf?.name) return;
  try {
    await fetch(`/api/workflows/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (wf) wf.name = name;
    rebuildSelect();
  } catch {
    setStatus("Rename failed.");
  }
}
async function deleteActive() {
  if (!activeId) return;
  const wf = workflows.find((w) => w.id === activeId);
  if (!confirm(`Delete workflow "${wf?.name}"?`)) return;
  try {
    await fetch(`/api/workflows/${activeId}`, { method: "DELETE" });
    workflows = workflows.filter((w) => w.id !== activeId);
    activeId = null;
    canvas.clear();
    rebuildSelect();
    if (workflows.length > 0) await openWorkflow(workflows[0].id);
  } catch {
    setStatus("Delete failed.");
  }
}
function setDirty(val) {
  dirty = val;
  void dirty;
  setStatus(val ? "\u25CF unsaved" : "");
}
function setStatus(msg) {
  const el = document.getElementById("wf-status");
  if (el) el.textContent = msg;
}
var canvas, workflows, activeId, dirty;
var init_workflow = __esm({
  "client/src/workflow/index.ts"() {
    init_canvas();
    init_nodes();
    init_state();
    canvas = null;
    workflows = [];
    activeId = null;
    dirty = false;
  }
});

// client/src/main.ts
var main_exports = {};
__export(main_exports, {
  activateTab: () => activateTab
});
async function activateTab(folder) {
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
  const plugin = state.plugins.find((p2) => p2.folder === folder);
  if (!plugin || !plugin.enabled) return;
  if (!state.jobs[plugin.folder]?.length) {
    try {
      const allJobs = await fetch("/api/jobs").then((r) => r.json());
      const jobs = allJobs.filter((j) => j.imageSettings === folder);
      state.jobs[plugin.folder] = jobs.map((j) => ({
        id: j.id,
        label: (j.rawImage?.[0] ?? j.id).split("/").pop().slice(0, 12),
        dirty: false
      }));
    } catch {
    }
  }
  showPluginArea(plugin);
}
function setupListeners() {
  document.getElementById("btn-refresh")?.addEventListener("click", () => {
    const p2 = state.plugins.find((q) => q.folder === state.activePlugin);
    if (p2) loadSidebar(p2);
  });
  document.getElementById("tab-plugins")?.addEventListener("click", () => activateTab(PLUGINS_TAB));
  btnSettings.addEventListener("click", () => {
    if (state.activePlugin && state.activePlugin !== GALLERY_TAB && state.activePlugin !== PLUGINS_TAB && state.activePlugin !== WORKFLOW_TAB) {
      openSettingsModal(state.activePlugin);
    }
  });
  document.getElementById("btn-modal-close")?.addEventListener("click", () => settingsModal.classList.add("hidden"));
  document.getElementById("btn-cancel-global")?.addEventListener("click", () => settingsModal.classList.add("hidden"));
  document.getElementById("btn-save-global")?.addEventListener("click", saveSettings);
  settingsModal.querySelector(".modal-backdrop")?.addEventListener("click", () => settingsModal.classList.add("hidden"));
  document.getElementById("rg-select-all")?.addEventListener("click", () => {
    document.querySelectorAll("#rg-content .rg-checkbox").forEach((cb) => {
      if (!cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event("change"));
      }
    });
  });
  document.getElementById("rg-deselect")?.addEventListener("click", () => {
    document.querySelectorAll("#rg-content .rg-checkbox").forEach((cb) => {
      if (cb.checked) {
        cb.checked = false;
        cb.dispatchEvent(new Event("change"));
      }
    });
  });
  document.getElementById("rg-delete")?.addEventListener("click", deleteRgSelected);
  document.getElementById("rg-export")?.addEventListener("click", exportRgSelected);
  document.getElementById("rg-refresh")?.addEventListener("click", loadRootGallery);
  iframeOverlay.addEventListener("dragenter", (e) => {
    if (!state.draggedItem) return;
    e.preventDefault();
    iframeOverlay.classList.add("drag-over");
  });
  iframeOverlay.addEventListener("dragover", (e) => {
    if (!state.draggedItem) return;
    e.preventDefault();
  });
  iframeOverlay.addEventListener("dragleave", () => {
    iframeOverlay.classList.remove("drag-over");
  });
  iframeOverlay.addEventListener("drop", (e) => {
    e.preventDefault();
    iframeOverlay.classList.remove("drag-over");
    if (!state.draggedItem) return;
    const item = { ...state.draggedItem };
    state.draggedItem = null;
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;
    const activeJobId = state.activeJobId[folder];
    if (activeJobId) {
      if (item.sourceFolder === folder) {
        if (state.iframeReady) sendToIframe({ type: "add-generated-item", uuid: item.uuid });
      } else {
        addItemToExistingJob(folder, activeJobId, item);
      }
    } else {
      createJobWithItem(item);
    }
  });
  document.getElementById("btn-new-job")?.addEventListener("click", async () => {
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;
    const plugin = state.plugins.find((p2) => p2.folder === folder);
    if (!plugin) return;
    if (state.iframeReady) {
      sendToIframe({ type: "request-save" });
      await waitForSave();
    }
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageSettings: folder, rawImage: [], settings: {} })
      });
      if (!res.ok) return;
      const { uuid: jobId } = await res.json();
      const job = { id: jobId, label: "New", dirty: false };
      state.jobs[folder]?.push(job);
      state.activeJobId[folder] = jobId;
      Promise.resolve().then(() => (init_plugin_area(), plugin_area_exports)).then((m) => {
        m.showJobTabBar();
      });
      emptyState.style.display = "none";
      renderJobTabs(folder);
      if (toolFrame.dataset.pluginFolder !== folder) {
        state.iframeReady = false;
        toolFrame.src = plugin.indexUrl;
        toolFrame.dataset.pluginFolder = folder;
      } else if (state.iframeReady) {
        sendToIframe({ type: "load-job", jobId });
      }
    } catch {
    }
  });
  document.addEventListener("click", hideCtxMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideCtxMenu();
      settingsModal.classList.add("hidden");
    }
  });
}
var init_main = __esm({
  "client/src/main.ts"() {
    init_state();
    init_tabs();
    init_plugin_area();
    init_gallery();
    init_ctx_menu();
    init_settings();
    init_jobs();
    init_iframe();
    init_sidebar();
    init_workflow();
    init_dom();
    (async () => {
      const data = await fetch("/api/plugins").then((r) => r.json());
      state.plugins = data;
      for (const p2 of state.plugins) {
        state.jobs[p2.folder] = [];
        state.activeJobId[p2.folder] = null;
      }
      renderTabs();
      registerActivateTab(activateTab);
      setupIframeMessageHandler(loadRootGallery, createJobWithItem, loadSidebar);
      setupListeners();
      const first = state.plugins.find((p2) => p2.enabled);
      await activateTab(first?.folder ?? GALLERY_TAB);
    })();
  }
});
init_main();
export {
  activateTab
};
/*! Bundled license information:

@vue/shared/dist/shared.esm-bundler.js:
  (**
  * @vue/shared v3.5.38
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

@vue/reactivity/dist/reactivity.esm-bundler.js:
  (**
  * @vue/reactivity v3.5.38
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

@vue/runtime-core/dist/runtime-core.esm-bundler.js:
  (**
  * @vue/runtime-core v3.5.38
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

@vue/runtime-dom/dist/runtime-dom.esm-bundler.js:
  (**
  * @vue/runtime-dom v3.5.38
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)

vue/dist/vue.runtime.esm-bundler.js:
  (**
  * vue v3.5.38
  * (c) 2018-present Yuxi (Evan) You and Vue contributors
  * @license MIT
  **)
*/
//# sourceMappingURL=app.js.map
