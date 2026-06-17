import { state } from './state.ts';
import {
  rgContent, rgCountEl, rgExportBtn, iframeOverlay, toolFrame,
} from './dom.ts';
import { sendToIframe } from './iframe.ts';
import type { GalleryItem, DeletePlanItem } from './types.ts';

// ─── Load & render ────────────────────────────────────────────

export async function loadRootGallery(): Promise<void> {
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

export function renderRgGroups(): void {
  rgContent.innerHTML = '';
  const hasAny = state.rgGroups.some(g => g.items?.length > 0);
  if (!hasAny) {
    rgContent.innerHTML = '<div class="placeholder">No generated images yet.</div>';
    return;
  }
  for (const group of state.rgGroups) {
    if (!group.items?.length) continue;
    const section    = document.createElement('div');
    section.className = 'rg-section';
    const hdr        = document.createElement('div');
    hdr.className    = 'rg-section-header';
    hdr.innerHTML    = `
      <span class="rg-section-title">${group.name}</span>
      <span class="rg-section-count">${group.items.length} image${group.items.length !== 1 ? 's' : ''}</span>`;
    const grid       = document.createElement('div');
    grid.className   = 'rg-grid';
    for (const item of group.items) grid.appendChild(buildRgCard(group.folder, item));
    section.append(hdr, grid);
    rgContent.appendChild(section);
  }
}

function buildRgCard(folder: string, item: GalleryItem): HTMLElement {
  const card         = document.createElement('div');
  card.className     = 'rg-card';
  card.dataset.uuid  = item.uuid;

  const cb           = document.createElement('input');
  cb.type            = 'checkbox';
  cb.className       = 'rg-checkbox';
  cb.addEventListener('change', () => {
    const key = `${folder}:${item.uuid}`;
    if (cb.checked) state.rgSelected.add(key);
    else            state.rgSelected.delete(key);
    card.classList.toggle('selected', cb.checked);
    updateRgCount();
  });

  const img          = document.createElement('img');
  img.src            = item.thumbnail ?? item.url;
  img.alt            = item.filename ?? item.uuid;
  img.loading        = 'lazy';
  img.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });

  const lbl          = document.createElement('div');
  lbl.className      = 'rg-label';
  lbl.textContent    = item.filename ?? item.uuid.slice(0, 8);

  card.append(cb, img, lbl);
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    state.draggedItem = { uuid: item.uuid, url: item.url, label: item.filename ?? item.uuid.slice(0, 8), sourceFolder: folder };
    iframeOverlay.classList.add('dragging');
    (e as DragEvent).dataTransfer!.effectAllowed = 'copy';
    document.addEventListener('dragend', () => {
      state.draggedItem = null;
      iframeOverlay.classList.remove('dragging');
    }, { once: true });
  });
  card.addEventListener('contextmenu', e => {
    e.preventDefault();
    import('./ctx-menu.ts').then(m => m.showCtxMenu((e as MouseEvent).clientX, (e as MouseEvent).clientY, folder, item));
  });
  return card;
}

export function updateRgCount(): void {
  const n = state.rgSelected.size;
  rgCountEl.textContent = `${n} selected`;
  (document.getElementById('rg-delete') as HTMLButtonElement).disabled = n === 0;
  rgExportBtn.disabled = n === 0;
}

// ─── Delete ───────────────────────────────────────────────────

export async function extendPlanWithRawConnections(
  planItems: Map<string, DeletePlanItem>,
  rawUuids:  string[],
  allJobs:   { id: string; rawImage?: string[]; outputs?: string[] }[],
  allSettings: { id: string; settings: Record<string, unknown> }[],
): Promise<void> {
  const deletingUrls = new Set(rawUuids.map(uuid => `/api/images/raw/${uuid}`));
  const jobOutSeen   = new Map<string, Set<string>>();

  for (const s of allSettings) {
    const rawUrl = (s.settings?.activeUrl ?? s.settings?.rawImage) as string | undefined;
    if (!rawUrl || !deletingUrls.has(rawUrl)) continue;
    const outId = `output:${s.id}`;
    if (!planItems.has(outId)) {
      planItems.set(outId, {
        id: outId, type: 'Output Image', label: s.id.slice(0, 8),
        imageUrl: `/api/images/shopProductImage/${s.id}`, checked: true,
        onDelete: () => fetch(`/api/settings/shopProductImage/${s.id}`, { method: 'DELETE' }).then(() => {}),
      });
    }
    const jobId = s.settings?.jobId as string | undefined;
    if (jobId) {
      if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, new Set());
      jobOutSeen.get(jobId)!.add(s.id);
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
          onDelete: () => fetch(`/api/settings/shopProductImage/${outputId}`, { method: 'DELETE' }).then(() => {}),
        });
      }
      if (!jobOutSeen.has(jobId)) jobOutSeen.set(jobId, new Set());
      jobOutSeen.get(jobId)!.add(outputId);
    }
    const seenOutputs = jobOutSeen.get(jobId) ?? new Set<string>();
    const allCovered  = jobOutputs.length === 0 || jobOutputs.every(id => seenOutputs.has(id));
    if (!planItems.has(`job:${jobId}`)) {
      planItems.set(`job:${jobId}`, {
        id: `job:${jobId}`, type: 'Job', label: `Job ${jobId.slice(0, 8)}`,
        meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
        checked: allCovered,
        onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).then(() => {}),
      });
    }
  }
}

