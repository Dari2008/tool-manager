import { Request, Response, NextFunction, Express } from "express";

export interface Job {
  id: string;
  imageSettings: string;
  rawImage: string[];
  outputs?: string[];
  settings?: Record<string, Record<string, unknown>>;
  [folderName: string]: unknown;
}

export interface SettingEntry {
  id: string;
  image: string[];
  settings: Record<string, unknown>;
}

export interface ImageReference {
  id: string;
  folder: string;
  filename: string;
  extension: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ListItem {
  uuid: string;
  type: "image" | string;
  label: string;
  url?: string;
  thumbnail?: string;
  meta?: Record<string, unknown>;
}

export interface GalleryItem {
  uuid: string;
  filename: string;
  url: string;
  thumbnail: string;
  meta?: Record<string, unknown>;
}

export interface GlobalSettingField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "password";
  description?: string;
  defaultValue?: unknown;
}

export interface PluginMeta {
  folder: string;
  name: string;
  enabled: boolean;
  hasSidebar: boolean;
  canReceiveExternalItem: boolean;
  globalSettings: Record<string, unknown>;
  indexUrl: string;
  loaderUrl: string;
}

export interface GroupedGalleryItems {
  folder: string;
  name: string;
  items: GalleryItem[];
}

export type FolderMap = Map<string, string>;

export interface FolderRegistry {
  settingsFolders: string[];
  imagesFolders: string[];
  allFolders: string[];
}

export interface ProcessPlugin {
  folder: string;

  /** Human-readable display name shown in the tab bar. Defaults to folder name. */
  name?: string;

  /**
   * Set to false for plugins that are pure galleries with no drag-and-drop
   * sidebar. The sidebar is hidden and no job tabs are created.
   * Default: true.
   */
  hasSidebar?: boolean;

  getAll?(req: Request): Promise<unknown>;
  getOne?(req: Request, uuid: string): Promise<unknown>;

  create?(req: Request, body: unknown): Promise<unknown>;
  update?(req: Request, uuid: string, body: unknown): Promise<unknown>;

  delete?(req: Request, uuid: string): Promise<void>;

  /** Items shown in the left sidebar — these are SOURCE/INPUT images. */
  getListItems?(req: Request): Promise<ListItem[]>;

  /** Items shown in the Gallery tab — these are GENERATED/OUTPUT images. */
  getGalleryItems?(req: Request): Promise<GalleryItem[]>;

  /** Declare which global settings this plugin accepts (shown in the settings modal). */
  globalSettingsSchema?: GlobalSettingField[];

  /**
   * Set to true if this plugin can receive an image from the global Gallery
   * tab via the right-click "Open in …" context menu.
   */
  canReceiveExternalItem?: boolean;

  registerRoutes?(app: Express): void | Promise<void>;
}

export interface PluginModule {
  default: new () => ProcessPlugin;
}

export { Request, Response, NextFunction };
