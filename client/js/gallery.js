/**
 * Reusable gallery component for plugin tool iframes.
 *
 * Usage:
 *   import { Gallery } from "/client/js/gallery.js";
 *   const gallery = new Gallery(containerEl, "shopProductImage", {
 *     onItemActivate: (item) => { ... },
 *     onDelete: async (items) => { /* handle confirm + API calls; return deleted UUIDs *\/ },
 *   });
 *   await gallery.refresh();
 */
export class Gallery {
  #container;
  #folder;
  #items = [];
  #selected = new Set();
  #onItemActivate;
  #onDelete; // async (items: GalleryItem[]) => string[]  — returns UUIDs actually deleted
  #ctxMenu = null;

  constructor(containerEl, folder, { onItemActivate, onDelete } = {}) {
    this.#container = containerEl;
    this.#folder = folder;
    this.#onItemActivate = onItemActivate ?? null;
    this.#onDelete = onDelete ?? null;
    this.#buildUI();
  }

  #buildUI() {
    this.#container.innerHTML = `
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

    this.#container.querySelector("#g-select-all").addEventListener("click", () => this.#selectAll());
    this.#container.querySelector("#g-deselect").addEventListener("click", () => this.#deselectAll());
    this.#container.querySelector("#g-delete").addEventListener("click", () => this.#deleteSelected());
    this.#container.querySelector("#g-export").addEventListener("click", () => this.#exportSelected());
    this.#container.querySelector("#g-refresh").addEventListener("click", () => this.refresh());

    this.#ctxMenu = document.createElement("div");
    this.#ctxMenu.className = "g-ctx-menu";
    this.#ctxMenu.style.display = "none";
    document.body.appendChild(this.#ctxMenu);
    document.addEventListener("click", () => this.#hideCtxMenu());
    document.addEventListener("contextmenu", () => this.#hideCtxMenu());
  }

  #showCtxMenu(x, y, item) {
    this.#ctxMenu.innerHTML = "";

    const delItem = document.createElement("div");
    delItem.className = "g-ctx-item g-ctx-danger";
    delItem.textContent = "Delete";
    delItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      this.#hideCtxMenu();
      const deleted = await this.#doDelete([item]);
      if (deleted.length) this.#applyDeletion(deleted);
    });
    this.#ctxMenu.appendChild(delItem);

