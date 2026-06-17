const MODAL_CSS = `
.dm-backdrop {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.dm-modal {
  background: var(--surface, #25252b);
  border: 1px solid var(--border, #3a3a45);
  border-radius: var(--radius, 8px);
  width: 520px; max-width: 100%;
  max-height: 80vh;
  display: flex; flex-direction: column;
  box-shadow: 0 8px 48px rgba(0,0,0,.7);
}
.dm-header {
  display: flex; align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border, #3a3a45);
  flex-shrink: 0;
}
.dm-title {
  flex: 1; font-size: 15px; font-weight: 600;
  color: var(--text, #e4e4f0);
}
.dm-close {
  background: none; border: none;
  color: var(--text-dim, #888899);
  cursor: pointer; font-size: 18px;
  padding: 0 2px; line-height: 1;
}
.dm-close:hover { color: var(--text, #e4e4f0); }
.dm-tabs {
  display: flex;
  border-bottom: 1px solid var(--border, #3a3a45);
  flex-shrink: 0;
}
.dm-tab {
  padding: 8px 16px;
  border: none; background: transparent;
  color: var(--text-dim, #888899);
  cursor: pointer; font-size: 13px;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .15s, border-color .15s;
}
.dm-tab.active { color: var(--text, #e4e4f0); border-bottom-color: var(--accent, #6c63ff); }
.dm-tab:hover:not(.active) { color: var(--text, #e4e4f0); }
.dm-body { flex: 1; overflow-y: auto; min-height: 0; }
.dm-panel { display: none; padding: 4px 12px 8px; }
.dm-panel.active { display: block; }
.dm-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 9px 4px;
  border-bottom: 1px solid var(--border, #3a3a45);
}
.dm-row:last-child { border-bottom: none; }
.dm-row-cb {
  margin-top: 3px; flex-shrink: 0;
  accent-color: var(--accent, #6c63ff);
  cursor: pointer; width: 15px; height: 15px;
}
.dm-row-info { flex: 1; min-width: 0; }
.dm-row-type {
  font-size: 10px; color: var(--text-dim, #888899);
  text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px;
}
.dm-row-label {
  font-size: 13px; color: var(--text, #e4e4f0);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dm-row-meta { font-size: 11px; color: var(--text-dim, #888899); margin-top: 2px; }
.dm-img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px; padding: 4px;
}
.dm-img-empty {
  padding: 32px; text-align: center;
  color: var(--text-dim, #888899); font-size: 13px;
}
.dm-img-card {
  position: relative;
  border: 2px solid transparent;
  border-radius: var(--radius, 8px);
  overflow: hidden; cursor: pointer;
  background: var(--surface2, #2e2e36);
  transition: border-color .12s;
}
.dm-img-card.checked { border-color: var(--accent, #6c63ff); }
.dm-img-card img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.dm-img-cb {
  position: absolute; top: 5px; left: 5px;
  accent-color: var(--accent, #6c63ff); cursor: pointer;
  width: 15px; height: 15px;
}
.dm-img-label {
  padding: 3px 6px; font-size: 10px;
  color: var(--text-dim, #888899);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dm-img-placeholder {
  width: 100%; aspect-ratio: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  color: var(--text-dim, #888899);
}
.dm-img-placeholder-icon { font-size: 28px; line-height: 1; }
.dm-img-placeholder-type { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
.dm-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border, #3a3a45);
  flex-shrink: 0;
}
.dm-spacer { flex: 1; }
.dm-btn {
  padding: 6px 13px;
  border: 1px solid var(--border, #3a3a45);
  border-radius: 6px; background: transparent;
  color: var(--text, #e4e4f0); cursor: pointer; font-size: 13px;
  transition: background .12s;
}
.dm-btn:hover { background: var(--surface2, #2e2e36); }
.dm-btn:disabled { opacity: .45; cursor: not-allowed; }
.dm-btn-danger { color: var(--danger, #e05c5c); border-color: var(--danger, #e05c5c); }
.dm-btn-danger:hover { background: rgba(224,92,92,.12); }
`;

