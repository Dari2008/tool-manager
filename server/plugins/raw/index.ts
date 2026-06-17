import { Request, Express } from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { ProcessPlugin, GalleryItem } from "../../src/types/index.js";
import { SETTINGS_DIR, IMAGES_DIR } from "../../src/config/index.js";
import {
  fileExists,
  ensureDir,
  listFiles,
  deleteFile,
} from "../../src/utils/fileSystem.js";

const FOLDER = "raw";
const IMAGE_EXT = "jpg";
const upload = multer({ storage: multer.memoryStorage() });

export default class RawPlugin implements ProcessPlugin {
  folder = FOLDER;
  hasSidebar = false;
  canReceiveExternalItem = false;

  async getGalleryItems(_req: Request): Promise<GalleryItem[]> {
    const dir = path.join(IMAGES_DIR, FOLDER);
    const files = await listFiles(dir);
    return files
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map((f) => {
        const uuid = path.basename(f, path.extname(f));
        return {
          uuid,
          filename: f,
          url: `/api/images/${FOLDER}/${uuid}`,
          thumbnail: `/api/images/${FOLDER}/${uuid}`,
        };
      });
  }

  async delete(_req: Request, uuid: string): Promise<void> {
    // Remove any legacy settings file created by older code
    const legacySettingPath = path.join(SETTINGS_DIR, FOLDER, `${uuid}.json`);
    if (await fileExists(legacySettingPath)) await deleteFile(legacySettingPath);

    const imageDir = path.join(IMAGES_DIR, FOLDER);
    const files = await listFiles(imageDir);
    const imageFile = files.find((f) => f.startsWith(uuid + "."));
    if (imageFile) await deleteFile(path.join(imageDir, imageFile));
  }

  registerRoutes(app: Express): void {
    app.post("/api/raw/upload", upload.single("image"), async (req, res) => {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "BadRequest", message: "No image file provided", statusCode: 400 });
        return;
      }

      const uuid = uuidv4();
      const imageDir = path.join(IMAGES_DIR, FOLDER);
      await ensureDir(imageDir);
      await fs.writeFile(path.join(imageDir, `${uuid}.${IMAGE_EXT}`), file.buffer);

      res.status(201).json({ uuid, filename: `${uuid}.${IMAGE_EXT}`, folder: FOLDER });
    });
  }
}
