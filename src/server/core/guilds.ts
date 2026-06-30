import { env } from "@/env";

/**
 * The Discord servers this bot serves.
 *
 * `DISCORD_GUILD_IDS` is a comma-separated list; we fall back to the legacy single
 * `DISCORD_GUILD_ID` so existing single-server deploys keep working untouched. The first id is the
 * **primary** guild — full feature set and the dashboard's default scope. Order is preserved and
 * duplicates are dropped. When nothing is configured we use the sentinel `"default"` (the same
 * bucket the old code wrote to), so a fresh install still functions.
 */
export const GUILD_IDS: string[] = (() => {
  const raw = env.DISCORD_GUILD_IDS ?? env.DISCORD_GUILD_ID ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  return ids.length ? ids : ["default"];
})();

/** The primary guild — full features, and what the dashboard shows before you pick another. */
export const PRIMARY_GUILD_ID = GUILD_IDS[0];

/** True if `id` is one of the configured guilds (used to validate the dashboard's guild cookie). */
export function isKnownGuild(id: string): boolean {
  return GUILD_IDS.includes(id);
}

/**
 * Per-guild disabled features, parsed once from `DISCORD_DISABLED_FEATURES`.
 *
 * Format: `guildId:featA,featB;guildId:featC` — semicolons separate guilds, commas separate
 * feature keys. Example: `222...:ai,rpg` turns off the AI chat and the RPG on guild `222...`.
 * Feature keys match the `feature` tag on commands and the keys passed to {@link isFeatureEnabled}.
 */
const DISABLED: Record<string, Set<string>> = (() => {
  const out: Record<string, Set<string>> = {};
  for (const entry of (env.DISCORD_DISABLED_FEATURES ?? "").split(";")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const gid = trimmed.slice(0, idx).trim();
    const feats = trimmed
      .slice(idx + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (gid && feats.length) out[gid] = new Set(feats);
  }
  return out;
})();

/**
 * Whether a feature is enabled for a guild. Single source of truth that drives BOTH slash-command
 * registration (a disabled feature's commands aren't registered to that guild) and runtime gates
 * (the feature's event handlers no-op for that guild).
 */
export function isFeatureEnabled(guildId: string, feature: string): boolean {
  return !DISABLED[guildId]?.has(feature);
}

/** Features explicitly turned off for a guild — for diagnostics / dashboard display. */
export function disabledFeatures(guildId: string): string[] {
  return [...(DISABLED[guildId] ?? [])];
}
