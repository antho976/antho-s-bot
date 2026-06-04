import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "@/env";
import * as schema from "./schema";

/** For a local `file:` URL, make sure the parent directory exists. */
function ensureDir(url: string) {
  if (url.startsWith("file:")) {
    try {
      mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
    } catch {
      // ignore: already exists or not creatable here
    }
  }
}

// Keep one libsql connection across Next.js HMR reloads in dev (avoids leaking connections).
const g = globalThis as unknown as { __dbClient?: Client };

ensureDir(env.DATABASE_URL);
const client =
  g.__dbClient ??
  createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
if (process.env.NODE_ENV !== "production") g.__dbClient = client;

// On-disk SQLite tuning. WAL = writers don't block readers and writes are an append, not a
// rewrite — on a network-attached disk (Render) this cuts write latency and, more importantly,
// its variance, which is what makes interactions feel inconsistent. NORMAL trims fsyncs (safe
// under WAL); busy_timeout avoids spurious SQLITE_BUSY. No-op for a remote (Turso) URL.
if (env.DATABASE_URL.startsWith("file:")) {
  for (const pragma of ["journal_mode=WAL", "synchronous=NORMAL", "busy_timeout=5000"]) {
    client.execute(`PRAGMA ${pragma}`).catch(() => {});
  }
}

export const db = drizzle(client, { schema });
export { schema };
