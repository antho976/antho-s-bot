import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { appSettings } from "@/server/db/schema";

/** Global dashboard preferences (key/value). Small surface; add keys as needed. */

export const DEFAULT_ACCENT = "#6366f1"; // indigo-500

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

/** Accent color as a hex string (e.g. "#6366f1"). Falls back to the default. */
export async function getAccent(): Promise<string> {
  return (await getSetting("accent")) ?? DEFAULT_ACCENT;
}

export async function setAccent(hex: string): Promise<void> {
  await setSetting("accent", hex);
}
