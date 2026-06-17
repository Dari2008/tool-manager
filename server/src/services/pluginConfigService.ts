import path from "path";
import { DATA_DIR } from "../config/index.js";
import { readJson, writeJson, fileExists, ensureDir } from "../utils/fileSystem.js";
import { log } from "../utils/logger.js";

const CONFIG_PATH = path.join(DATA_DIR, "plugin-config.json");

export interface PluginConfig {
  enabled: boolean;
  globalSettings: Record<string, unknown>;
}

export interface PluginConfigFile {
  [folder: string]: PluginConfig;
}

async function readConfig(): Promise<PluginConfigFile> {
  if (!(await fileExists(CONFIG_PATH))) return {};
  return readJson<PluginConfigFile>(CONFIG_PATH);
}

async function writeConfig(config: PluginConfigFile): Promise<void> {
  await ensureDir(DATA_DIR);
  await writeJson(CONFIG_PATH, config);
}

export async function getPluginConfig(folder: string): Promise<PluginConfig> {
  const config = await readConfig();
  return config[folder] ?? { enabled: true, globalSettings: {} };
}

export async function getAllPluginConfigs(): Promise<PluginConfigFile> {
  return readConfig();
}

export async function setPluginEnabled(folder: string, enabled: boolean): Promise<PluginConfig> {
  const config = await readConfig();
  const existing = config[folder] ?? { enabled: true, globalSettings: {} };
  const updated: PluginConfig = { ...existing, enabled };
  config[folder] = updated;
  await writeConfig(config);
  log.info("plugin-config", `Plugin "${folder}" ${enabled ? "enabled" : "disabled"}`);
  return updated;
}

export async function setPluginGlobalSettings(
  folder: string,
  settings: Record<string, unknown>
): Promise<PluginConfig> {
  const config = await readConfig();
  const existing = config[folder] ?? { enabled: true, globalSettings: {} };
  const updated: PluginConfig = {
    ...existing,
    globalSettings: { ...existing.globalSettings, ...settings },
  };
  config[folder] = updated;
  await writeConfig(config);
  log.info("plugin-config", `Global settings updated for plugin "${folder}"`);
  return updated;
}

export async function isPluginEnabled(folder: string): Promise<boolean> {
  const cfg = await getPluginConfig(folder);
  return cfg.enabled;
}
