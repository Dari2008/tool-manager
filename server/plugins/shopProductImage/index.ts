import { Request, Express } from "express";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import os from "os";
import { fileURLToPath } from "url";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  ProcessPlugin,
  SettingEntry,
  ListItem,
  GalleryItem,
  GlobalSettingField,
  Job,
} from "../../src/types/index.js";
import { SETTINGS_DIR, IMAGES_DIR, JOBS_DIR } from "../../src/config/index.js";
import { getPluginConfig } from "../../src/services/pluginConfigService.js";
import {
  readJson,
  writeJson,
  listJsonFiles,
  fileExists,
  ensureDir,
  listFiles,
  deleteFile,
} from "../../src/utils/fileSystem.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FOLDER = "shopProductImage";
const BLEND_RENDER_PY = path.join(__dirname, "blenderRender.py");
const ADD_MAGNIFYERS_PY = path.join(__dirname, "addMagnifyers.py");

const upload = multer({ storage: multer.memoryStorage() });

function runScript(
  python: string,
  args: string[],
  cwd: string,
  onLine: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(python, args, { cwd });
    let buffer = "";

    const handleChunk = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) onLine(line);
      }
    };

    proc.stdout.on("data", handleChunk);
    proc.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
    proc.on("close", (code) => {
      if (buffer.trim()) onLine(buffer);
      if (code !== 0) reject(new Error(`Process exited with code ${code}`));
      else resolve();
    });
    proc.on("error", reject);
  });
}

export default class ShopProductImagePlugin implements ProcessPlugin {
  folder = FOLDER;
  name = "Shop Product Image Generator";
  hasSidebar = true;
  canReceiveExternalItem = true;

  globalSettingsSchema: GlobalSettingField[] = [
    {
      key: "blenderPath",
      label: "Blender executable",
      type: "string",
      description: "Full path to blender.exe",
      defaultValue:
        "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe",
    },
    {
      key: "blendFile",
      label: "Blend file (.blend)",
      type: "string",
      description: "Full path to the .blend scene file to render",
      defaultValue: "",
    },
    {
      key: "pythonPath",
      label: "Python executable",
      type: "string",
      description:
        "Python 3 with Pillow installed (e.g. RenderTool\\.venv\\Scripts\\python.exe)",
      defaultValue: "",
    },
    {
      key: "materialName",
      label: "Material name",
      type: "string",
      description: "Name of the Blender material whose image texture to swap",
      defaultValue: "Image",
    },
    {
      key: "nodeName",
      label: "Node name",
      type: "string",
      description: "Name of the image texture node inside that material",
      defaultValue: "Image",
    },
  ];

  async getAll(req: Request): Promise<SettingEntry[]> {
    const legacyDir = path.join(SETTINGS_DIR, FOLDER);

    // New format (flat SETTINGS_DIR): file has settings[FOLDER] as an object
    const newUuids = await listJsonFiles(SETTINGS_DIR);
    const newRaw   = await Promise.all(
      newUuids.map((uuid) => readJson<Record<string, unknown>>(path.join(SETTINGS_DIR, `${uuid}.json`)))
    );
    const fromNew: SettingEntry[] = newRaw
      .filter((e) => typeof (e.settings as Record<string, unknown>)?.[FOLDER] === "object")
      .map((e) => ({
        id: e.id as string,
        image: Array.isArray(e.image) ? (e.image as string[]) : [],
        settings: (e.settings as Record<string, Record<string, unknown>>)[FOLDER],
      }));

    // Legacy format (SETTINGS_DIR/FOLDER subfolder): settings is the flat plugin data
    const legacyUuids = await listJsonFiles(legacyDir);
    const legacyRaw   = await Promise.all(
      legacyUuids.map((uuid) => readJson<Record<string, unknown>>(path.join(legacyDir, `${uuid}.json`)))
    );
    const seenIds = new Set(fromNew.map((e) => e.id));
    const fromLegacy: SettingEntry[] = legacyRaw
      .filter((e) => typeof e.settings === "object" && e.settings !== null && !seenIds.has(e.id as string))
      .map((e) => ({
        id: e.id as string,
        image: Array.isArray(e.image) ? (e.image as string[]) : [],
        settings: e.settings as Record<string, unknown>,
      }));

    const entries = [...fromNew, ...fromLegacy];
    const filters = Object.entries(req.query);
    if (filters.length === 0) return entries;
    return entries.filter((e) => {
      if (!e.settings || typeof e.settings !== "object") return false;
      return filters.every(([k, v]) => {
        const val = (e.settings as Record<string, unknown>)[k];
        return String(val) === String(v);
      });
    });
  }

