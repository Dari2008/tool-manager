import fs from "fs/promises";
import path from "path";
import { Router, Request, Response } from "express";
import { getAllPlugins } from "../plugins/loader.js";
import { send400, send404, send500 } from "../utils/errors.js";
import {
  getPluginConfig,
  setPluginEnabled,
  setPluginGlobalSettings,
  getAllPluginConfigs,
} from "../services/pluginConfigService.js";
import { CLIENT_PLUGINS_DIR } from "../config/index.js";

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

export function createPluginsMetaRouter(): Router {
  const router = Router();

  // GET /api/plugins — list all loaded plugins with full metadata
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const plugins = getAllPlugins();
      const configs = await getAllPluginConfigs();

      const meta = await Promise.all(
        Array.from(plugins.values()).map(async (p) => {
          const cfg = configs[p.folder] ?? { enabled: true, globalSettings: {} };
          const hasWorkflowNodes = await fileExists(
            path.join(CLIENT_PLUGINS_DIR, p.folder, "workflow-nodes.js"),
          );
          return {
            folder: p.folder,
            name: p.name ?? p.folder,
            enabled: cfg.enabled,
            hasSidebar: p.hasSidebar !== false,
            canReceiveExternalItem: p.canReceiveExternalItem === true,
            globalSettings: cfg.globalSettings,
            globalSettingsSchema: p.globalSettingsSchema ?? [],
            indexUrl: `/client/plugins/${p.folder}/index.html`,
            loaderUrl: `/client/plugins/${p.folder}/loader.js`,
            hasWorkflowNodes,
          };
        }),
      );

      res.json(meta);
    } catch (err) {
      send500(res, err);
    }
  });

  // GET /api/plugins/:folder/config
  router.get("/:folder/config", async (req: Request, res: Response) => {
    const { folder } = req.params;
    const plugins = getAllPlugins();
    if (!plugins.has(folder)) {
      send404(res, folder);
      return;
    }
    try {
      const cfg = await getPluginConfig(folder);
      res.json({ folder, ...cfg });
    } catch (err) {
      send500(res, err);
    }
  });

  // PATCH /api/plugins/:folder/config
  router.patch("/:folder/config", async (req: Request, res: Response) => {
    const { folder } = req.params;
    const plugins = getAllPlugins();
    if (!plugins.has(folder)) {
      send404(res, folder);
      return;
    }

    const body = req.body as { enabled?: unknown; globalSettings?: unknown };

    try {
      let cfg = await getPluginConfig(folder);

      if (typeof body.enabled === "boolean") {
        cfg = await setPluginEnabled(folder, body.enabled);
      }

      if (
        body.globalSettings !== undefined &&
        typeof body.globalSettings === "object" &&
        body.globalSettings !== null &&
        !Array.isArray(body.globalSettings)
      ) {
        cfg = await setPluginGlobalSettings(folder, body.globalSettings as Record<string, unknown>);
      }

      if (body.enabled === undefined && body.globalSettings === undefined) {
        send400(res, "Provide at least one of: enabled, globalSettings");
        return;
      }

      res.json({ folder, ...cfg });
    } catch (err) {
      send500(res, err);
    }
  });

  return router;
}
