import { SETTINGS_DIR, IMAGES_DIR } from "../config/index.js";
import { listSubDirectories } from "./fileSystem.js";
import { FolderRegistry } from "../types/index.js";
import { getAllPlugins } from "../plugins/loader.js";

let registry: FolderRegistry | null = null;

export async function buildFolderRegistry(): Promise<FolderRegistry> {
  const [settingsFolders, imagesFolders] = await Promise.all([
    listSubDirectories(SETTINGS_DIR),
    listSubDirectories(IMAGES_DIR),
  ]);

  const allFolders = Array.from(
    new Set([...settingsFolders, ...imagesFolders])
  );

  registry = { settingsFolders, imagesFolders, allFolders };
  return registry;
}

export function getFolderRegistry(): FolderRegistry {
  if (!registry) {
    throw new Error("Folder registry not initialized. Call buildFolderRegistry() first.");
  }
  return registry;
}

export function isKnownFolder(folder: string): boolean {
  if (folder === "jobs") return true;
  try {
    if (getAllPlugins().has(folder)) return true;
  } catch { /* plugins not loaded yet */ }
  return !!registry?.allFolders.includes(folder);
}
