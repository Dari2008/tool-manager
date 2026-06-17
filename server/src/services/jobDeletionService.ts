import path from "path";
import fs from "fs/promises";
import {
  JOBS_DIR,
  SETTINGS_DIR,
  IMAGES_DIR,
} from "../config/index.js";
import { log } from "../utils/logger.js";
import {
  readJson,
  fileExists,
  listFiles,
  deleteFile,
  ensureDir,
} from "../utils/fileSystem.js";
import { isValidUuid } from "../utils/validation.js";
import { getFolderRegistry } from "../utils/folderRegistry.js";
import { Job } from "../types/index.js";

interface DeletedFile {
  originalPath: string;
  backupPath: string;
}

const BACKUP_DIR = path.join(process.cwd(), ".delete-backups");

async function backupFile(filePath: string): Promise<DeletedFile | null> {
  if (!(await fileExists(filePath))) return null;
  await ensureDir(BACKUP_DIR);
  const backupPath = path.join(BACKUP_DIR, `${Date.now()}-${path.basename(filePath)}`);
  await fs.copyFile(filePath, backupPath);
  return { originalPath: filePath, backupPath };
}

async function restoreBackups(backups: DeletedFile[]): Promise<void> {
  for (const b of backups) {
    try {
      await fs.copyFile(b.backupPath, b.originalPath);
      log.info("rollback", `Restored ${path.basename(b.originalPath)}`);
    } catch (err) {
      log.error("rollback", `Failed to restore ${b.originalPath}`, err);
    }
  }
}

async function cleanupBackups(backups: DeletedFile[]): Promise<void> {
  for (const b of backups) {
    try {
      await deleteFile(b.backupPath);
    } catch {
      // Non-critical; backup cleanup failure is acceptable
    }
  }
}

async function resolveImageFile(
  folder: string,
  uuid: string
): Promise<string | null> {
  const imageDir = path.join(IMAGES_DIR, folder);
  const files = await listFiles(imageDir);
  const match = files.find((f) => f.startsWith(uuid + "."));
  return match ? path.join(imageDir, match) : null;
}

export async function deleteJobCascade(uuid: string): Promise<void> {
  if (!isValidUuid(uuid)) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }

  const jobFilePath = path.join(JOBS_DIR, `${uuid}.json`);
  if (!(await fileExists(jobFilePath))) {
    throw new Error(`Job not found: ${uuid}`);
  }

  const job = await readJson<Job>(jobFilePath);
  const registry = getFolderRegistry();
  const backups: DeletedFile[] = [];
  const filesToDelete: string[] = [];

  // Collect job file itself
  filesToDelete.push(jobFilePath);

  // Collect output settings files and output images tracked in job.outputs
  if (Array.isArray(job.outputs)) {
    for (const outputUuid of job.outputs) {
      if (typeof outputUuid !== "string" || !isValidUuid(outputUuid)) continue;
      const settingPath = path.join(SETTINGS_DIR, `${outputUuid}.json`);
      if (await fileExists(settingPath)) filesToDelete.push(settingPath);
      for (const folder of registry.imagesFolders) {
        const resolved = await resolveImageFile(folder, outputUuid);
        if (resolved) filesToDelete.push(resolved);
      }
    }
  }

  // Collect raw image files (rawImage entries are URLs, extract the UUID suffix)
  if (Array.isArray(job.rawImage)) {
    for (const rawUrl of job.rawImage) {
      if (typeof rawUrl !== "string") continue;
      const rawUuid = rawUrl.split("/").pop() ?? "";
      if (!isValidUuid(rawUuid)) continue;
      for (const folder of registry.imagesFolders) {
        const resolved = await resolveImageFile(folder, rawUuid);
        if (resolved) filesToDelete.push(resolved);
      }
    }
  }

  // Deduplicate
  const uniquePaths = Array.from(new Set(filesToDelete));

  // Backup all files before deletion
  for (const p of uniquePaths) {
    const backup = await backupFile(p);
    if (backup) backups.push(backup);
  }

  log.info("job-delete", `Deleting job ${uuid} — ${uniquePaths.length} file(s) queued`);

  // Attempt deletion
  try {
    for (const p of uniquePaths) {
      await deleteFile(p);
      log.debug("job-delete", `Deleted ${path.basename(p)}`);
    }
    log.info("job-delete", `Job ${uuid} and all references deleted successfully`);
  } catch (err) {
    log.error("job-delete", `Deletion failed — rolling back ${backups.length} file(s)`, err);
    await restoreBackups(backups);
    throw new Error(`Deletion failed and was rolled back: ${(err as Error).message}`);
  }

  await cleanupBackups(backups);
}