    this.#ctxMenu.style.display = "block";
    const mw = this.#ctxMenu.offsetWidth;
    const mh = this.#ctxMenu.offsetHeight;
    this.#ctxMenu.style.left = `${Math.min(x, window.innerWidth  - mw - 8)}px`;
    this.#ctxMenu.style.top  = `${Math.min(y, window.innerHeight - mh - 8)}px`;
  }

  #hideCtxMenu() {
    if (this.#ctxMenu) this.#ctxMenu.style.display = "none";
  }

  // Core delete dispatcher — uses onDelete callback when provided, else default behaviour
  async #doDelete(items) {
    if (this.#onDelete) return (await this.#onDelete(items)) ?? [];
    const { showDeleteModal } = await import("/client/js/delete-modal.js");
    const folder = this.#folder;
    const modalItems = items.map(i => ({
      id: i.uuid,
      type: "Image",
      label: i.filename ?? i.uuid.slice(0, 8),
      imageUrl: i.thumbnail ?? i.url,
      checked: true,
      onDelete: () => fetch(`/api/images/${folder}/${i.uuid}`, { method: "DELETE" }).catch(() => {}),
    }));
    return await showDeleteModal({
      title: items.length === 1 ? "Delete Image" : `Delete ${items.length} Images`,
      items: modalItems,
    });
  }

  // Remove deleted UUIDs from local state and re-render
  #applyDeletion(uuids) {
    const s = new Set(uuids);
    this.#items = this.#items.filter((i) => !s.has(i.uuid));
    this.#selected = new Set([...this.#selected].filter((u) => !s.has(u)));
    this.#renderItems();
    this.#updateCount();
    window.parent.postMessage({ type: "gallery-changed" }, "*");
  }

  async refresh() {
    const grid = this.#container.querySelector("#g-grid");
    grid.innerHTML = '<div class="g-loading">Loading…</div>';
    this.#selected.clear();
    this.#updateCount();

    try {
      const res = await fetch(`/api/gallery/get?folder=${encodeURIComponent(this.#folder)}`);
      this.#items = await res.json();
      this.#renderItems();
    } catch {
      grid.innerHTML = '<div class="g-empty">Failed to load gallery.</div>';
    }
  }

  #renderItems() {
    const grid = this.#container.querySelector("#g-grid");

    if (!this.#items.length) {
      grid.innerHTML = '<div class="g-empty">No generated images yet.</div>';
      return;
    }

    grid.innerHTML = "";
    this.#items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "g-card";
      card.dataset.uuid = item.uuid;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "g-checkbox";
      cb.addEventListener("change", () => {
        if (cb.checked) this.#selected.add(item.uuid);
        else this.#selected.delete(item.uuid);
        card.classList.toggle("selected", cb.checked);
        this.#updateCount();
      });

      const img = document.createElement("img");
      img.src = item.thumbnail;
      img.alt = item.filename;
      img.loading = "lazy";
      img.addEventListener("click", () => {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change"));
      });

      const label = document.createElement("div");
      label.className = "g-label";
      label.textContent = item.filename ?? item.uuid.slice(0, 8);

      card.appendChild(cb);
      card.appendChild(img);
      card.appendChild(label);

      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.#showCtxMenu(e.clientX, e.clientY, item);
      });

      if (this.#onItemActivate) {
        card.draggable = true;
        card.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/x-gallery-uuid", item.uuid);
          e.dataTransfer.effectAllowed = "copy";
          e.stopPropagation();
        });

        const useBtn = document.createElement("button");
        useBtn.className = "g-use-btn";
        useBtn.textContent = "↑ Use";
        useBtn.title = "Load settings into tool";
        useBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.#onItemActivate(item);
        });
        card.appendChild(useBtn);
      }

      grid.appendChild(card);
    });
  }

  #selectAll() {
    this.#items.forEach((i) => this.#selected.add(i.uuid));
    this.#container.querySelectorAll(".g-checkbox").forEach((cb) => {
      cb.checked = true;
      cb.closest(".g-card")?.classList.add("selected");
    });
    this.#updateCount();
  }

  #deselectAll() {
    this.#selected.clear();
    this.#container.querySelectorAll(".g-checkbox").forEach((cb) => {
      cb.checked = false;
      cb.closest(".g-card")?.classList.remove("selected");
    });
    this.#updateCount();
  }

  #updateCount() {
    const countEl   = this.#container.querySelector("#g-count");
    const deleteBtn = this.#container.querySelector("#g-delete");
    const exportBtn = this.#container.querySelector("#g-export");
    if (countEl)   countEl.textContent = `${this.#selected.size} selected`;
    if (deleteBtn) deleteBtn.disabled  = this.#selected.size === 0;
    if (exportBtn) exportBtn.disabled  = this.#selected.size === 0;
  }

  async #deleteSelected() {
    if (!this.#selected.size) return;
    const btn = this.#container.querySelector("#g-delete");
    if (btn) { btn.textContent = "Deleting…"; btn.disabled = true; }
    const items = this.#items.filter((i) => this.#selected.has(i.uuid));
    const deleted = await this.#doDelete(items);
    if (deleted.length) this.#applyDeletion(deleted);
    if (btn) btn.textContent = "Delete Selected";
    this.#updateCount();
  }

  async #exportSelected() {
    if (!this.#selected.size) return;

    const selected = this.#items.filter((i) => this.#selected.has(i.uuid));
    const exportBtn = this.#container.querySelector("#g-export");
    exportBtn.textContent = "Preparing…";
    exportBtn.disabled = true;

    try {
      const { default: JSZip } = await import(
        "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
      );
      const zip = new JSZip();

      await Promise.all(
        selected.map(async (item) => {
          const res = await fetch(item.url);
          if (!res.ok) return;
          const blob = await res.blob();
          zip.file(item.filename ?? `${item.uuid}.jpg`, blob);
        })
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${this.#folder}-export.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      exportBtn.textContent = "Export Selected";
      this.#updateCount();
    }
  }
}