  async getOne(_req: Request, uuid: string): Promise<SettingEntry | null> {
    // New flat location: must have settings[FOLDER]
    const newPath = path.join(SETTINGS_DIR, `${uuid}.json`);
    if (await fileExists(newPath)) {
      const raw = await readJson<Record<string, unknown>>(newPath);
      const nested = (raw.settings as Record<string, unknown>)?.[FOLDER];
      if (nested && typeof nested === "object") {
        return {
          id: raw.id as string,
          image: Array.isArray(raw.image) ? (raw.image as string[]) : [],
          settings: nested as Record<string, unknown>,
        };
      }
    }
    // Legacy subfolder: settings is directly the plugin data
    const legacyPath = path.join(SETTINGS_DIR, FOLDER, `${uuid}.json`);
    if (!(await fileExists(legacyPath))) return null;
    const raw = await readJson<Record<string, unknown>>(legacyPath);
    if (!raw.settings || typeof raw.settings !== "object") return null;
    return {
      id: raw.id as string,
      image: Array.isArray(raw.image) ? (raw.image as string[]) : [],
      settings: raw.settings as Record<string, unknown>,
    };
  }

  async create(_req: Request, body: unknown): Promise<{ uuid: string; data: SettingEntry }> {
    const uuid = uuidv4();
    await ensureDir(SETTINGS_DIR);
    const b = (body as Record<string, unknown>) ?? {};
    const pluginSettings = (b.settings ?? {}) as Record<string, unknown>;
    const data: SettingEntry = {
      id: uuid,
      image: Array.isArray(b.image) ? (b.image as string[]) : [],
      settings: pluginSettings,
    };
    await writeJson(path.join(SETTINGS_DIR, `${uuid}.json`), {
      id: uuid,
      image: data.image,
      settings: { [FOLDER]: pluginSettings },
    });
    return { uuid, data };
  }

  async update(_req: Request, uuid: string, body: unknown): Promise<SettingEntry | null> {
    const p = path.join(SETTINGS_DIR, `${uuid}.json`);
    if (!(await fileExists(p))) return null;
    const stored = await readJson<Record<string, unknown>>(p);
    const b = (body as Record<string, unknown>) ?? {};
    const pluginSettings = (b.settings ?? {}) as Record<string, unknown>;
    const updatedStored = {
      ...stored,
      ...(b.image ? { image: b.image } : {}),
      id: uuid,
      settings: {
        ...((stored.settings ?? {}) as Record<string, unknown>),
        [FOLDER]: pluginSettings,
      },
    };
    await writeJson(p, updatedStored);
    return {
      id: uuid,
      image: Array.isArray(updatedStored.image) ? (updatedStored.image as string[]) : [],
      settings: pluginSettings,
    };
  }

  // Sidebar shows RAW images as source material
  async getListItems(_req: Request): Promise<ListItem[]> {
    const rawDir = path.join(IMAGES_DIR, "raw");
    const files = await listFiles(rawDir);
    return files
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map((f) => {
        const uuid = path.basename(f, path.extname(f));
        return {
          uuid,
          type: "image",
          label: uuid.slice(0, 8),
          url: `/api/images/raw/${uuid}`,
          thumbnail: `/api/images/raw/${uuid}`,
        };
      });
  }

  // Gallery shows generated output images
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
    // New flat location: remove plugin key; delete file if no other keys remain
    const newPath = path.join(SETTINGS_DIR, `${uuid}.json`);
    if (await fileExists(newPath)) {
      const stored = await readJson<Record<string, unknown>>(newPath);
      const settings = (stored.settings ?? {}) as Record<string, unknown>;
      const { [FOLDER]: _removed, ...remaining } = settings;
      if (Object.keys(remaining).length === 0) {
        await deleteFile(newPath);
      } else {
        await writeJson(newPath, { ...stored, settings: remaining });
      }
    }
    // Legacy subfolder: delete the whole file
    const legacyPath = path.join(SETTINGS_DIR, FOLDER, `${uuid}.json`);
    if (await fileExists(legacyPath)) await deleteFile(legacyPath);

