// client/src/ui/delete-modal.ts
var MODAL_CSS = `
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
var _cssInjected = false;
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
  return new Promise((resolve) => {
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
    const tabsEl = mk("div", "dm-tabs");
    const tabItems = mkTab("Items", "items", true);
    const tabImages = mkTab("Images", "images", false);
    tabsEl.append(tabItems, tabImages);
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
    modal.append(header, tabsEl, body, footer);
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
        tabsEl.querySelectorAll(".dm-tab").forEach((t) => t.classList.toggle("active", t === tab));
        body.querySelectorAll(".dm-panel").forEach(
          (p) => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab)
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
      resolve([]);
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
      resolve(toDelete.map((i) => i.id));
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
export {
  showDeleteModal
};
//# sourceMappingURL=delete-modal.js.map
