import { Router, Request, Response } from "express";
import path from "path";
import { SETTINGS_DIR } from "../config/index.js";
import {
  getAllEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
} from "../services/crudService.js";
import { isValidUuid } from "../utils/validation.js";
import { send400, send404, send409, send500 } from "../utils/errors.js";
import { isKnownFolder } from "../utils/folderRegistry.js";
import { getPlugin } from "../plugins/loader.js";
import { SettingEntry } from "../types/index.js";

export function createDynamicRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET /api/settings/:folder?setting=value
  router.get("/settings/:folder", async (req: Request, res: Response) => {
    const { folder } = req.params;

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }

    try {
      const plugin = getPlugin(folder);
      if (plugin?.getAll) {
        const result = await plugin.getAll(req);
        res.json(result);
        return;
      }

      let entries = await getAllEntries(SETTINGS_DIR, folder) as SettingEntry[];

      // Filter by settings key=value query params (exclude known non-setting params)
      const settingFilters = Object.entries(req.query).filter(
        ([k]) => k !== "rawImage"
      );

      if (settingFilters.length > 0) {
        entries = entries.filter((entry) => {
          if (!entry.settings || typeof entry.settings !== "object") return false;
          return settingFilters.every(([k, v]) => {
            const val = (entry.settings as Record<string, unknown>)[k];
            return String(val) === String(v);
          });
        });
      }

      res.json(entries);
    } catch (err) {
      send500(res, err);
    }
  });

  // GET /api/settings/:folder/:uuid
  router.get("/settings/:folder/:uuid", async (req: Request, res: Response) => {
    const { folder, uuid } = req.params;

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }
    if (!isValidUuid(uuid)) {
      send400(res, `Invalid UUID: ${uuid}`);
      return;
    }

    try {
      const plugin = getPlugin(folder);
      if (plugin?.getOne) {
        const result = await plugin.getOne(req, uuid);
        if (!result) { send404(res, uuid); return; }
        res.json(result);
        return;
      }

      const entry = await getEntry(SETTINGS_DIR, folder, uuid);
      if (!entry) { send404(res, uuid); return; }
      res.json(entry);
    } catch (err) {
      send500(res, err);
    }
  });

  // POST /api/settings/:folder
  router.post("/settings/:folder", async (req: Request, res: Response) => {
    const { folder } = req.params;

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }

    try {
      const plugin = getPlugin(folder);
      if (plugin?.create) {
        const result = await plugin.create(req, req.body as unknown);
        res.status(201).json(result);
        return;
      }

      const { uuid, data } = await createEntry(SETTINGS_DIR, folder, req.body as unknown);
      res.status(201).json({ uuid, data });
    } catch (err) {
      send500(res, err);
    }
  });

  // PUT /api/settings/:folder/:uuid
  router.put("/settings/:folder/:uuid", async (req: Request, res: Response) => {
    const { folder, uuid } = req.params;

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }
    if (!isValidUuid(uuid)) {
      send400(res, `Invalid UUID: ${uuid}`);
      return;
    }

    try {
      const plugin = getPlugin(folder);
      if (plugin?.update) {
        const result = await plugin.update(req, uuid, req.body as unknown);
        if (!result) { send404(res, uuid); return; }
        res.json(result);
        return;
      }

      const updated = await updateEntry(SETTINGS_DIR, folder, uuid, req.body as unknown);
      if (!updated) { send404(res, uuid); return; }
      res.json(updated);
    } catch (err) {
      send500(res, err);
    }
  });

  // DELETE /api/settings/:folder/:uuid
  router.delete("/settings/:folder/:uuid", async (req: Request, res: Response) => {
    const { folder, uuid } = req.params;

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }
    if (!isValidUuid(uuid)) {
      send400(res, `Invalid UUID: ${uuid}`);
      return;
    }

    try {
      const plugin = getPlugin(folder);
      if (plugin?.delete) {
        await plugin.delete(req, uuid);
        res.status(204).send();
        return;
      }

      const deleted = await deleteEntry(SETTINGS_DIR, folder, uuid);
      if (!deleted) { send404(res, uuid); return; }
      res.status(204).send();
    } catch (err) {
      send500(res, err);
    }
  });

  return router;
}
