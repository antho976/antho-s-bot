import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { env } from "@/env";
import { logger } from "@/server/core/logger";

const NAME_RE = /^[\w.-]+\.db$/;

function dbPath(): string {
  return env.DATABASE_URL.replace(/^file:/, "");
}

function backupsDir(): string {
  const dir = join(dirname(dbPath()), "backups");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export interface BackupInfo {
  name: string;
  size: number;
  createdAt: number;
}

/** Snapshot the SQLite DB: checkpoint the WAL into the main file, then copy it. */
export async function createBackup(): Promise<string> {
  const name = `bot-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  try {
    await db.run(sql.raw("PRAGMA wal_checkpoint(TRUNCATE)"));
  } catch {
    // not all builds expose PRAGMA via run(); the copy below is still usable
  }
  copyFileSync(dbPath(), join(backupsDir(), name));
  logger.info("backups", `Created backup ${name}`);
  return name;
}

export function listBackups(): BackupInfo[] {
  const dir = backupsDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const s = statSync(join(dir, f));
      return { name: f, size: s.size, createdAt: s.mtimeMs };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function readBackup(name: string): Buffer | null {
  if (!NAME_RE.test(name)) return null;
  try {
    return readFileSync(join(backupsDir(), name));
  } catch {
    return null;
  }
}