export async function deleteRgSelected(): Promise<void> {
  if (!state.rgSelected.size) return;
  const { showDeleteModal } = await import('./ui/delete-modal.ts');

  const toDelete = [...state.rgSelected].map(key => {
    const [folder, ...rest] = key.split(':');
    return { folder, uuid: rest.join(':') };
  });

  const planItems      = new Map<string, DeletePlanItem>();
  const jobDataCache   = new Map<string, { rawImage?: string[]; outputs?: string[] }>();
  const selectedOutIds = new Set(toDelete.filter(t => t.folder !== 'raw').map(t => t.uuid));
  const rawUuids: string[] = [];

  for (const { folder, uuid } of toDelete) {
    const galleryItem = state.rgGroups.find(g => g.folder === folder)?.items.find(i => i.uuid === uuid);

    if (folder === 'raw') {
      rawUuids.push(uuid);
      planItems.set(`raw:${uuid}`, {
        id: `raw:${uuid}`, type: 'Raw Image',
        label:    galleryItem?.filename ?? uuid.slice(0, 8),
        imageUrl: galleryItem?.thumbnail ?? galleryItem?.url,
        checked:  true,
        onDelete: () => fetch(`/api/images/raw/${uuid}`, { method: 'DELETE' }).then(() => {}),
      });
      continue;
    }

    planItems.set(`output:${uuid}`, {
      id: `output:${uuid}`, type: 'Output Image',
      label:    galleryItem?.filename ?? uuid.slice(0, 8),
      imageUrl: galleryItem?.thumbnail ?? galleryItem?.url,
      checked:  true,
      onDelete: () => fetch(`/api/settings/${folder}/${uuid}`, { method: 'DELETE' }).then(() => {}),
    });

    const entry = await fetch(`/api/settings/${folder}/${uuid}`).then(r => r.json()).catch(() => null) as { settings?: Record<string, unknown> } | null;
    if (!entry?.settings) continue;
    const { activeUuid, activeUrl, jobId } = entry.settings as { activeUuid?: string; activeUrl?: string; jobId?: string };

    if (activeUuid && !planItems.has(`raw:${activeUuid}`)) {
      planItems.set(`raw:${activeUuid}`, {
        id: `raw:${activeUuid}`, type: 'Raw Image',
        label:    (activeUrl as string | undefined)?.split('/').pop() ?? activeUuid.slice(0, 8),
        imageUrl: activeUrl as string | undefined,
        checked:  false,
        onDelete: () => fetch(`/api/images/raw/${activeUuid}`, { method: 'DELETE' }).then(() => {}),
      });
    }

    if (jobId && !jobDataCache.has(jobId)) {
      const job = await fetch(`/api/jobs/${jobId}`).then(r => r.json()).catch(() => null);
      if (job) jobDataCache.set(jobId, job);
    }

    if (jobId && !planItems.has(`job:${jobId}`)) {
      const job        = jobDataCache.get(jobId);
      const rawCount   = Array.isArray(job?.rawImage) ? job!.rawImage!.length : 0;
      const jobOutputs = Array.isArray(job?.outputs) ? job!.outputs! : [];
      for (const outputId of jobOutputs) {
        const otherId = `output:${outputId}`;
        if (!planItems.has(otherId)) {
          planItems.set(otherId, {
            id: otherId, type: 'Output Image', label: outputId.slice(0, 8),
            imageUrl: `/api/images/${folder}/${outputId}`,
            checked:  selectedOutIds.has(outputId),
            onDelete: () => fetch(`/api/settings/${folder}/${outputId}`, { method: 'DELETE' }).then(() => {}),
          });
        }
      }
      const allOutputsSelected = jobOutputs.length > 0 && jobOutputs.every(id => selectedOutIds.has(id));
      planItems.set(`job:${jobId}`, {
        id: `job:${jobId}`, type: 'Job', label: `Job ${jobId.slice(0, 8)}`,
        meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
        checked: allOutputsSelected,
        onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).then(() => {}),
      });
    }
  }

  if (rawUuids.length > 0) {
    const [allJobs, allSettings] = await Promise.all([
      fetch('/api/jobs').then(r => r.json()).catch(() => []),
      fetch('/api/settings/shopProductImage').then(r => r.json()).catch(() => []),
    ]);
    await extendPlanWithRawConnections(planItems, rawUuids, allJobs, allSettings);
  }

  const n          = toDelete.length;
  const deletedIds = await showDeleteModal({
    title: n === 1 ? 'Delete Image' : `Delete ${n} Images`,
    items: [...planItems.values()],
  });
  if (!deletedIds.length) return;

  sendToIframe({ type: 'refresh-gallery' });
  toolFrame.dataset.pluginFolder = '';
  await loadRootGallery();
}

// ─── Export ───────────────────────────────────────────────────

export async function exportRgSelected(): Promise<void> {
  if (!state.rgSelected.size) return;

  const toExport: GalleryItem[] = [];
  for (const key of state.rgSelected) {
    const [folder, uuid] = key.split(':');
    const item = state.rgGroups.find(g => g.folder === folder)?.items.find(i => i.uuid === uuid);
    if (item) toExport.push(item);
  }

  const origText          = rgExportBtn.textContent;
  rgExportBtn.textContent = 'Preparing…';
  rgExportBtn.disabled    = true;

  try {
    const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js' as string);
    const zip = new JSZip();
    await Promise.all(toExport.map(async item => {
      const res = await fetch(item.url);
      if (!res.ok) return;
      zip.file(item.filename ?? `${item.uuid}.jpg`, await res.blob());
    }));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url; a.download = 'gallery-export.zip'; a.click();
    URL.revokeObjectURL(url);
  } finally {
    rgExportBtn.textContent = origText ?? 'Export Selected';
    updateRgCount();
  }
}
