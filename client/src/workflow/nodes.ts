import { defineNode, NodeInterface } from '@baklavajs/core';
import {
  TextInputInterface, NumberInterface,
} from '@baklavajs/renderer-vue';
import { setType } from '@baklavajs/interface-types';
import { imageType, textType, fileType, boolType, numberType, jsonType, ALL_PORT_TYPES } from './portTypes.ts';

// ─── Simple node definition (for plugin-contributed nodes) ───────

export type SimplePortType = 'image' | 'text' | 'file' | 'boolean' | 'number' | 'json' | 'any';

export interface SimpleNodePort {
  key:           string;
  name:          string;
  type?:         SimplePortType;
  configOnly?:   boolean;       // renders as text/number input with no connection port
  defaultValue?: unknown;
}

export interface SimpleNodeDef {
  type:     string;             // unique id, e.g. "myPlugin/resize"
  title:    string;
  category: string;
  inputs?:  SimpleNodePort[];
  outputs?: SimpleNodePort[];
}

// ─── Port preview (for custom palette rendering) ─────────────────

export interface NodePortPreview {
  name:     string;
  type?:    string;   // 'image' | 'text' | etc.
  isOutput: boolean;
}

export interface NodeRegistration {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NodeClass: new () => any;
  title:     string;
  category:  string;
  ports?:    NodePortPreview[];
}

// ─── Plugin node factory ──────────────────────────────────────────

