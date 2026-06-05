import { env } from "@/env";
import { getClient } from "@/server/integrations/discord/client";
import {
  getConfig,
  leaderboard,
  levelingStats,
  listRewards,
} from "@/server/features/leveling/queries";
import { PageHeader } from "../_components/ui/page-header";
import { Tabs, type TabItem } from "../_components/ui/tabs";
import { Leaderboard, type LeaderboardEntry } from "./components/leaderboard";
import { AtAGlance } from "./components/at-a-glance";
import { LevelingSettings } from "./components/leveling-settings";
import { RewardsManager } from "./components/rewards-manager";
import { RoleLevelSync } from "./components/role-level-sync";

export const dynamic = "force-dynamic";

export default async function LevelingPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, rows, rewards, stats] = await Promise.all([
    getConfig(guildId),
    leaderboard(guildId, 25),
    listRewards(guildId),
    levelingStats(guildId),
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

  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Leaderboard",
      content: (
        <div className="space-y-8">
          <AtAGlance stats={stats} />
          <Leaderboard entries={entries} />
        </div>
      ),
    },
    {
      id: "config",
      label: "Config",
      content: (
        <div className="space-y-10">
          <LevelingSettings initial={config} />
          <RoleLevelSync />
        </div>
      ),
    },
    {
      id: "rewards",
      label: "Rewards",
      content: <RewardsManager initial={rewards} />,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Leveling"
        description="XP from messages, voice, and reactions — with a leaderboard and role rewards."
      />
      <Tabs items={tabs} />
    </div>
  );
}
