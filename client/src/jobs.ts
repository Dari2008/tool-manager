import { state, GALLERY_TAB, PLUGINS_TAB, WORKFLOW_TAB } from './state.ts';
import { toolFrame, jobTabsEl, emptyState } from './dom.ts';
import { sendToIframe } from './iframe.ts';
import { showJobTabBar, hideJobTabBar } from './plugin-area.ts';

export function renderJobTabs(folder: string): void {
  jobTabsEl.innerHTML = '';
  const activeId = state.activeJobId[folder];
  for (const job of state.jobs[folder] ?? []) {
    jobTabsEl.appendChild(mkJobTab(folder, job, activeId));
  }
}

export function mkJobTab(
  folder: string,
  job: { id: string; label: string; dirty: boolean },
  activeId: string | null,
): HTMLElement {
  const el = document.createElement('div');
  el.className   = 'job-tab'
    + (job.id === activeId ? ' active' : '')
    + (job.dirty ? ' dirty' : '');
  el.dataset.jobId = job.id;

  const lbl        = document.createElement('span');
  lbl.textContent  = job.label;

  const cls        = document.createElement('button');
  cls.className    = 'job-tab-close';
  cls.textContent  = '✕';
  cls.title        = 'Close';
  cls.addEventListener('click', e => { e.stopPropagation(); tryCloseJob(folder, job.id); });

  el.append(lbl, cls);
  el.addEventListener('click', () => switchJobTab(folder, job.id));
  return el;
}

export async function switchJobTab(folder: string, jobId: string): Promise<void> {
  if (state.activeJobId[folder] === jobId) return;
  if (state.iframeReady) {
    sendToIframe({ type: 'request-save' });
    await waitForSave();
  }
  state.activeJobId[folder] = jobId;
  jobTabsEl.querySelectorAll('.job-tab').forEach(t =>
    t.classList.toggle('active', (t as HTMLElement).dataset.jobId === jobId)
  );
  sendToIframe({ type: 'load-job', jobId });
}

export async function tryCloseJob(folder: string, jobId: string): Promise<void> {
  const job = state.jobs[folder]?.find(j => j.id === jobId);
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

export function removeJob(folder: string, jobId: string): void {
  const idx = state.jobs[folder]?.findIndex(j => j.id === jobId) ?? -1;
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

export function waitForSave(): Promise<void> {
  return new Promise(resolve => {
    const t = setTimeout(resolve, 3000);
    function h(e: MessageEvent) {
      if ((e.data as Record<string, unknown>)?.type === 'saved') {
        clearTimeout(t);
        window.removeEventListener('message', h);
        resolve();
      }
    }
    window.addEventListener('message', h);
  });
}

export async function createJobWithItem(item: { uuid: string; url: string; label: string }): Promise<void> {
  const folder = state.activePlugin;
  if (!folder || folder === GALLERY_TAB || folder === PLUGINS_TAB || folder === WORKFLOW_TAB) return;

  let jobId: string;
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
  const wasEmpty = (state.jobs[folder] ?? []).length === 0;
  if (!state.jobs[folder]) state.jobs[folder] = [];
  state.jobs[folder].push(job);
  state.activeJobId[folder] = jobId;

  if (wasEmpty) {
    showJobTabBar();
    emptyState.style.display = 'none';
  }
  renderJobTabs(folder);

  const plugin = state.plugins.find(p => p.folder === folder);
  if (!plugin) return;

  if (toolFrame.dataset.pluginFolder !== folder) {
    state.pendingDrop   = { jobId, item };
    toolFrame.src       = plugin.indexUrl;
    toolFrame.dataset.pluginFolder = folder;
    state.iframeReady   = false;
  } else if (!state.iframeReady) {
    state.pendingDrop = { jobId, item };
  } else {
    sendToIframe({ type: 'init', jobId, item });
  }
}

export async function addItemToExistingJob(
  folder: string,
  jobId:  string,
  item:   { uuid: string; url: string; label: string },
): Promise<void> {
  try {
    const jobRes = await fetch(`/api/jobs/${jobId}`);
    if (jobRes.ok) {
      const job = await jobRes.json() as { rawImage?: string[] };
      const existing = new Set(job.rawImage ?? []);
      if (!existing.has(item.url)) {
        await fetch(`/api/jobs/${jobId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...job, rawImage: [...existing, item.url] }),
        });
      }
    }
  } catch { /* best-effort */ }
  if (state.iframeReady) sendToIframe({ type: 'add-item', item });
}
