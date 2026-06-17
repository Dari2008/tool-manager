import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { PORT, JOBS_DIR, SETTINGS_DIR, IMAGES_DIR, WORKFLOWS_DIR } from "./config/index.js";
import { buildFolderRegistry } from "./utils/folderRegistry.js";
import { ensureDir } from "./utils/fileSystem.js";
import { loadPlugins } from "./plugins/loader.js";
import { log, requestLogger } from "./utils/logger.js";
import { createJobsRouter }       from "./routes/jobs.js";
import { createWorkflowsRouter } from "./routes/workflows.js";
import { createDynamicRouter } from "./routes/dynamic.js";
import { createImagesRouter } from "./routes/images.js";
import { createListItemsRouter } from "./routes/listItems.js";
import { createGalleryRouter } from "./routes/gallery.js";
import { createPluginSettingsRouter } from "./routes/pluginSettings.js";
import { createPluginsMetaRouter } from "./routes/pluginsMeta.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, "../");
const CLIENT_DIR = path.resolve(SERVER_ROOT, "../client");

async function bootstrap(): Promise<void> {
  log.info("server", "Starting up…");

  // Ensure base data directories exist
  await Promise.all([
    ensureDir(JOBS_DIR),
    ensureDir(SETTINGS_DIR),
    ensureDir(IMAGES_DIR),
    ensureDir(WORKFLOWS_DIR),
  ]);

  // Discover all subfolders under settings/ and images/
  const registry = await buildFolderRegistry();
  log.info("server", `Settings folders : ${registry.settingsFolders.join(", ") || "(none)"}`);
  log.info("server", `Image folders    : ${registry.imagesFolders.join(", ") || "(none)"}`);

  // Load all plugins
  const plugins = await loadPlugins();
  log.info("server", `${plugins.size} plugin(s) ready`);

  const app = express();

  // Request logger — runs before all routes
  app.use(requestLogger);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Serve the web client as static files
  app.use("/client", express.static(CLIENT_DIR));

  // Redirect root to the client
  app.get("/", (_req, res) => {
    res.redirect("/client/index.html");
  });

  // Core API routers
  app.use("/api/jobs",      createJobsRouter());
  app.use("/api/workflows", createWorkflowsRouter());
  app.use("/api/images", createImagesRouter());
  app.use("/api/listItems", createListItemsRouter());
  app.use("/api/gallery", createGalleryRouter());
  app.use("/api/plugins", createPluginsMetaRouter());
  app.use("/api/plugins", createPluginSettingsRouter());
  app.use("/api", createDynamicRouter());

  // Let each plugin register its own custom routes
  for (const [, plugin] of plugins) {
    if (plugin.registerRoutes) {
      log.info("server", `Registering custom routes for plugin "${plugin.folder}"`);
      await plugin.registerRoutes(app);
    }
  }

  // 404 fallback for unknown API routes
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "NotFound", message: "Endpoint not found", statusCode: 404 });
  });

  app.listen(PORT, () => {
    log.info("server", `Listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  log.error("server", "Fatal startup error", err);
  process.exit(1);
});
