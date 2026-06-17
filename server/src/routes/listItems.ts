import { Router, Request, Response } from "express";
import path from "path";
import { IMAGES_DIR } from "../config/index.js";
import { listFiles } from "../utils/fileSystem.js";
import { isKnownFolder } from "../utils/folderRegistry.js";
import { getPlugin } from "../plugins/loader.js";
import { send400, send404, send500, send409 } from "../utils/errors.js";
import { ListItem } from "../types/index.js";
import { isPluginEnabled } from "../services/pluginConfigService.js";

export function createListItemsRouter(): Router {
  const router = Router();

  // GET /api/listItems/get?folder=<name>
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
      if (!(await isPluginEnabled(folder))) {
        send409(res, `Plugin "${folder}" is currently disabled`);
        return;
      }

      const plugin = getPlugin(folder);

      if (plugin?.getListItems) {
        const items = await plugin.getListItems(req);
        res.json(items);
        return;
      }

      // Default: derive items from image files in the folder
      const dir = path.join(IMAGES_DIR, folder);
      const files = await listFiles(dir);

      const items: ListItem[] = files
        .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .map((f) => {
          const uuid = path.basename(f, path.extname(f));
          return {
            uuid,
            type: "image",
            label: uuid.slice(0, 8),
            url: `/api/images/${folder}/${uuid}`,
            thumbnail: `/api/images/${folder}/${uuid}`,
          };
        });

      res.json(items);
    } catch (err) {
      send500(res, err);
    }
  });

  return router;
}
