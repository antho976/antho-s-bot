import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { honeypotActions, honeypotConfig } from "@/server/db/schema";

type ConfigRow = typeof honeypotConfig.$inferSelect;

/** Config with the two JSON list columns parsed into `string[]`. */
export interface HoneypotConfig extends Omit<ConfigRow, "channelIds" | "exemptRoleIds"> {
  channelIds: string[];
  exemptRoleIds: string[];
}

function parseIds(json: string | null): string[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function hydrate(row: ConfigRow): HoneypotConfig {
  return {
    ...row,
    channelIds: parseIds(row.channelIds),
    exemptRoleIds: parseIds(row.exemptRoleIds),
  };
}

export function defaultConfig(guildId: string): HoneypotConfig {
  return {
    guildId,
    enabled: false,
    channelIds: [],
    muteMode: "role",
    muteRoleId: null,
    timeoutMinutes: 40320,
    purgeLookbackMinutes: 10,
    pingTargetType: "user",
    pingTargetId: null,
    alertChannelId: null,
    exemptRoleIds: [],
    alsoBan: false,
    dmUser: false,
    dmMessage: null,
    updatedAt: null,
  };
}

export async function getConfig(guildId: string): Promise<HoneypotConfig> {
  const rows = await db
    .select()
    .from(honeypotConfig)
    .where(eq(honeypotConfig.guildId, guildId))
    .limit(1);
  return rows[0] ? hydrate(rows[0]) : defaultConfig(guildId);
}

export interface HoneypotPatch {
  enabled?: boolean;
  channelIds?: string[];
  muteMode?: string;
  muteRoleId?: string | null;
  timeoutMinutes?: number;
  purgeLookbackMinutes?: number;
  pingTargetType?: string;
  pingTargetId?: string | null;
  alertChannelId?: string | null;
  exemptRoleIds?: string[];
  alsoBan?: boolean;
  dmUser?: boolean;
  dmMessage?: string | null;
}

export async function saveConfig(guildId: string, patch: HoneypotPatch): Promise<HoneypotConfig> {
  const set: Partial<typeof honeypotConfig.$inferInsert> = { updatedAt: new Date() };
  if (patch.enabled !== undefined) set.enabled = patch.enabled;
  if (patch.channelIds !== undefined) set.channelIds = JSON.stringify(patch.channelIds);
  if (patch.muteMode !== undefined) set.muteMode = patch.muteMode;
  if (patch.muteRoleId !== undefined) set.muteRoleId = patch.muteRoleId;
  if (patch.timeoutMinutes !== undefined) set.timeoutMinutes = patch.timeoutMinutes;
  if (patch.purgeLookbackMinutes !== undefined) set.purgeLookbackMinutes = patch.purgeLookbackMinutes;
  if (patch.pingTargetType !== undefined) set.pingTargetType = patch.pingTargetType;
  if (patch.pingTargetId !== undefined) set.pingTargetId = patch.pingTargetId;
  if (patch.alertChannelId !== undefined) set.alertChannelId = patch.alertChannelId;
  if (patch.exemptRoleIds !== undefined) set.exemptRoleIds = JSON.stringify(patch.exemptRoleIds);
  if (patch.alsoBan !== undefined) set.alsoBan = patch.alsoBan;
  if (patch.dmUser !== undefined) set.dmUser = patch.dmUser;
  if (patch.dmMessage !== undefined) set.dmMessage = patch.dmMessage;

  const rows = await db
    .insert(honeypotConfig)
    .values({ guildId, ...set })
    .onConflictDoUpdate({ target: honeypotConfig.guildId, set })
    .returning();
  return hydrate(rows[0]);
}

export async function recordAction(input: {
  guildId: string;
  userId: string | null;
  channelId: string | null;
  action: string;
  purged: number;
  snippet?: string | null;
}): Promise<void> {
  await db.insert(honeypotActions).values({
    guildId: input.guildId,
    userId: input.userId,
    channelId: input.channelId,
    action: input.action,
    purged: input.purged,
    snippet: input.snippet ?? null,
  });
}

export function recentActions(guildId: string, limit = 30) {
  return db
    .select()
    .from(honeypotActions)
    .where(eq(honeypotActions.guildId, guildId))
    .orderBy(desc(honeypotActions.createdAt))
    .limit(limit);
}
