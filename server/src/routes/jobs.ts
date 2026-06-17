import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { JOBS_DIR } from "../config/index.js";
import {
  getAllEntries,
  getEntry,
  createEntry,
  updateEntry,
} from "../services/crudService.js";
import { deleteJobCascade } from "../services/jobDeletionService.js";
import { isValidUuid } from "../utils/validation.js";
import { send400, send404, send500 } from "../utils/errors.js";
import { Job } from "../types/index.js";
import { readJson, fileExists, writeJson, ensureDir } from "../utils/fileSystem.js";

const DATA_DIR = path.resolve(JOBS_DIR, "..");

export function createJobsRouter(): Router {
  const router = Router();

  // GET /api/jobs?rawImage=<uuid>
  router.get("/", async (req: Request, res: Response) => {
    try {
      const rawImageFilter = req.query["rawImage"];

      const entries = await getAllEntries(DATA_DIR, "jobs") as Job[];

      if (typeof rawImageFilter === "string") {
        if (!isValidUuid(rawImageFilter)) {
          send400(res, "rawImage query must be a valid UUID");
          return;
        }
        const filtered = entries.filter(
          (j) => Array.isArray(j.rawImage) && j.rawImage.includes(rawImageFilter)
        );
        res.json(filtered);
        return;
      }

      res.json(entries);
    } catch (err) {
      send500(res, err);
    }
  });

  // GET /api/jobs/:uuid
  router.get("/:uuid", async (req: Request, res: Response) => {
    const { uuid } = req.params;
    if (!isValidUuid(uuid)) {
      send400(res, `Invalid UUID: ${uuid}`);
      return;
    }
    try {
      const entry = await getEntry(DATA_DIR, "jobs", uuid);
      if (!entry) {
        send404(res, uuid);
        return;
      }
      res.json(entry);
    } catch (err) {
      send500(res, err);
    }
  });

  // POST /api/jobs
  router.post("/", async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;

    if (!body || typeof body !== "object") {
      send400(res, "Request body must be a JSON object");
      return;
    }

    try {
      const { uuid, data } = await createEntry(DATA_DIR, "jobs", body);
      res.status(201).json({ uuid, data });
    } catch (err) {
      send500(res, err);
    }
  });

  // PUT /api/jobs/:uuid
  router.put("/:uuid", async (req: Request, res: Response) => {
    const { uuid } = req.params;
    if (!isValidUuid(uuid)) {
      send400(res, `Invalid UUID: ${uuid}`);
      return;
    }
    try {
      const body = req.body as Partial<Job>;
      if (Array.isArray(body.rawImage)) body.rawImage = [...new Set(body.rawImage)];
      if (Array.isArray(body.outputs))  body.outputs  = [...new Set(body.outputs)];
      const updated = await updateEntry(DATA_DIR, "jobs", uuid, body);
      if (!updated) {
        send404(res, uuid);
        return;
      }
      res.json(updated);
    } catch (err) {
      send500(res, err);
    }
  });

  // DELETE /api/jobs/:uuid  — cascade deletes all references
  router.delete("/:uuid", async (req: Request, res: Response) => {
    const { uuid } = req.params;
    if (!isValidUuid(uuid)) {
      send400(res, `Invalid UUID: ${uuid}`);
      return;
    }
    try {
      await deleteJobCascade(uuid);
      res.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not found")) {
        send404(res, uuid);
      } else {
        send500(res, err);
      }
    }
  });

  return router;
}
