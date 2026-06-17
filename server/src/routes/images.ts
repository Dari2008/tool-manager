import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { IMAGES_DIR } from "../config/index.js";
import { ensureDir, fileExists, listFiles, deleteFile } from "../utils/fileSystem.js";
import { isValidUuid } from "../utils/validation.js";
import { send400, send404, send409, send500 } from "../utils/errors.js";
import { isKnownFolder } from "../utils/folderRegistry.js";
import { getPlugin } from "../plugins/loader.js";

const upload = multer({ storage: multer.memoryStorage() });

export function createImagesRouter(): Router {
  const router = Router();

  // GET /api/images/:folder — list all image UUIDs
  router.get("/:folder", async (req: Request, res: Response) => {
    const { folder } = req.params;

    if (!isKnownFolder(folder)) {
      send404(res, folder);
      return;
    }

    try {
      const dir = path.join(IMAGES_DIR, folder);
      const files = await listFiles(dir);
      const images = files.map((f) => ({
        uuid: path.basename(f, path.extname(f)),
        filename: f,
        extension: path.extname(f).slice(1),
      }));
      res.json(images);
    } catch (err) {
      send500(res, err);
    }
  });

  // GET /api/images/:folder/:uuid — stream the image file
  router.get("/:folder/:uuid", async (req: Request, res: Response) => {
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
      const dir = path.join(IMAGES_DIR, folder);
      const files = await listFiles(dir);
      const match = files.find((f) => f.startsWith(uuid + "."));

      if (!match) {
        send404(res, uuid);
        return;
      }

      const filePath = path.join(dir, match);
      const ext = path.extname(match).slice(1).toLowerCase();
      const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };

      res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
      res.sendFile(filePath);
    } catch (err) {
      send500(res, err);
    }
  });

  // POST /api/images/:folder — upload a new image
  router.post(
    "/:folder",
    upload.single("image"),
    async (req: Request, res: Response) => {
      const { folder } = req.params;

      if (!isKnownFolder(folder)) {
        send404(res, folder);
        return;
      }

      const file = req.file;
      if (!file) {
        send400(res, "No image file provided. Use multipart/form-data with field 'image'");
        return;
      }

      try {
        const plugin = getPlugin(folder);
        const ext = plugin ? getPluginExtension(folder) : guessExtension(file.mimetype);
        const uuid = uuidv4();
        const dir = path.join(IMAGES_DIR, folder);
        await ensureDir(dir);

        const filePath = path.join(dir, `${uuid}.${ext}`);
        await fs.writeFile(filePath, file.buffer);

        res.status(201).json({ uuid, filename: `${uuid}.${ext}`, folder });
      } catch (err) {
        send500(res, err);
      }
    }
  );

  // DELETE /api/images/:folder/:uuid
  router.delete("/:folder/:uuid", async (req: Request, res: Response) => {
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
      const dir = path.join(IMAGES_DIR, folder);
      const files = await listFiles(dir);
      const match = files.find((f) => f.startsWith(uuid + "."));

      if (!match) {
        send404(res, uuid);
        return;
      }

      await deleteFile(path.join(dir, match));
      res.status(204).send();
    } catch (err) {
      send500(res, err);
    }
  });

  return router;
}

function getPluginExtension(folder: string): string {
  // Plugins declare their preferred format; default to jpeg
  const knownFormats: Record<string, string> = {
    raw: "jpg",
    shopProductImage: "jpg",
  };
  return knownFormats[folder] ?? "jpg";
}

function guessExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] ?? "jpg";
}
