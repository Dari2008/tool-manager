function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) throw new Error(`Element #${id} not found in DOM`);
  return el;
}

export const tabsEl           = $('tabs');
export const jobTabBar        = $('job-tab-bar');
export const jobTabsEl        = $('job-tabs');
export const layout           = $('layout');
export const sidebar          = $('sidebar');
export const itemList         = $('item-list');
export const toolFrame        = $<HTMLIFrameElement>('tool-frame');
export const iframeOverlay    = $('iframe-overlay');
export const iframeWrap       = $('iframe-wrap');
export const rootGalleryView  = $('root-gallery-view');
export const pluginsPanelView = $('plugins-panel-view');
export const workflowView     = $('workflow-view');
export const rgContent        = $('rg-content');
export const rgCountEl        = $('rg-count');
export const rgExportBtn      = $<HTMLButtonElement>('rg-export');
export const emptyState       = $('empty-state');
export const btnSettings      = $<HTMLButtonElement>('btn-plugin-settings');
export const settingsModal    = $('settings-modal');
export const modalTitle       = $('modal-title');
export const settingEnabled   = $<HTMLInputElement>('setting-enabled');
export const globalFields     = $('global-settings-fields');
export const ctxMenu          = $('ctx-menu');
export const ctxMenuItems     = $('ctx-menu-items');
