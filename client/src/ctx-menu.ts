import { state } from './state.ts';
import { ctxMenu, ctxMenuItems, toolFrame } from './dom.ts';
import { sendToIframe } from './iframe.ts';
import { extendPlanWithRawConnections, loadRootGallery } from './gallery.ts';
import { createJobWithItem } from './jobs.ts';
import { loadSidebar } from './sidebar.ts';
import type { GalleryItem, ListItem, DeletePlanItem } from './types.ts';

export function hideCtxMenu(): void {
  ctxMenu.classList.add('hidden');
}

// ─── Root gallery right-click ─────────────────────────────────

export async function showCtxMenu(x: number, y: number, folder: string, item: GalleryItem): Promise<void> {
  const receivers = state.plugins.filter(p => p.canReceiveExternalItem && p.enabled);
  if (!receivers.length) return;

  ctxMenuItems.innerHTML = '';

  const header       = document.createElement('div');
  header.className   = 'ctx-menu-label';
  header.textContent = 'Open in…';
  ctxMenuItems.appendChild(header);

  ctxMenuItems.appendChild(mkSep());

  for (const p of receivers) {
    const btn         = document.createElement('div');
    btn.className     = 'ctx-menu-item';
    btn.textContent   = p.name;
    btn.addEventListener('click', async () => {
      hideCtxMenu();
      const { activateTab } = await import('./main.ts');
      await activateTab(p.folder);
      await createJobWithItem({ uuid: item.uuid, url: item.url, label: item.filename ?? item.uuid.slice(0, 8) });
    });
    ctxMenuItems.appendChild(btn);
  }

  ctxMenuItems.appendChild(mkSep());

  const delBtn         = document.createElement('div');
  delBtn.className     = 'ctx-menu-item ctx-menu-danger';
  delBtn.textContent   = 'Delete';
  delBtn.addEventListener('click', async () => {
    hideCtxMenu();
    const { showDeleteModal } = await import('./ui/delete-modal.ts');

    const planItems = new Map<string, DeletePlanItem>();
    let   primaryKey: string;

    if (folder === 'raw') {
      primaryKey = `raw:${item.uuid}`;
      planItems.set(primaryKey, {
        id: primaryKey, type: 'Raw Image',
        label:    item.filename ?? item.uuid.slice(0, 8),
        imageUrl: item.thumbnail ?? item.url,
        checked:  true,
        onDelete: () => fetch(`/api/images/raw/${item.uuid}`, { method: 'DELETE' }).then(() => {}),
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
        label:    item.filename ?? item.uuid.slice(0, 8),
        imageUrl: item.thumbnail ?? item.url,
        checked:  true,
        onDelete: () => fetch(`/api/settings/${folder}/${item.uuid}`, { method: 'DELETE' }).then(() => {}),
      });
      const entry = await fetch(`/api/settings/${folder}/${item.uuid}`).then(r => r.json()).catch(() => null) as { settings?: Record<string, unknown> } | null;
      if (entry?.settings) {
        const { activeUuid, activeUrl, jobId } = entry.settings as { activeUuid?: string; activeUrl?: string; jobId?: string };
        if (activeUuid) {
          planItems.set(`raw:${activeUuid}`, {
            id: `raw:${activeUuid}`, type: 'Raw Image',
            label:    (activeUrl)?.split('/').pop() ?? activeUuid.slice(0, 8),
            imageUrl: activeUrl,
            checked:  false,
            onDelete: () => fetch(`/api/images/raw/${activeUuid}`, { method: 'DELETE' }).then(() => {}),
          });
        }
        if (jobId) {
          const job        = await fetch(`/api/jobs/${jobId}`).then(r => r.json()).catch(() => null) as { rawImage?: string[]; outputs?: string[] } | null;
          const rawCount   = Array.isArray(job?.rawImage) ? job!.rawImage!.length : 0;
          const jobOutputs = Array.isArray(job?.outputs) ? job!.outputs! : [];
          for (const outputId of jobOutputs) {
            const otherId = `output:${outputId}`;
            if (!planItems.has(otherId)) {
              planItems.set(otherId, {
                id: otherId, type: 'Output Image', label: outputId.slice(0, 8),
                imageUrl: `/api/images/${folder}/${outputId}`, checked: false,
                onDelete: () => fetch(`/api/settings/${folder}/${outputId}`, { method: 'DELETE' }).then(() => {}),
              });
            }
          }
          const isOnlyOutput = jobOutputs.length === 1 && jobOutputs[0] === item.uuid;
          planItems.set(`job:${jobId}`, {
            id: `job:${jobId}`, type: 'Job', label: `Job ${jobId.slice(0, 8)}`,
            meta: rawCount > 0 ? `rawImage (${rawCount} image${rawCount !== 1 ? 's' : ''})` : undefined,
            checked: isOnlyOutput,
            onDelete: () => fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).then(() => {}),
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

  positionMenu(x, y);
}

// ─── Sidebar right-click ──────────────────────────────────────

export function showSidebarCtxMenu(x: number, y: number, item: ListItem): void {
  ctxMenuItems.innerHTML = '';

  const delBtn         = document.createElement('div');
  delBtn.className     = 'ctx-menu-item ctx-menu-danger';
  delBtn.textContent   = 'Delete';
  delBtn.addEventListener('click', async () => {
    hideCtxMenu();
    const { showDeleteModal } = await import('./ui/delete-modal.ts');

    const rawUrl     = `/api/images/raw/${item.uuid}`;
    const [allJobs, allSettings] = await Promise.all([
      fetch('/api/jobs').then(r => r.json()).catch(() => []),
      fetch('/api/settings/shopProductImage').then(r => r.json()).catch(() => []),
    ]);

    const planItems  = new Map<string, DeletePlanItem>();
    const jobOutSeen = new Map<string, Set<string>>();

    planItems.set(`raw:${item.uuid}`, {
      id: `raw:${item.uuid}`, type: 'Raw Image',
      label:    item.label ?? item.filename ?? item.uuid.slice(0, 8),
      imageUrl: item.thumbnail ?? item.url,
      checked:  true,
      onDelete: () => fetch(`/api/images/raw/${item.uuid}`, { method: 'DELETE' }).then(() => {}),
    });

    for (const s of allSettings as { id: string; settings: Record<string, unknown> }[]) {
      const sRawUrl = (s.settings?.activeUrl ?? s.settings?.rawImage) as string | undefined;
      if (sRawUrl !== rawUrl) continue;
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

    const orphaned = (allJobs as { id: string; rawImage?: string[]; outputs?: string[] }[]).filter(j => {
      const imgs = Array.isArray(j.rawImage) ? j.rawImage : [];
      return imgs.length > 0 && imgs.every(u => u === rawUrl);
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
  positionMenu(x, y);
}

function mkSep(): HTMLElement {
  const sep       = document.createElement('div');
  sep.className   = 'ctx-menu-separator';
  return sep;
}

function positionMenu(x: number, y: number): void {
  ctxMenu.classList.remove('hidden');
  const mw = ctxMenu.offsetWidth;
  const mh = ctxMenu.offsetHeight;
  ctxMenu.style.left = `${Math.min(x, window.innerWidth  - mw - 8)}px`;
  ctxMenu.style.top  = `${Math.min(y, window.innerHeight - mh - 8)}px`;
}
