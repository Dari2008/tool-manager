import type { DeletePlanItem } from '../types.ts';

interface GalleryItem {
  uuid:      string;
  url:       string;
  filename?: string;
  thumbnail?: string;
}

interface GalleryOptions {
  onItemActivate?: (item: GalleryItem) => void;
  onDelete?:       (items: GalleryItem[]) => Promise<string[]>;
}

export class Gallery {
  private container: HTMLElement;
  private folder:    string;
  private items:     GalleryItem[] = [];
  private selected:  Set<string>   = new Set();
  private onItemActivate: ((item: GalleryItem) => void) | null;
  private onDelete:       ((items: GalleryItem[]) => Promise<string[]>) | null;
  private ctxMenuEl: HTMLElement;

  constructor(containerEl: HTMLElement, folder: string, opts: GalleryOptions = {}) {
    this.container        = containerEl;
    this.folder           = folder;
    this.onItemActivate   = opts.onItemActivate ?? null;
    this.onDelete         = opts.onDelete ?? null;
    this.ctxMenuEl        = document.createElement('div');
    this.ctxMenuEl.className = 'g-ctx-menu';
    this.ctxMenuEl.style.display = 'none';
    document.body.appendChild(this.ctxMenuEl);
    document.addEventListener('click',       () => this.hideCtxMenu());
    document.addEventListener('contextmenu', () => this.hideCtxMenu());
    this.buildUI();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="gallery-toolbar">
        <div class="gallery-toolbar-left">
          <button class="g-btn" id="g-select-all">Select All</button>
          <button class="g-btn" id="g-deselect">Deselect All</button>
          <span class="g-count" id="g-count">0 selected</span>
        </div>
        <div class="gallery-toolbar-right">
          <button class="g-btn g-btn-delete" id="g-delete" disabled>Delete Selected</button>
          <button class="g-btn g-btn-export" id="g-export" disabled>Export Selected</button>
          <button class="g-btn" id="g-refresh">↻</button>
        </div>
      </div>
      <div class="gallery-grid" id="g-grid">
        <div class="g-loading">Loading…</div>
      </div>
    `;
    this.container.querySelector('#g-select-all')!.addEventListener('click',  () => this.selectAll());
    this.container.querySelector('#g-deselect')!.addEventListener('click',    () => this.deselectAll());
    this.container.querySelector('#g-delete')!.addEventListener('click',     () => this.deleteSelected());
    this.container.querySelector('#g-export')!.addEventListener('click',     () => this.exportSelected());
    this.container.querySelector('#g-refresh')!.addEventListener('click',    () => this.refresh());
  }

  private showCtxMenu(x: number, y: number, item: GalleryItem): void {
    this.ctxMenuEl.innerHTML = '';
    const delItem         = document.createElement('div');
    delItem.className     = 'g-ctx-item g-ctx-danger';
    delItem.textContent   = 'Delete';
    delItem.addEventListener('click', async e => {
      e.stopPropagation(); this.hideCtxMenu();
      const deleted = await this.doDelete([item]);
      if (deleted.length) this.applyDeletion(deleted);
    });
    this.ctxMenuEl.appendChild(delItem);
    this.ctxMenuEl.style.display = 'block';
    const mw = this.ctxMenuEl.offsetWidth, mh = this.ctxMenuEl.offsetHeight;
    this.ctxMenuEl.style.left = `${Math.min(x, window.innerWidth  - mw - 8)}px`;
    this.ctxMenuEl.style.top  = `${Math.min(y, window.innerHeight - mh - 8)}px`;
  }

  private hideCtxMenu(): void { this.ctxMenuEl.style.display = 'none'; }

  private async doDelete(items: GalleryItem[]): Promise<string[]> {
    if (this.onDelete) return (await this.onDelete(items)) ?? [];
    const { showDeleteModal } = await import('./delete-modal.ts');
    const folder = this.folder;
    const modalItems: DeletePlanItem[] = items.map(i => ({
      id: i.uuid, type: 'Image',
      label:    i.filename ?? i.uuid.slice(0, 8),
      imageUrl: i.thumbnail ?? i.url,
      checked:  true,
      onDelete: () => fetch(`/api/images/${folder}/${i.uuid}`, { method: 'DELETE' }).then(() => {}),
    }));
    return showDeleteModal({
      title: items.length === 1 ? 'Delete Image' : `Delete ${items.length} Images`,
      items: modalItems,
    });
  }

  private applyDeletion(uuids: string[]): void {
    const s     = new Set(uuids);
    this.items   = this.items.filter(i => !s.has(i.uuid));
    this.selected = new Set([...this.selected].filter(u => !s.has(u)));
    this.renderItems();
    this.updateCount();
    window.parent.postMessage({ type: 'gallery-changed' }, '*');
  }

  async refresh(): Promise<void> {
    const grid = this.container.querySelector<HTMLElement>('#g-grid')!;
    grid.innerHTML = '<div class="g-loading">Loading…</div>';
    this.selected.clear();
    this.updateCount();
    try {
      const res  = await fetch(`/api/gallery/get?folder=${encodeURIComponent(this.folder)}`);
      this.items = await res.json();
      this.renderItems();
    } catch {
      grid.innerHTML = '<div class="g-empty">Failed to load gallery.</div>';
    }
  }

  private renderItems(): void {
    const grid = this.container.querySelector<HTMLElement>('#g-grid')!;
    if (!this.items.length) {
      grid.innerHTML = '<div class="g-empty">No generated images yet.</div>';
      return;
    }
    grid.innerHTML = '';
    for (const item of this.items) {
      const card         = document.createElement('div');
      card.className     = 'g-card';
      card.dataset.uuid  = item.uuid;

      const cb           = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'g-checkbox';
      cb.addEventListener('change', () => {
        if (cb.checked) this.selected.add(item.uuid);
        else            this.selected.delete(item.uuid);
        card.classList.toggle('selected', cb.checked);
        this.updateCount();
      });

      const img          = document.createElement('img');
      img.src            = item.thumbnail ?? item.url;
      img.alt            = item.filename ?? item.uuid;
      img.loading        = 'lazy';
      img.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });

      const lbl          = document.createElement('div');
      lbl.className      = 'g-label';
      lbl.textContent    = item.filename ?? item.uuid.slice(0, 8);

      card.append(cb, img, lbl);
      card.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        this.showCtxMenu((e as MouseEvent).clientX, (e as MouseEvent).clientY, item);
      });

      if (this.onItemActivate) {
        card.draggable = true;
        card.addEventListener('dragstart', e => {
          (e as DragEvent).dataTransfer!.setData('text/x-gallery-uuid', item.uuid);
          (e as DragEvent).dataTransfer!.effectAllowed = 'copy';
          e.stopPropagation();
        });
        const useBtn         = document.createElement('button');
        useBtn.className     = 'g-use-btn';
        useBtn.textContent   = '↑ Use';
        useBtn.title         = 'Load settings into tool';
        useBtn.addEventListener('click', e => { e.stopPropagation(); this.onItemActivate!(item); });
        card.appendChild(useBtn);
      }
      grid.appendChild(card);
    }
  }

  private selectAll(): void {
    this.items.forEach(i => this.selected.add(i.uuid));
    this.container.querySelectorAll<HTMLInputElement>('.g-checkbox').forEach(cb => {
      cb.checked = true; cb.closest('.g-card')?.classList.add('selected');
    });
    this.updateCount();
  }

  private deselectAll(): void {
    this.selected.clear();
    this.container.querySelectorAll<HTMLInputElement>('.g-checkbox').forEach(cb => {
      cb.checked = false; cb.closest('.g-card')?.classList.remove('selected');
    });
    this.updateCount();
  }

  private updateCount(): void {
    const n = this.selected.size;
    const countEl   = this.container.querySelector<HTMLElement>('#g-count');
    const deleteBtn = this.container.querySelector<HTMLButtonElement>('#g-delete');
    const exportBtn = this.container.querySelector<HTMLButtonElement>('#g-export');
    if (countEl)   countEl.textContent = `${n} selected`;
    if (deleteBtn) deleteBtn.disabled  = n === 0;
    if (exportBtn) exportBtn.disabled  = n === 0;
  }

  private async deleteSelected(): Promise<void> {
    if (!this.selected.size) return;
    const btn = this.container.querySelector<HTMLButtonElement>('#g-delete');
    if (btn) { btn.textContent = 'Deleting…'; btn.disabled = true; }
    const items   = this.items.filter(i => this.selected.has(i.uuid));
    const deleted = await this.doDelete(items);
    if (deleted.length) this.applyDeletion(deleted);
    if (btn) btn.textContent = 'Delete Selected';
    this.updateCount();
  }

  private async exportSelected(): Promise<void> {
    if (!this.selected.size) return;
    const selected  = this.items.filter(i => this.selected.has(i.uuid));
    const exportBtn = this.container.querySelector<HTMLButtonElement>('#g-export')!;
    exportBtn.textContent = 'Preparing…'; exportBtn.disabled = true;
    try {
      const { default: JSZip } = await import(
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' as string
      );
      const zip = new JSZip();
      await Promise.all(selected.map(async item => {
        const res = await fetch(item.url);
        if (!res.ok) return;
        zip.file(item.filename ?? `${item.uuid}.jpg`, await res.blob());
      }));
      const blob = await (zip as { generateAsync(o: { type: string }): Promise<Blob> }).generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${this.folder}-export.zip`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      exportBtn.textContent = 'Export Selected';
      this.updateCount();
    }
  }
}