export function createNodeFromDefinition(def: SimpleNodeDef): NodeRegistration {
  const inputsFactory: Record<string, () => NodeInterface<unknown>> = {};
  for (const p of def.inputs ?? []) {
    inputsFactory[p.key] = () => {
      if (p.configOnly) {
        return new TextInputInterface(p.name, String(p.defaultValue ?? '')).setPort(false) as unknown as NodeInterface<unknown>;
      }
      const i = new NodeInterface<unknown>(p.name, p.defaultValue ?? null);
      if (p.type && p.type !== 'any') {
        const pt = ALL_PORT_TYPES.find(t => t.name === p.type);
        if (pt) setType(i, pt);
      }
      return i;
    };
  }

  const outputsFactory: Record<string, () => NodeInterface<unknown>> = {};
  for (const p of def.outputs ?? []) {
    outputsFactory[p.key] = () => {
      const i = new NodeInterface<unknown>(p.name, null);
      if (p.type && p.type !== 'any') {
        const pt = ALL_PORT_TYPES.find(t => t.name === p.type);
        if (pt) setType(i, pt);
      }
      return i;
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeClass = defineNode({ type: def.type, title: def.title, inputs: inputsFactory as any, outputs: outputsFactory as any });

  const ports: NodePortPreview[] = [
    ...(def.inputs  ?? []).filter(p => !p.configOnly).map(p => ({ name: p.name, type: p.type, isOutput: false })),
    ...(def.outputs ?? []).map(p => ({ name: p.name, type: p.type, isOutput: true })),
  ];

  return { NodeClass, title: def.title, category: def.category, ports };
}

// ─── Core nodes ────────────────────────────────────────────────

export const TriggerNode = defineNode({
  type: 'core/trigger',
  title: 'Trigger',
  inputs: {},
  outputs: {
    out: () => { const i = new NodeInterface<boolean>('Start', false); setType(i, boolType); return i; },
  },
});

export const ImageInputNode = defineNode({
  type: 'core/image-input',
  title: 'Image Input',
  inputs: {
    imageUrl: () => new TextInputInterface('Image URL', '').setPort(false),
  },
  outputs: {
    image: () => { const i = new NodeInterface<string>('Image', ''); setType(i, imageType); return i; },
  },
});

export const ImageOutputNode = defineNode({
  type: 'core/image-output',
  title: 'Image Output',
  inputs: {
    image: () => { const i = new NodeInterface<string>('Image', ''); setType(i, imageType); return i; },
  },
  outputs: {},
});

export const SaveNode = defineNode({
  type: 'core/save',
  title: 'Save',
  inputs: {
    file:     () => { const i = new NodeInterface<string>('File', ''); setType(i, fileType); return i; },
    filename: () => new TextInputInterface('Filename', 'output.jpg').setPort(false),
  },
  outputs: {
    path: () => { const i = new NodeInterface<string>('Saved Path', ''); setType(i, textType); return i; },
  },
});

export const DownloadNode = defineNode({
  type: 'core/download',
  title: 'Download',
  inputs: {
    file:     () => { const i = new NodeInterface<string>('File', ''); setType(i, fileType); return i; },
    filename: () => new TextInputInterface('Filename', 'download.jpg').setPort(false),
  },
  outputs: {},
});

export const ConfirmNode = defineNode({
  type: 'core/confirm',
  title: 'Confirm Dialog',
  inputs: {
    in:      () => new NodeInterface<unknown>('In', null),
    message: () => new TextInputInterface('Message', 'Continue?').setPort(false),
  },
  outputs: {
    yes: () => new NodeInterface<unknown>('Yes', null),
    no:  () => new NodeInterface<unknown>('No', null),
  },
});

export const SelectNode = defineNode({
  type: 'core/select',
  title: 'Select Dialog',
  inputs: {
    title:   () => new TextInputInterface('Dialog Title', 'Select an item').setPort(false),
    options: () => new TextInputInterface('Options (JSON)', '["a","b"]').setPort(false),
  },
  outputs: {
    value: () => { const i = new NodeInterface<unknown>('Selected', null); setType(i, jsonType); return i; },
  },
});

export const IfNode = defineNode({
  type: 'core/if',
  title: 'If / Else',
  inputs: {
    value:     () => new NodeInterface<unknown>('Value', null),
    condition: () => new TextInputInterface('Condition (JS)', 'value === true').setPort(false),
  },
  outputs: {
    true:  () => new NodeInterface<unknown>('True', null),
    false: () => new NodeInterface<unknown>('False', null),
  },
});

export const MergeNode = defineNode({
  type: 'core/merge',
  title: 'Merge',
  inputs: {
    a: () => new NodeInterface<unknown>('A', null),
    b: () => new NodeInterface<unknown>('B', null),
  },
  outputs: {
    out: () => new NodeInterface<unknown>('Out', null),
  },
});

export const TextNode = defineNode({
  type: 'core/text',
  title: 'Text',
  inputs: {
    value: () => new TextInputInterface('Value', '').setPort(false),
  },
  outputs: {
    text: () => { const i = new NodeInterface<string>('Text', ''); setType(i, textType); return i; },
  },
});

export const NumberNode = defineNode({
  type: 'core/number',
  title: 'Number',
  inputs: {
    value: () => new NumberInterface('Value', 0).setPort(false),
  },
  outputs: {
    num: () => { const i = new NodeInterface<number>('Number', 0); setType(i, numberType); return i; },
  },
});

// ─── Registration list ─────────────────────────────────────────

export const BUILTIN_NODE_REGISTRATIONS: NodeRegistration[] = [
  {
    NodeClass: TriggerNode, title: 'Trigger', category: 'Core',
    ports: [{ name: 'Start', type: 'boolean', isOutput: true }],
  },
  {
    NodeClass: ImageInputNode, title: 'Image Input', category: 'Core',
    ports: [{ name: 'Image', type: 'image', isOutput: true }],
  },
  {
    NodeClass: ImageOutputNode, title: 'Image Output', category: 'Core',
    ports: [{ name: 'Image', type: 'image', isOutput: false }],
  },
  {
    NodeClass: SaveNode, title: 'Save', category: 'Core',
    ports: [
      { name: 'File', type: 'file', isOutput: false },
      { name: 'Saved Path', type: 'text', isOutput: true },
    ],
  },
  {
    NodeClass: DownloadNode, title: 'Download', category: 'Core',
    ports: [{ name: 'File', type: 'file', isOutput: false }],
  },
  {
    NodeClass: ConfirmNode, title: 'Confirm Dialog', category: 'Core',
    ports: [
      { name: 'In',  isOutput: false },
      { name: 'Yes', isOutput: true  },
      { name: 'No',  isOutput: true  },
    ],
  },
  {
    NodeClass: SelectNode, title: 'Select Dialog', category: 'Core',
    ports: [{ name: 'Selected', type: 'json', isOutput: true }],
  },
  {
    NodeClass: IfNode, title: 'If / Else', category: 'Core',
    ports: [
      { name: 'Value', isOutput: false },
      { name: 'True',  isOutput: true },
      { name: 'False', isOutput: true },
    ],
  },
  {
    NodeClass: MergeNode, title: 'Merge', category: 'Core',
    ports: [
      { name: 'A', isOutput: false },
      { name: 'B', isOutput: false },
      { name: 'Out', isOutput: true },
    ],
  },
  {
    NodeClass: TextNode, title: 'Text', category: 'Core',
    ports: [{ name: 'Text', type: 'text', isOutput: true }],
  },
  {
    NodeClass: NumberNode, title: 'Number', category: 'Core',
    ports: [{ name: 'Number', type: 'number', isOutput: true }],
  },
];

const _pluginRegistrations: NodeRegistration[] = [];

export function registerPluginNodes(registrations: NodeRegistration[]): void {
  _pluginRegistrations.push(...registrations);
}

export function getAllNodeRegistrations(): NodeRegistration[] {
  return [...BUILTIN_NODE_REGISTRATIONS, ..._pluginRegistrations];
}
