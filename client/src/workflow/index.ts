import { WorkflowCanvas } from './canvas.ts';
import { getAllNodeRegistrations, registerPluginNodes, createNodeFromDefinition } from './nodes.ts';
import type { SimpleNodeDef } from './nodes.ts';
import type { SavedWorkflow } from './types.ts';
import { state } from '../state.ts';

let canvas: WorkflowCanvas | null = null;
let workflows: SavedWorkflow[]    = [];
let activeId: string | null       = null;
let dirty                         = false;

export async function initWorkflow(): Promise<void> {
  if (canvas) return;

  await loadPluginWorkflowNodes();

  const wrap = document.getElementById('wf-canvas-wrap')!;
  canvas = new WorkflowCanvas(wrap, getAllNodeRegistrations());

  await loadWorkflowList();

  document.getElementById('wf-new')!.addEventListener('click', newWorkflow);
  document.getElementById('wf-save')!.addEventListener('click', saveActive);
  document.getElementById('wf-rename')!.addEventListener('click', renameActive);
  document.getElementById('wf-delete-wf')!.addEventListener('click', deleteActive);
  (document.getElementById('wf-select') as HTMLSelectElement).addEventListener('change', e => {
    openWorkflow((e.target as HTMLSelectElement).value);
  });
  document.getElementById('wf-tab-graph')!.addEventListener('click',   () => switchTab('graph'));
  document.getElementById('wf-tab-gallery')!.addEventListener('click', () => switchTab('gallery'));
}

// ─── Plugin node loading ──────────────────────────────────────

async function loadPluginWorkflowNodes(): Promise<void> {
  for (const plugin of state.plugins) {
    if (!plugin.hasWorkflowNodes) continue;
    try {
      const url = `/client/plugins/${plugin.folder}/workflow-nodes.js`;
      const mod = await import(/* @vite-ignore */ url) as { default?: SimpleNodeDef[] };
      if (Array.isArray(mod.default) && mod.default.length) {
        registerPluginNodes(mod.default.map(createNodeFromDefinition));
      }
    } catch { /* skip */ }
  }
}

// ─── Tab switching ────────────────────────────────────────────

function switchTab(tab: 'graph' | 'gallery'): void {
  const isGraph = tab === 'graph';
  document.getElementById('wf-canvas-wrap')!.style.display  = isGraph  ? '' : 'none';
  document.getElementById('wf-gallery-view')!.style.display = !isGraph ? '' : 'none';
  document.getElementById('wf-tab-graph')!.classList.toggle('active', isGraph);
  document.getElementById('wf-tab-gallery')!.classList.toggle('active', !isGraph);
  if (!isGraph) loadGallery();
}

// ─── Gallery ─────────────────────────────────────────────────

async function loadGallery(): Promise<void> {
  const el = document.getElementById('wf-gallery-view')!;
  const wf = workflows.find(w => w.id === activeId);

  if (!wf?.runs?.length) {
    el.innerHTML = '<p class="wf-empty-msg">No runs recorded for this workflow yet.</p>';
    return;
  }

  el.innerHTML = '<div class="wf-loading">Loading…</div>';

  const allIds = [...new Set(wf.runs.flat())];
  const jobMap = new Map<string, Record<string, unknown>>();
  await Promise.all(allIds.map(async id => {
    try {
      const j = await fetch(`/api/jobs/${id}`).then(r => r.ok ? r.json() : null);
      if (j) jobMap.set(id, j);
    } catch { /**/ }
  }));

  el.innerHTML = '';
  wf.runs.forEach((run, idx) => {
    const section = document.createElement('div');
    section.className = 'wf-gallery-run';

    const hdr = document.createElement('div');
    hdr.className = 'wf-gallery-run-hdr';
    hdr.textContent = `Run ${idx + 1}`;
    section.appendChild(hdr);

    const grid = document.createElement('div');
    grid.className = 'wf-gallery-grid';

    for (const jobId of run) {
      const job = jobMap.get(jobId);
      if (!job) continue;
      const folder  = String(job.imageSettings ?? 'unknown');
      const raws    = Array.isArray(job.rawImage) ? (job.rawImage as string[]) : [];
      const outputs = Array.isArray(job.outputs)  ? (job.outputs  as string[]) : [];

      for (const url of raws)       grid.appendChild(buildCard(url, 'Input'));
      for (const id  of outputs)    grid.appendChild(buildCard(`/api/images/${folder}/${id}`, 'Output'));
    }

    section.appendChild(grid);
    el.appendChild(section);
  });
}

