import { state } from './state.ts';
import { itemList } from './dom.ts';
import type { PluginMeta, ListItem } from './types.ts';

export async function loadSidebar(plugin: PluginMeta): Promise<void> {
  itemList.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const [items, loader] = await Promise.all([
      fetch(`/api/listItems/get?folder=${encodeURIComponent(plugin.folder)}`).then(r => r.json()) as Promise<ListItem[]>,
      loadPluginLoader(plugin),
    ]);

    if (!Array.isArray(items) || items.length === 0) {
      itemList.innerHTML = '<div class="empty">No items</div>';
      return;
    }

    itemList.innerHTML = '';
    for (const item of items) {
      const loader_ = loader as { render?: (item: ListItem) => HTMLElement } | null;
      const el = loader_?.render ? loader_.render(item) : defaultListItem(item);
      el.draggable         = true;
      el.dataset.uuid      = item.uuid;
      el.dataset.url       = item.url ?? '';
      el.dataset.label     = item.label ?? item.uuid;
      el.classList.add('list-item');
      el.addEventListener('dragstart', handleDragStart);
      el.addEventListener('contextmenu', e => {
        e.preventDefault();
        import('./ctx-menu.ts').then(m => m.showSidebarCtxMenu(
          (e as MouseEvent).clientX,
          (e as MouseEvent).clientY,
          item,
        ));
      });
      itemList.appendChild(el);
    }
  } catch {
    itemList.innerHTML = '<div class="empty">Failed to load</div>';
  }
}

async function loadPluginLoader(plugin: PluginMeta): Promise<unknown> {
  if (state.loaderCache[plugin.folder]) return state.loaderCache[plugin.folder];
  try {
    const mod = await import(plugin.loaderUrl!);
    state.loaderCache[plugin.folder] = mod;
    return mod;
  } catch { return null; }
}

function defaultListItem(item: ListItem): HTMLElement {
  const el = document.createElement('div');
  const src = item.thumbnail ?? item.url;
  if (src) {
    const img   = document.createElement('img');
    img.src     = src;
    img.alt     = item.label ?? '';
    img.loading = 'lazy';
    el.appendChild(img);
  }
  const span       = document.createElement('span');
  span.textContent = item.label ?? item.uuid;
  el.appendChild(span);
  return el;
}

function handleDragStart(e: Event): void {
  const drag = e as DragEvent;
  const el   = drag.currentTarget as HTMLElement;
  state.draggedItem = {
    uuid:  el.dataset.uuid!,
    url:   el.dataset.url!,
    label: el.dataset.label!,
  };
  el.classList.add('dragging');
  const overlay = document.getElementById('iframe-overlay');
  overlay?.classList.add('dragging');
  drag.dataTransfer!.effectAllowed = 'copy';
  document.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    overlay?.classList.remove('dragging');
    state.draggedItem = null;
  }, { once: true });
}
