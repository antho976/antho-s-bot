import { env } from "@/env";
import { getClient } from "@/server/integrations/discord/client";
import { getConfig, leaderboard, listRewards } from "@/server/features/leveling/queries";
import { Leaderboard, type LeaderboardEntry } from "./components/leaderboard";
import { LevelingSettings } from "./components/leveling-settings";
import { RewardsManager } from "./components/rewards-manager";

export const dynamic = "force-dynamic";

export default async function LevelingPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, rows, rewards] = await Promise.all([
    getConfig(guildId),
    leaderboard(guildId, 25),
    listRewards(guildId),
  ]);

  // Best-effort display names from the gateway cache (no extra API calls).
  const guild = getClient()?.guilds.cache.get(guildId);
  const entries: LeaderboardEntry[] = rows.map((r) => ({
    userId: r.userId,
    name: guild?.members.cache.get(r.userId)?.displayName ?? r.userId,
    level: r.level,
    xp: r.xp,
    prestige: r.prestige,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Leveling</h1>
      <p className="mt-1 text-sm text-neutral-400">
        XP from messages, voice, and reactions — with a leaderboard and role rewards.
      </p>
      <Leaderboard entries={entries} />
      <RewardsManager initial={rewards} />
      <LevelingSettings initial={config} />
    </div>
  );
}
