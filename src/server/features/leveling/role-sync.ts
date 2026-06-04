import { logger } from "@/server/core/logger";
import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { xpToReachLevel } from "./domain/curve";
import { parseRoleLevel } from "./domain/role-level";
import { getConfig, getOrCreateLevel, loadCurveMap, updateLevelRow } from "./queries";

export interface RoleSyncResult {
  ok: boolean;
  reason?: string; // why it stopped / what to fix (also used for the "nothing matched" note)
  scanned: number; // members examined
  matched: number; // members holding a level-named role
  updated: number; // members whose level we raised
  skipped: number; // matched but already at/above the role's level (left alone)
  highest: number; // highest level applied, for display
}

const empty = { scanned: 0, matched: 0, updated: 0, skipped: 0, highest: 0 };

/**
 * Read every member's roles and set their level from any role named like "Level 40".
 *
 * Rate limits: the whole scan costs ONE gateway `members.fetch()` (members arrive with their
 * roles attached) plus a one-off `roles.fetch()` — no per-member REST calls, so it stays well
 * clear of Discord's REST buckets even on large guilds. We touch no Discord state: levels are
 * written to our DB only, and only ever raised, so existing higher progress is never clobbered.
 */
export async function syncLevelsFromRoles(guildId: string): Promise<RoleSyncResult> {
  const client = getClient();
  if (!client) return { ok: false, reason: "Bot is not connected.", ...empty };

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, reason: "Guild not found.", ...empty };

  const config = await getConfig(guildId);
  const curve = {
    curveType: config.curveType,
    curveBase: config.curveBase,
    curveFactor: config.curveFactor,
  };
  const custom = config.curveType === "custom" ? await loadCurveMap(guildId) : undefined;

  // Parse each role name once into a roleId → level map (instead of re-parsing per member).
  await guild.roles.fetch().catch(() => null);
  const roleLevel = new Map<string, number>();
  for (const role of guild.roles.cache.values()) {
    const lvl = parseRoleLevel(role.name);
    if (lvl !== null) roleLevel.set(role.id, lvl);
  }
  if (roleLevel.size === 0) {
    return { ok: true, reason: 'No roles look like level roles (e.g. "Level 40").', ...empty };
  }

  const members = await guild.members.fetch().catch(() => null);
  if (!members) return { ok: false, reason: "Could not fetch members.", ...empty };

  const res: RoleSyncResult = { ok: true, ...empty };
  for (const member of members.values()) {
    if (member.user?.bot) continue;
    res.scanned++;

    // A member may hold several level roles — the highest wins.
    let target = 0;
    for (const roleId of member.roles.cache.keys()) {
      const lvl = roleLevel.get(roleId);
      if (lvl && lvl > target) target = lvl;
    }
    if (target === 0) continue;
    res.matched++;
    res.highest = Math.max(res.highest, target);

    const wantXp = xpToReachLevel(target, curve, custom);
    const row = await getOrCreateLevel(guildId, member.id);
    if (row.xp >= wantXp) {
      res.skipped++; // already at or beyond this level — don't demote them
      continue;
    }
    await updateLevelRow(row.id, { xp: wantXp, level: target });
    res.updated++;
  }

  await track(guildId, "level.role_sync", {
    scanned: res.scanned,
    matched: res.matched,
    updated: res.updated,
    skipped: res.skipped,
  });
  logger.info(
    "leveling",
    `Role-sync: ${res.updated} updated, ${res.skipped} skipped of ${res.matched} matched (${res.scanned} scanned).`,
  );
  return res;
}
