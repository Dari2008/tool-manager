import { Editor } from '@baklavajs/core';
import { useBaklava, BaklavaEditor } from '@baklavajs/renderer-vue';
import { BaklavaInterfaceTypes } from '@baklavajs/interface-types';
import { createApp, defineComponent, h, computed, reactive } from 'vue';
import type { NodeRegistration } from './nodes.ts';
import { ALL_PORT_TYPES } from './portTypes.ts';

// panning + scaling are required by the renderer — without them any drag crashes
const EMPTY_STATE = {
  graph:          { id: '__empty__', nodes: [], connections: [], panning: { x: 0, y: 0 }, scaling: 1 },
  graphTemplates: [],
};

const PORT_COLORS: Record<string, string> = {
  image:   '#5c7cfa',
  text:    '#20c997',
  file:    '#f59f00',
  boolean: '#e64980',
  number:  '#7950f2',
  json:    '#1c7ed6',
};

type AnyVM = Record<string, unknown>;

function getPanning(vm: unknown): { x: number; y: number } {
  const dg = (vm as AnyVM | null)?.displayedGraph as AnyVM | undefined;
  const p  = (dg?.panning ?? (dg?.value as AnyVM)?.panning) as { x?: number; y?: number } | undefined;
  return { x: p?.x ?? 0, y: p?.y ?? 0 };
}

function getScaling(vm: unknown): number {
  const dg = (vm as AnyVM | null)?.displayedGraph as AnyVM | undefined;
  const s  = dg?.scaling ?? (dg?.value as AnyVM)?.scaling;
  return typeof s === 'number' ? s : 1;
}

export class WorkflowCanvas {
  private editor: Editor;
  private app: ReturnType<typeof createApp> | null = null;
  private vm: unknown = null;

  constructor(container: HTMLElement, registrations: NodeRegistration[]) {
    this.editor = new Editor();
    const editor = this.editor;
    const self   = this;

    const Root = defineComponent({
      setup() {
        const baklava = useBaklava(editor);
        self.vm = baklava;

        new BaklavaInterfaceTypes(editor, { viewPlugin: baklava as never })
          .addTypes(...ALL_PORT_TYPES);

        for (const { NodeClass, title, category } of registrations) {
          editor.registerNodeType(NodeClass, { title, category });
        }

        // Group palette items by category
        const groups = computed(() => {
          const map = new Map<string, NodeRegistration[]>();
          for (const reg of registrations) {
            const list = map.get(reg.category) ?? [];
            list.push(reg);
            map.set(reg.category, list);
          }
          return [...map.entries()];
        });

        function handleDrop(e: DragEvent): void {
          e.preventDefault();
          const nodeType = e.dataTransfer?.getData('wf-node-type');
          if (!nodeType) return;

          const reg = registrations.find(
            r => ((r.NodeClass as { type?: string }).type ?? r.title) === nodeType,
          );
          if (!reg) return;

          // panning/scaling are stored on the graph instance by the renderer-vue load hook
          const g       = editor.graph as unknown as { panning?: { x: number; y: number }; scaling?: number };
          const panX    = g.panning?.x ?? 0;
          const panY    = g.panning?.y ?? 0;
          const scaling = g.scaling   ?? 1;

          // Formula from renderer-vue source: canvasX = screenX / scaling - panning.x
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = (e.clientX - rect.left) / scaling - panX;
          const y = (e.clientY - rect.top)  / scaling - panY;

          // MUST call addNode on the reactive displayedGraph (not editor.graph directly).
          // Vue only tracks mutations on the reactive proxy — editor.graph is the raw instance.
          // Also MUST wrap the node in reactive() first, matching BaklavaJS's own palette handler.
          // The renderer-vue's addNode event hook sets node.position only on the reactive graph.
          const displayedGraph = (self.vm as { displayedGraph: { addNode: (n: unknown) => { position: { x: number; y: number } } | undefined } }).displayedGraph;
          const instance = reactive(new reg.NodeClass());
          const placed   = displayedGraph.addNode(instance);
          if (placed) {
            placed.position.x = x;
            placed.position.y = y;
          }
        }

        // Render a single palette node card with input/output port dots
        function renderPaletteNode(reg: NodeRegistration) {
          const inputs  = (reg.ports ?? []).filter(p => !p.isOutput);
          const outputs = (reg.ports ?? []).filter(p =>  p.isOutput);
          const nodeType = (reg.NodeClass as { type?: string }).type ?? reg.title;

          return h('div', {
            class:       'wf-palette-node',
            draggable:   true,
            onDragstart: (e: DragEvent) => {
              e.dataTransfer?.setData('wf-node-type', nodeType);
              e.dataTransfer!.effectAllowed = 'copy';
            },
          }, [
            h('div', { class: 'wf-palette-node-name' }, reg.title),
            (inputs.length + outputs.length) > 0
              ? h('div', { class: 'wf-palette-ports' }, [
                  h('div', { class: 'wf-palette-ports-in' },
                    inputs.map((p, i) =>
                      h('span', {
                        key:   `in-${i}`,
                        class: 'wf-port-dot',
                        style: { background: PORT_COLORS[p.type ?? ''] ?? '#555' },
                        title: `In: ${p.name}`,
                      }),
                    ),
                  ),
                  h('div', { class: 'wf-palette-ports-out' },
                    outputs.map((p, i) =>
                      h('span', {
                        key:   `out-${i}`,
                        class: 'wf-port-dot',
                        style: { background: PORT_COLORS[p.type ?? ''] ?? '#555' },
                        title: `Out: ${p.name}`,
                      }),
                    ),
                  ),
                ])
              : null,
          ]);
        }

        return () => h('div', { class: 'wf-editor-layout' }, [

          // ── Custom palette panel ───────────────────
          h('div', { class: 'wf-custom-palette' },
            groups.value.flatMap(([cat, regs]) => [
              h('div', { class: 'wf-palette-cat', key: `cat-${cat}` }, cat),
              ...regs.map(reg => renderPaletteNode(reg)),
            ]),
          ),

          // ── BaklavaJS canvas (built-in palette hidden via CSS) ──
          h('div', {
            class:       'wf-canvas-area',
            onDrop:      handleDrop,
            onDragover:  (e: DragEvent) => e.preventDefault(),
          },
            h(BaklavaEditor as never, { viewModel: baklava }),
          ),
        ]);
      },
    });

    this.app = createApp(Root);
    this.app.mount(container);
  }

  save(): unknown {
    return this.editor.save();
  }

  load(state: unknown): void {
    this.editor.load(state ? (state as never) : (EMPTY_STATE as never));
  }

  clear(): void {
    this.editor.load(EMPTY_STATE as never);
  }

  destroy(): void {
    this.app?.unmount();
    this.app = null;
  }
}
