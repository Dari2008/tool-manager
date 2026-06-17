export interface GalleryItem {
  uuid: string;
  filename?: string;
  url: string;
  thumbnail?: string;
}

export interface GalleryGroup {
  folder: string;
  name: string;
  items: GalleryItem[];
}

export interface GlobalSettingsField {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number';
  defaultValue?: string | number;
  description?: string;
}

export interface PluginMeta {
  folder: string;
  name: string;
  indexUrl: string;
  loaderUrl?: string;
  enabled: boolean;
  hasSidebar?: boolean;
  canReceiveExternalItem?: boolean;
  hasWorkflowNodes?: boolean;
  globalSettingsSchema?: GlobalSettingsField[];
  globalSettings?: Record<string, unknown>;
}

export interface Job {
  id: string;
  label: string;
  dirty?: boolean;
  rawImage?: string[];
  outputs?: string[];
}

export interface ListItem {
  uuid: string;
  url?: string;
  label?: string;
  thumbnail?: string;
  filename?: string;
}

export interface SettingEntry {
  id: string;
  image: string[];
  settings: Record<string, unknown>;
}

export interface DeletePlanItem {
  id: string;
  type: string;
  label: string;
  imageUrl?: string;
  meta?: string;
  checked: boolean;
  onDelete: () => Promise<void>;
}

export interface DraggedItem {
  uuid: string;
  url: string;
  label: string;
  sourceFolder?: string;
}