function buildCard(url: string, label: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'wf-gallery-card';
  const img = document.createElement('img');
  img.src = url;
  img.alt = label;
  img.loading = 'lazy';
  img.onerror = () => { card.style.display = 'none'; };
  const lbl = document.createElement('div');
  lbl.className = 'wf-gallery-card-label';
  lbl.textContent = label;
  card.append(img, lbl);
  return card;
}

// ─── Workflow list ────────────────────────────────────────────

async function loadWorkflowList(): Promise<void> {
  try { workflows = await fetch('/api/workflows').then(r => r.json()); }
  catch { workflows = []; }
  rebuildSelect();
  if (workflows.length > 0 && !activeId) await openWorkflow(workflows[0].id);
}

function rebuildSelect(): void {
  const sel = document.getElementById('wf-select') as HTMLSelectElement;
  sel.innerHTML = '<option value="">— select workflow —</option>';
  for (const wf of workflows) {
    const opt = document.createElement('option');
    opt.value = wf.id; opt.textContent = wf.name;
    if (wf.id === activeId) opt.selected = true;
    sel.appendChild(opt);
  }
  setStatus('');
}

async function openWorkflow(id: string): Promise<void> {
  if (!id) return;
  try {
    const wf = await fetch(`/api/workflows/${id}`).then(r => r.json()) as SavedWorkflow;
    canvas!.load(wf.graph ?? null);
    activeId = id;
    (document.getElementById('wf-select') as HTMLSelectElement).value = id;
    setDirty(false);
  } catch { setStatus('Failed to load workflow.'); }
}

async function newWorkflow(): Promise<void> {
  const name = prompt('Workflow name:', 'New Workflow');
  if (!name) return;
  try {
    const wf = await fetch('/api/workflows', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json()) as SavedWorkflow;
    workflows.push(wf);
    activeId = wf.id;
    canvas!.clear();
    rebuildSelect();
    setDirty(false);
  } catch { setStatus('Failed to create workflow.'); }
}

async function saveActive(): Promise<void> {
  if (!activeId || !canvas) return;
  try {
    const wf = workflows.find(w => w.id === activeId);
    const graph = canvas.save();
    await fetch(`/api/workflows/${activeId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph, runs: wf?.runs ?? [] }),
    });
    if (wf) wf.graph = graph;
    setDirty(false);
    setStatus('Saved ✓');
    setTimeout(() => setStatus(''), 2000);
  } catch { setStatus('Save failed.'); }
}

async function renameActive(): Promise<void> {
  if (!activeId) return;
  const wf   = workflows.find(w => w.id === activeId);
  const name = prompt('New name:', wf?.name ?? '');
  if (!name || name === wf?.name) return;
  try {
    await fetch(`/api/workflows/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (wf) wf.name = name;
    rebuildSelect();
  } catch { setStatus('Rename failed.'); }
}

async function deleteActive(): Promise<void> {
  if (!activeId) return;
  const wf = workflows.find(w => w.id === activeId);
  if (!confirm(`Delete workflow "${wf?.name}"?`)) return;
  try {
    await fetch(`/api/workflows/${activeId}`, { method: 'DELETE' });
    workflows = workflows.filter(w => w.id !== activeId);
    activeId  = null;
    canvas!.clear();
    rebuildSelect();
    if (workflows.length > 0) await openWorkflow(workflows[0].id);
  } catch { setStatus('Delete failed.'); }
}

// ─── Helpers ─────────────────────────────────────────────────

function setDirty(val: boolean): void {
  dirty = val;
  void dirty;
  setStatus(val ? '● unsaved' : '');
}

function setStatus(msg: string): void {
  const el = document.getElementById('wf-status');
  if (el) el.textContent = msg;
}
