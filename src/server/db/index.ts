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

export const db = drizzle(client, { schema });
export { schema };
