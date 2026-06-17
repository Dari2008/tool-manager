import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "../../");

export const DATA_DIR = path.join(ROOT_DIR, "data");
export const SETTINGS_DIR = path.join(DATA_DIR, "settings");
export const IMAGES_DIR = path.join(DATA_DIR, "images");
export const JOBS_DIR      = path.join(DATA_DIR, "jobs");
export const WORKFLOWS_DIR = path.join(DATA_DIR, "workflows");
export const PLUGINS_DIR        = path.join(ROOT_DIR, "plugins");
export const CLIENT_PLUGINS_DIR = path.join(ROOT_DIR, "..", "client", "plugins");

export const PORT = Number(process.env.PORT ?? 3000);

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
