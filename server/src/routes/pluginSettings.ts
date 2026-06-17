import { Router, Request, Response } from "express";
import path from "path";
import { JOBS_DIR } from "../config/index.js";
import { readJson, writeJson, fileExists } from "../utils/fileSystem.js";
import { isValidUuid } from "../utils/validation.js";
import { send400, send404, send500 } from "../utils/errors.js";
import { log } from "../utils/logger.js";
import { Job } from "../types/index.js";

export function createPluginSettingsRouter(): Router {
  const router = Router();

  // GET /api/plugins/settings/get?jobId=<uuid>&plugin=<name>
  router.get("/settings/get", async (req: Request, res: Response) => {
    const { jobId, plugin } = req.query;

    if (typeof jobId !== "string" || !isValidUuid(jobId)) {
      send400(res, "jobId must be a valid UUID");
      return;
    }
    if (typeof plugin !== "string" || !plugin) {
      send400(res, "plugin query param is required");
      return;
    }

    try {
      const jobPath = path.join(JOBS_DIR, `${jobId}.json`);
      if (!(await fileExists(jobPath))) {
        send404(res, jobId);
        return;
      }

      const job = await readJson<Job>(jobPath);
      const settings = job.settings?.[plugin] ?? {};
      log.debug("plugin-settings", `GET settings for job ${jobId}, plugin "${plugin}"`);
      res.json(settings);
    } catch (err) {
      send500(res, err);
    }
  });

  // POST /api/plugins/settings/set
  // body: { jobId: string, plugin: string, settings: Record<string, unknown> }
  router.post("/settings/set", async (req: Request, res: Response) => {
    const body = req.body as { jobId?: unknown; plugin?: unknown; settings?: unknown };

    const jobId = body.jobId;
    const plugin = body.plugin;
    const incoming = body.settings;

    if (typeof jobId !== "string" || !isValidUuid(jobId)) {
      send400(res, "jobId must be a valid UUID");
      return;
    }
    if (typeof plugin !== "string" || !plugin) {
      send400(res, "plugin is required");
      return;
    }
    if (typeof incoming !== "object" || incoming === null || Array.isArray(incoming)) {
      send400(res, "settings must be a JSON object");
      return;
    }

    try {
      const jobPath = path.join(JOBS_DIR, `${jobId}.json`);
      if (!(await fileExists(jobPath))) {
        send404(res, jobId);
        return;
      }

      const job = await readJson<Job>(jobPath);
      const merged = {
        ...(job.settings?.[plugin] ?? {}),
        ...(incoming as Record<string, unknown>),
      };

      const updatedJob: Job = {
        ...job,
        settings: {
          ...(job.settings ?? {}),
          [plugin]: merged,
        },
      };

      await writeJson(jobPath, updatedJob);
      log.info("plugin-settings", `Saved settings for job ${jobId}, plugin "${plugin}"`);
      res.json({ success: true, settings: merged });
    } catch (err) {
      send500(res, err);
    }
  });

  return router;
}
