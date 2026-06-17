import { Router, Request, Response } from "express";
import path from "path";
import { IMAGES_DIR } from "../config/index.js";
import { listFiles } from "../utils/fileSystem.js";
import { isKnownFolder } from "../utils/folderRegistry.js";
import { getPlugin, getAllPlugins } from "../plugins/loader.js";
import { isPluginEnabled } from "../services/pluginConfigService.js";
import { send400, send404, send500 } from "../utils/errors.js";
import { GalleryItem, GroupedGalleryItems } from "../types/index.js";

async function defaultGalleryItems(folder: string): Promise<GalleryItem[]> {
  const dir = path.join(IMAGES_DIR, folder);
  const files = await listFiles(dir);
  return files
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map((f) => {
      const uuid = path.basename(f, path.extname(f));
      return {
        uuid,
        filename: f,
        url: `/api/images/${folder}/${uuid}`,
        thumbnail: `/api/images/${folder}/${uuid}`,
      };
    });
}

export function createGalleryRouter(): Router {
  const router = Router();

  // GET /api/gallery/get?folder=<name>  — gallery for a single plugin
  router.get("/get", async (req: Request, res: Response) => {
    const folder = req.query["folder"];

    if (typeof folder !== "string" || !folder) {
      send400(res, "folder query param is required");
      return;
    }

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }

    try {
      const plugin = getPlugin(folder);
      const items = plugin?.getGalleryItems
        ? await plugin.getGalleryItems(req)
        : await defaultGalleryItems(folder);
      res.json(items);
    } catch (err) {
      send500(res, err);
    }
  });

  // GET /api/gallery/all  — all plugins' gallery items, grouped by plugin
  router.get("/all", async (req: Request, res: Response) => {
    try {
      const plugins = getAllPlugins();
      const groups: GroupedGalleryItems[] = [];

      for (const [folder, plugin] of plugins) {
        if (!(await isPluginEnabled(folder))) continue;

        const items = plugin.getGalleryItems
          ? await plugin.getGalleryItems(req)
          : await defaultGalleryItems(folder);

        if (items.length > 0) {
          groups.push({ folder, name: folder, items });
        }
      }

      res.json(groups);
    } catch (err) {
      send500(res, err);
    }
  });

  return router;
}
