import type { LevelingStats } from "@/server/features/leveling/queries";
import { fmtMinutes } from "@/server/features/leveling/domain/format";
import { StatTile } from "@/app/dashboard/_components/ui/stat-tile";

/** Guild-wide leveling totals shown above the leaderboard. */
export function AtAGlance({ stats }: { stats: LevelingStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Ranked members" value={stats.members.toLocaleString()} />
      <StatTile label="Total XP" value={stats.totalXp.toLocaleString()} />
      <StatTile label="Messages" value={stats.totalMessages.toLocaleString()} />
      <StatTile label="Voice time" value={fmtMinutes(stats.totalVoice)} />
      <StatTile label="Highest level" value={stats.topLevel.toLocaleString()} />
    </div>
  );
}
