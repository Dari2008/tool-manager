import { state, GALLERY_TAB, PLUGINS_TAB, WORKFLOW_TAB } from './state.ts';
import { toolFrame, jobTabsEl } from './dom.ts';

export function sendToIframe(msg: Record<string, unknown>): void {
  try { toolFrame.contentWindow?.postMessage(msg, '*'); } catch { /* cross-origin */ }
}

export function setupIframeMessageHandler(
  loadRootGallery: () => Promise<void>,
  createJobWithItem: (item: { uuid: string; url: string; label: string }) => Promise<void>,
  loadSidebar: (plugin: { folder: string }) => Promise<void>,
): void {
  window.addEventListener('message', e => {
    const msg    = (e.data ?? {}) as Record<string, unknown>;
    const folder = state.activePlugin;
    if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;

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
        const jobId = (msg.jobId as string | undefined) ?? state.activeJobId[folder];
        const job   = state.jobs[folder]?.find(j => j.id === jobId);
        if (job) {
          job.dirty = false;
          jobTabsEl.querySelector(`[data-job-id="${jobId}"]`)?.classList.remove('dirty');
        }
        break;
      }

      case 'request-new-job':
        if (msg.uuid && msg.url) {
          createJobWithItem({
            uuid:  msg.uuid as string,
            url:   msg.url as string,
            label: (msg.label as string | undefined) ?? (msg.uuid as string).slice(0, 8),
          });
        }
        break;

      case 'gallery-changed':
        loadRootGallery();
        break;

      case 'refresh-sidebar':
        loadSidebar({ folder });
        break;
    }
  });
}
