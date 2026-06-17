import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  readJson,
  writeJson,
  listJsonFiles,
  fileExists,
  deleteFile,
  ensureDir,
} from "../utils/fileSystem.js";
import { isValidUuid } from "../utils/validation.js";

export function folderPath(baseDir: string, folder: string): string {
  return path.join(baseDir, folder);
}

export function entryPath(baseDir: string, folder: string, uuid: string): string {
  return path.join(baseDir, folder, `${uuid}.json`);
}

export async function getAllEntries(baseDir: string, folder: string): Promise<unknown[]> {
  const dir = folderPath(baseDir, folder);
  const uuids = await listJsonFiles(dir);
  const entries = await Promise.all(
    uuids.map((uuid) => readJson<unknown>(entryPath(baseDir, folder, uuid)))
  );
  return entries;
}

export async function getEntry(
  baseDir: string,
  folder: string,
  uuid: string
): Promise<unknown | null> {
  if (!isValidUuid(uuid)) return null;
  const p = entryPath(baseDir, folder, uuid);
  if (!(await fileExists(p))) return null;
  return readJson<unknown>(p);
}

export async function createEntry(
  baseDir: string,
  folder: string,
  body: unknown
): Promise<{ uuid: string; data: unknown }> {
  const uuid = uuidv4();
  const dir = folderPath(baseDir, folder);
  await ensureDir(dir);
  const data = { id: uuid, ...(body as object) };
  await writeJson(entryPath(baseDir, folder, uuid), data);
  return { uuid, data };
}

export async function updateEntry(
  baseDir: string,
  folder: string,
  uuid: string,
  body: unknown
): Promise<unknown | null> {
  if (!isValidUuid(uuid)) return null;
  const p = entryPath(baseDir, folder, uuid);
  if (!(await fileExists(p))) return null;
  const existing = await readJson<Record<string, unknown>>(p);
  const updated = { ...existing, ...(body as object), id: uuid };
  await writeJson(p, updated);
  return updated;
}

export async function deleteEntry(
  baseDir: string,
  folder: string,
  uuid: string
): Promise<boolean> {
  if (!isValidUuid(uuid)) return false;
  const p = entryPath(baseDir, folder, uuid);
  if (!(await fileExists(p))) return false;
  await deleteFile(p);
  return true;
}
