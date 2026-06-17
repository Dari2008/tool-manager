import type { PluginMeta, GalleryGroup, DraggedItem } from './types.ts';

export const GALLERY_TAB  = '__gallery__';
export const PLUGINS_TAB  = '__plugins__';
export const WORKFLOW_TAB = '__workflow__';

export interface AppState {
  plugins:      PluginMeta[];
  activePlugin: string | null;
  jobs:         Record<string, { id: string; label: string; dirty: boolean }[]>;
  activeJobId:  Record<string, string | null>;
  draggedItem:  DraggedItem | null;
  loaderCache:  Record<string, unknown>;
  iframeReady:  boolean;
  pendingDrop:  { jobId: string; item: { uuid: string; url: string; label: string } } | null;
  rgSelected:   Set<string>;
  rgGroups:     GalleryGroup[];
}

export const state: AppState = {
  plugins:      [],
  activePlugin: null,
  jobs:         {},
  activeJobId:  {},
  draggedItem:  null,
  loaderCache:  {},
  iframeReady:  false,
  pendingDrop:  null,
  rgSelected:   new Set(),
  rgGroups:     [],
};
