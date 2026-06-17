import fs from "fs/promises";
import path from "path";
import { PLUGINS_DIR } from "../config/index.js";
import { ProcessPlugin, PluginModule } from "../types/index.js";
import { log } from "../utils/logger.js";

const pluginMap = new Map<string, ProcessPlugin>();

export async function loadPlugins(): Promise<Map<string, ProcessPlugin>> {
  let entries: string[];

  try {
    const dirEntries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
    entries = dirEntries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    log.warn("plugins", `No plugins directory found at ${PLUGINS_DIR}. Skipping plugin load.`);
    return pluginMap;
  }

  log.info("plugins", `Found ${entries.length} plugin folder(s): ${entries.join(", ")}`);

  for (const name of entries) {
    const entryPath = path.join(PLUGINS_DIR, name, "index.ts");
    const entryPathJs = path.join(PLUGINS_DIR, name, "index.js");

    const resolvedPath = (await fileExistsCheck(entryPath))
      ? entryPath
      : entryPathJs;

    log.debug("plugins", `Loading "${name}" from ${resolvedPath}`);

    try {
      const url = pathToFileUrl(resolvedPath);
      const mod = (await import(url)) as PluginModule;
      const instance = new mod.default();
      pluginMap.set(instance.folder, instance);

      const methods = (["getAll", "getOne", "create", "update", "delete", "registerRoutes"] as const)
        .filter((m) => typeof (instance as unknown as Record<string, unknown>)[m] === "function");

      log.info("plugins", `Loaded plugin "${name}" → folder: "${instance.folder}" [${methods.join(", ")}]`);
    } catch (err) {
      log.error("plugins", `Failed to load plugin "${name}"`, err);
    }
  }

  return pluginMap;
}

export function getPlugin(folder: string): ProcessPlugin | undefined {
  return pluginMap.get(folder);
}

export function getAllPlugins(): Map<string, ProcessPlugin> {
  return pluginMap;
}

async function fileExistsCheck(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function pathToFileUrl(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  return `file:///${normalized}`;
}