    // Delete the output image
    const imageDir = path.join(IMAGES_DIR, FOLDER);
    const files = await listFiles(imageDir);
    const imageFile = files.find((f) => f.startsWith(uuid + "."));
    if (imageFile) await deleteFile(path.join(imageDir, imageFile));
  }

  registerRoutes(app: Express): void {
    // POST /api/shopProductImage/generate — run full render pipeline, stream progress
    app.post("/api/shopProductImage/generate", async (req, res) => {
      const body = req.body as {
        jobId: string;
        seed?: string;
        numPoints?: number;
        circleZoomFactor?: number;
        circleBorderWidth?: number;
        badgeDiameter?: number;
        badgeDiameterCutouts?: number;
        circleBorderColor?: string;
        badgeFillColor?: string;
        badgeTextColor?: string;
        existingOutputUuid?: string;
        rawImageUrl?: string;
      };

      if (!body.jobId) {
        res.status(400).json({ error: "BadRequest", message: "jobId required" });
        return;
      }

      const { globalSettings } = await getPluginConfig(FOLDER);
      const blenderPath = (globalSettings.blenderPath as string) ?? "";
      const blendFile   = (globalSettings.blendFile   as string) ?? "";
      const pythonPath  = (globalSettings.pythonPath  as string) || "python";
      const materialName = (globalSettings.materialName as string) || "Image";
      const nodeName     = (globalSettings.nodeName    as string) || "Image";

      if (!blenderPath || !blendFile) {
        res.status(400).json({
          error: "BadRequest",
          message: "Configure blenderPath and blendFile in Plugins → Shop Product Image Generator → Settings first",
        });
        return;
      }

      // Look up job to find raw source image
      const jobPath = path.join(JOBS_DIR, `${body.jobId}.json`);
      if (!(await fileExists(jobPath))) {
        res.status(404).json({ error: "NotFound", message: "Job not found" });
        return;
      }
      const job = await readJson<Job>(jobPath);
      const rawImageUrl = body.rawImageUrl ?? job.rawImage?.[0];
      if (!rawImageUrl) {
        res.status(400).json({ error: "BadRequest", message: "Job has no rawImage and no rawImageUrl provided" });
        return;
      }

      // Resolve raw image URL to filesystem path
      const rawUrlParts = rawImageUrl.split("/");
      const rawUuid = rawUrlParts[rawUrlParts.length - 1];
      const rawDir = path.join(IMAGES_DIR, "raw");
      const rawFiles = await listFiles(rawDir);
      const rawFilename = rawFiles.find((f) => f.startsWith(rawUuid + "."));
      if (!rawFilename) {
        res.status(404).json({ error: "NotFound", message: "Raw image file not found" });
        return;
      }
      const rawImagePath = path.join(rawDir, rawFilename);

      // Start NDJSON stream
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.flushHeaders();

      const emit = (data: object) => {
        try { res.write(JSON.stringify(data) + "\n"); } catch { /* client disconnected */ }
      };

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "spi-"));
      const renderedPath = path.join(tmpDir, "rendered.png");

      try {
        // ── Stage 1: Blender render ──────────────────────────────
        emit({ stage: "start", pipelineStage: "blender", message: "Starting Blender render…", current: 0, total: 6 });

        await runScript(
          pythonPath,
          [
            BLEND_RENDER_PY,
            "--blender-path", blenderPath,
            "--blend-file",   blendFile,
            "--source",       rawImagePath,
            "--output",       renderedPath,
            "--material-name", materialName,
            "--node-name",     nodeName,
            "--report-progress",
          ],
          __dirname,
          (line) => {
            try {
              const p = JSON.parse(line) as { current?: number; total?: number; stage?: string; message?: string };
              emit({
                ...p,
                pipelineStage: "blender",
                // Map blender progress (0–3) into first half (0–3 of 6)
                current: p.current ?? 0,
                total: (p.total ?? 3) * 2,
              });
            } catch {
              emit({ stage: "log", pipelineStage: "blender", message: line });
            }
          }
        );

        // ── Stage 2: Add magnifiers ──────────────────────────────
        emit({ stage: "start", pipelineStage: "magnifyers", message: "Adding magnifiers…", current: 3, total: 6 });

        const outputUuid = body.existingOutputUuid ?? uuidv4();
        const outputDir  = path.join(IMAGES_DIR, FOLDER);
        await ensureDir(outputDir);
        const outputPath = path.join(outputDir, `${outputUuid}.png`);

        const magnifyArgs = [
          ADD_MAGNIFYERS_PY,
          "--scene",  renderedPath,
          "--source", rawImagePath,
          "--output", outputPath,
          "--report-progress",
        ];
        if (body.numPoints        != null) magnifyArgs.push("--num-points",            String(body.numPoints));
        if (body.circleZoomFactor != null) magnifyArgs.push("--circle-zoom-factor",    String(body.circleZoomFactor));
        if (body.circleBorderWidth != null) magnifyArgs.push("--circle-border-width",  String(body.circleBorderWidth));
        if (body.circleBorderColor)         magnifyArgs.push("--circle-border-color",  body.circleBorderColor);
        if (body.badgeDiameter     != null) magnifyArgs.push("--badge-diameter",       String(body.badgeDiameter));
        if (body.badgeDiameterCutouts != null) magnifyArgs.push("--badge-diameter-cutouts", String(body.badgeDiameterCutouts));
        if (body.badgeFillColor)            magnifyArgs.push("--badge-fill-color",     body.badgeFillColor);
        if (body.badgeTextColor)            magnifyArgs.push("--badge-text-color",     body.badgeTextColor);
        if (body.seed != null && body.seed !== "") magnifyArgs.push("--seed", String(body.seed));

        const numPts = body.numPoints ?? 4;

        await runScript(pythonPath, magnifyArgs, __dirname, (line) => {
          try {
            const p = JSON.parse(line) as { current?: number; total?: number; stage?: string; message?: string };
            emit({
              ...p,
              pipelineStage: "magnifyers",
              // Map magnifyer progress (0–numPts) into second half (3–6 of 6)
              current: 3 + (p.current ?? 0),
              total: numPts * 2,
            });
          } catch {
            emit({ stage: "log", pipelineStage: "magnifyers", message: line });
          }
        });

        // ── Save settings entry ──────────────────────────────────
        await ensureDir(SETTINGS_DIR);
        const settingPath = path.join(SETTINGS_DIR, `${outputUuid}.json`);
        const existingStored = (await fileExists(settingPath))
          ? await readJson<Record<string, unknown>>(settingPath)
          : null;
        await writeJson(settingPath, {
          ...(existingStored ?? {}),
          id: outputUuid,
          image: [`${outputUuid}.png`],
          settings: {
            ...((existingStored?.settings ?? {}) as Record<string, unknown>),
            [FOLDER]: {
              jobId:                body.jobId,
              rawImage:             rawImageUrl,
              activeUrl:            rawImageUrl,
              activeUuid:           rawUuid,
              numPoints:            body.numPoints,
              circleZoomFactor:     body.circleZoomFactor,
              circleBorderWidth:    body.circleBorderWidth,
              badgeDiameter:        body.badgeDiameter,
              badgeDiameterCutouts: body.badgeDiameterCutouts,
              circleBorderColor:    body.circleBorderColor,
              badgeFillColor:       body.badgeFillColor,
              badgeTextColor:       body.badgeTextColor,
              seed:                 body.seed,
            },
          },
        });

        // ── Record output in job ─────────────────────────────────
        const currentJob = await readJson<Job>(jobPath);
        const existingOutputs = Array.isArray(currentJob.outputs) ? currentJob.outputs : [];
        const existingRaw     = Array.isArray(currentJob.rawImage) ? currentJob.rawImage : [];
        await writeJson(jobPath, {
          ...currentJob,
          rawImage: [...new Set(existingRaw)],
          outputs:  [...new Set([...existingOutputs, outputUuid])],
        });

        emit({
          stage: "complete",
          current: 6,
          total: 6,
          outputUrl: `/api/images/${FOLDER}/${outputUuid}`,
          uuid: outputUuid,
          name: `${outputUuid}.png`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        emit({ stage: "error", message });
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
        res.end();
      }
    });

    // POST /api/shopProductImage/upload — upload a raw image into the raw folder
    app.post(
      "/api/shopProductImage/upload",
      upload.single("image"),
      async (req, res) => {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "BadRequest", message: "No image file provided", statusCode: 400 });
          return;
        }

        const uuid = uuidv4();
        const imageDir = path.join(IMAGES_DIR, FOLDER);
        await ensureDir(imageDir);
        await fs.writeFile(path.join(imageDir, `${uuid}.jpg`), file.buffer);

        const settingDir = path.join(SETTINGS_DIR, FOLDER);
        await ensureDir(settingDir);
        const settingData: SettingEntry = {
          id: uuid,
          image: [`${uuid}.jpg`],
          settings: req.body as Record<string, unknown>,
        };
        await writeJson(path.join(settingDir, `${uuid}.json`), settingData);

        res.status(201).json({ uuid, filename: `${uuid}.jpg`, folder: FOLDER });
      }
    );
  }
}
