import { Router, Request, Response } from "express";
import path from "path";
import { DATA_DIR } from "../config/index.js";
import { getAllEntries, getEntry, createEntry, updateEntry } from "../services/crudService.js";
import { fileExists, deleteFile, ensureDir } from "../utils/fileSystem.js";
import { isValidUuid } from "../utils/validation.js";
import { send400, send404, send500 } from "../utils/errors.js";

const WF_DIR = path.join(DATA_DIR, "workflows");

export function createWorkflowsRouter(): Router {
  const router = Router();

  // GET /api/workflows
  router.get("/", async (_req: Request, res: Response) => {
    try {
      await ensureDir(WF_DIR);
      const entries = await getAllEntries(DATA_DIR, "workflows") as { id: string; name: string }[];
      res.json(entries.map(e => ({ id: e.id, name: e.name ?? "Unnamed" })));
    } catch (err) { send500(res, err); }
  });

  // GET /api/workflows/:id
  router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidUuid(id)) { send400(res, "Invalid UUID"); return; }
    try {
      const entry = await getEntry(DATA_DIR, "workflows", id);
      if (!entry) { send404(res, id); return; }
      res.json(entry);
    } catch (err) { send500(res, err); }
  });

  // POST /api/workflows
  router.post("/", async (req: Request, res: Response) => {
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== "string") { send400(res, "name is required"); return; }
    try {
      await ensureDir(WF_DIR);
      const { data } = await createEntry(DATA_DIR, "workflows", { name: name.trim(), drawflow: null });
      res.status(201).json(data);
    } catch (err) { send500(res, err); }
  });

  // PUT /api/workflows/:id  (save drawflow data)
  router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidUuid(id)) { send400(res, "Invalid UUID"); return; }
    try {
      const existing = await getEntry(DATA_DIR, "workflows", id) as { name?: string } | null;
      if (!existing) { send404(res, id); return; }
      const updated = { ...existing, ...(req.body as object), id };
      await updateEntry(DATA_DIR, "workflows", id, updated);
      res.json(updated);
    } catch (err) { send500(res, err); }
  });

  // PATCH /api/workflows/:id  (rename)
  router.patch("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body as { name?: string };
    if (!isValidUuid(id)) { send400(res, "Invalid UUID"); return; }
    if (!name || typeof name !== "string") { send400(res, "name is required"); return; }
    try {
      const existing = await getEntry(DATA_DIR, "workflows", id) as object | null;
      if (!existing) { send404(res, id); return; }
      const updated = { ...existing, name: name.trim() };
      await updateEntry(DATA_DIR, "workflows", id, updated);
      res.json(updated);
    } catch (err) { send500(res, err); }
  });

  // DELETE /api/workflows/:id
  router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidUuid(id)) { send400(res, "Invalid UUID"); return; }
    try {
      const filePath = path.join(WF_DIR, `${id}.json`);
      if (!(await fileExists(filePath))) { send404(res, id); return; }
      await deleteFile(filePath);
      res.status(204).send();
    } catch (err) { send500(res, err); }
  });

  return router;
}
