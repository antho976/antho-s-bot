import { logger } from "@/server/core/logger";
import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { parseRoleLevel } from "./domain/role-level";
import { addReward, listRewards } from "./queries";

export interface RewardSyncResult {
  ok: boolean;
  reason?: string; // why it stopped, or the "nothing matched" note
  matched: number; // roles whose name names a level (e.g. "Lv 75")
  added: number; // new level → role rewards created
  skipped: number; // level already had a reward — left untouched
}

const empty = { matched: 0, added: 0, skipped: 0 };

/**
 * Scan the guild's roles and turn any named like "Level 40" / "Lv 75" into a level reward, so
 * reaching that level grants the role. Reuses parseRoleLevel — the same matcher the level→role
 * seeding uses. Non-destructive: a level that already has a reward is left alone (so manual
 * mappings and duplicate-level roles never clobber each other; the higher role wins ties).
 * Costs a single roles.fetch() — no per-role REST calls.
 */
export async function syncRewardsFromRoles(guildId: string): Promise<RewardSyncResult> {
  const client = getClient();
  if (!client) return { ok: false, reason: "Bot is not connected.", ...empty };

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, reason: "Guild not found.", ...empty };

  await guild.roles.fetch().catch(() => null);

  const taken = new Set((await listRewards(guildId)).map((r) => r.level));
  const res: RewardSyncResult = { ok: true, ...empty };

  // Highest role first so a duplicate-level tie resolves to the more "senior" role.
  const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
  for (const role of roles) {
    if (role.id === guild.id || role.managed) continue; // skip @everyone and integration roles
    const level = parseRoleLevel(role.name);
    if (level === null) continue;
    res.matched++;

    if (taken.has(level)) {
      res.skipped++;
      continue;
    }
    await addReward(guildId, level, role.id);
    taken.add(level);
    res.added++;
  }

  if (res.matched === 0) {
    return { ok: true, reason: 'No roles look like level roles (e.g. "Level 40" or "Lv 75").', ...empty };
  }

  await track(guildId, "level.reward_sync", { matched: res.matched, added: res.added });
  logger.info(
    "leveling",
    `Reward-sync: ${res.added} added, ${res.skipped} skipped of ${res.matched} level roles.`,
  );
  return res;
}

/**
 * Map a single role to a level reward from its name — used by the live role create/rename
 * listeners so new level roles register without a manual scan. Non-destructive: a level that
 * already has a reward is left alone. Returns the level it mapped to, or null when the name
 * isn't a level role (or that level is already rewarded).
 */
export async function syncRewardForRole(
  guildId: string,
  roleId: string,
  roleName: string,
): Promise<number | null> {
  const level = parseRoleLevel(roleName);
  if (level === null) return null;
  const exists = (await listRewards(guildId)).some((r) => r.level === level);
  if (exists) return null; // a reward for this level already exists — don't clobber it
  await addReward(guildId, level, roleId);
  logger.info("leveling", `Auto-mapped role "${roleName}" → level ${level} reward.`);
  return level;
}