let _cssInjected = false;
function _injectCss() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.textContent = MODAL_CSS;
  document.head.appendChild(s);
}

/**
 * Show a delete-confirmation modal with two tabs (Items checklist + Images grid).
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {Array<{
 *   id: string,
 *   type: string,
 *   label: string,
 *   imageUrl?: string,
 *   meta?: string,
 *   checked?: boolean,
 *   onDelete: () => Promise<void>
 * }>} opts.items
 *
 * @returns {Promise<string[]>} IDs of items whose onDelete() was called; [] if cancelled
 */
export async function showDeleteModal({ title = 'Delete', items = [] }) {
  _injectCss();

  return new Promise(resolve => {
    const checkedMap = new Map(items.map(i => [i.id, i.checked !== false]));
    const imgCardMap = new Map(); // id → { card, cb }

    // ── Build DOM ──────────────────────────────────────────────
    const backdrop = document.createElement('div');
    backdrop.className = 'dm-backdrop';

    const modal = document.createElement('div');
    modal.className = 'dm-modal';

    // Header
    const header  = document.createElement('div');
    header.className = 'dm-header';
    const titleEl = document.createElement('div');
    titleEl.className   = 'dm-title';
    titleEl.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.className   = 'dm-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Cancel';
    header.append(titleEl, closeBtn);

    // Tabs
    const tabsEl    = document.createElement('div');
    tabsEl.className = 'dm-tabs';
    const tabItems  = _mkTab('Items',  'items',  true);
    const tabImages = _mkTab('Images', 'images', false);
    tabsEl.append(tabItems, tabImages);

    // Body
    const body       = document.createElement('div');
    body.className   = 'dm-body';
    const panelItems = document.createElement('div');
    panelItems.className    = 'dm-panel active';
    panelItems.dataset.panel = 'items';
    const panelImages = document.createElement('div');
    panelImages.className    = 'dm-panel';
    panelImages.dataset.panel = 'images';
    body.append(panelItems, panelImages);

    // Footer
    const footer     = document.createElement('div');
    footer.className = 'dm-footer';
    const selAllBtn   = _mkBtn('Select All');
    const deselAllBtn = _mkBtn('Deselect All');
    const spacer      = document.createElement('div');
    spacer.className  = 'dm-spacer';
    const cancelBtn   = _mkBtn('Cancel');
    const confirmBtn  = _mkBtn('Delete Selected', 'dm-btn-danger');
    footer.append(selAllBtn, deselAllBtn, spacer, cancelBtn, confirmBtn);

    modal.append(header, tabsEl, body, footer);
    backdrop.appendChild(modal);

    // ── Sync helpers between tabs ──────────────────────────────
    function syncToImgTab(id, val) {
      const entry = imgCardMap.get(id);
      if (!entry) return;
      entry.cb.checked = val;
      entry.card.classList.toggle('checked', val);
    }

    function syncToItemsTab(id, val) {
      const row = panelItems.querySelector(`.dm-row[data-id="${CSS.escape(id)}"]`);
      if (!row) return;
      const cb = row.querySelector('.dm-row-cb');
      if (cb) cb.checked = val;
    }

    // ── Items panel ────────────────────────────────────────────
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'dm-row';
      row.dataset.id = item.id;

      const cb = document.createElement('input');
      cb.type      = 'checkbox';
      cb.className = 'dm-row-cb';
      cb.checked   = checkedMap.get(item.id);
      cb.addEventListener('change', () => {
        checkedMap.set(item.id, cb.checked);
        syncToImgTab(item.id, cb.checked);
      });

      const info = document.createElement('div');
      info.className = 'dm-row-info';

      const typeEl = document.createElement('div');
      typeEl.className   = 'dm-row-type';
      typeEl.textContent = item.type;

      const labelEl = document.createElement('div');
      labelEl.className   = 'dm-row-label';
      labelEl.textContent = item.label;
      labelEl.title       = item.label;

      info.append(typeEl, labelEl);

      if (item.meta) {
        const metaEl = document.createElement('div');
        metaEl.className   = 'dm-row-meta';
        metaEl.textContent = item.meta;
        info.appendChild(metaEl);
      }

      row.append(cb, info);
      panelItems.appendChild(row);
    }

    // ── Images panel — shows ALL items; placeholder for those without a URL ──
    if (!items.length) {
      panelImages.innerHTML = '<div class="dm-img-empty">No items.</div>';
    } else {
      const grid = document.createElement('div');
      grid.className = 'dm-img-grid';

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'dm-img-card' + (checkedMap.get(item.id) ? ' checked' : '');

        const cb = document.createElement('input');
        cb.type      = 'checkbox';
        cb.className = 'dm-img-cb';
        cb.checked   = checkedMap.get(item.id);
        cb.addEventListener('change', e => {
          e.stopPropagation();
          checkedMap.set(item.id, cb.checked);
          card.classList.toggle('checked', cb.checked);
          syncToItemsTab(item.id, cb.checked);
        });

        if (item.imageUrl) {
          const img = document.createElement('img');
          img.src     = item.imageUrl;
          img.alt     = item.label;
          img.loading = 'lazy';
          img.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });
          card.appendChild(img);
        } else {
          const ph = document.createElement('div');
          ph.className = 'dm-img-placeholder';
          ph.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });
          const icon = document.createElement('div');
          icon.className   = 'dm-img-placeholder-icon';
          icon.textContent = '📄';
          const typeLabel = document.createElement('div');
          typeLabel.className   = 'dm-img-placeholder-type';
          typeLabel.textContent = item.type;
          ph.append(icon, typeLabel);
          card.appendChild(ph);
        }

        const lbl = document.createElement('div');
        lbl.className   = 'dm-img-label';
        lbl.textContent = item.label;

        card.append(cb, lbl);
        grid.appendChild(card);
        imgCardMap.set(item.id, { card, cb });
      }
      panelImages.appendChild(grid);
    }

    // ── Tab switching ──────────────────────────────────────────
    [tabItems, tabImages].forEach(tab => {
      tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('.dm-tab').forEach(t => t.classList.toggle('active', t === tab));
        body.querySelectorAll('.dm-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
      });
    });

    // ── Select / Deselect All ──────────────────────────────────
    selAllBtn.addEventListener('click', () => {
      items.forEach(i => {
        checkedMap.set(i.id, true);
        syncToImgTab(i.id, true);
      });
      panelItems.querySelectorAll('.dm-row-cb').forEach(cb => { cb.checked = true; });
    });
    deselAllBtn.addEventListener('click', () => {
      items.forEach(i => {
        checkedMap.set(i.id, false);
        syncToImgTab(i.id, false);
      });
      panelItems.querySelectorAll('.dm-row-cb').forEach(cb => { cb.checked = false; });
    });

    // ── Cancel ─────────────────────────────────────────────────
    function doCancel() {
      backdrop.remove();
      document.removeEventListener('keydown', onEsc);
      resolve([]);
    }
    function onEsc(e) { if (e.key === 'Escape') doCancel(); }

    closeBtn.addEventListener('click', doCancel);
    cancelBtn.addEventListener('click', doCancel);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) doCancel(); });
    document.addEventListener('keydown', onEsc);

    // ── Confirm + run deletions ────────────────────────────────
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.textContent = 'Deleting…';
      confirmBtn.disabled    = true;
      cancelBtn.disabled     = true;
      closeBtn.disabled      = true;

      const toDelete = items.filter(i => checkedMap.get(i.id));
      for (const item of toDelete) {
        try { await item.onDelete(); } catch {}
      }

      backdrop.remove();
      document.removeEventListener('keydown', onEsc);
      resolve(toDelete.map(i => i.id));
    });

    document.body.appendChild(backdrop);
  });
}

function _mkTab(label, key, active) {
  const btn = document.createElement('button');
  btn.className   = 'dm-tab' + (active ? ' active' : '');
  btn.textContent = label;
  btn.dataset.tab = key;
  return btn;
}

function _mkBtn(label, extraClass = '') {
  const btn = document.createElement('button');
  btn.className   = 'dm-btn' + (extraClass ? ' ' + extraClass : '');
  btn.textContent = label;
  return btn;
}
