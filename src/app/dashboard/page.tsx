import { getHealth } from "@/server/core/health";
import { getOverview } from "@/server/core/overview";
import { PageHeader } from "./_components/ui/page-header";
import { StatTile } from "./_components/ui/stat-tile";
import { OverviewGrid } from "./_components/overview-grid";
import { MaintenanceActions } from "./_components/maintenance-actions";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [health, overview] = await Promise.all([getHealth(), getOverview()]);

  const stats = [
    { label: "Bot", value: health.discord.ready ? "Online" : "Offline", bad: !health.discord.ready },
    { label: "Database", value: health.db.ok ? "Connected" : "Down", bad: !health.db.ok },
    { label: "Guilds", value: health.discord.guilds ?? "—" },
    {
      label: "Gateway ping",
      value: health.discord.ping != null ? `${health.discord.ping} ms` : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Overview"
        description="Your bot at a glance — status, activity, and every module."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} tone={s.bad ? "bad" : "default"} />
        ))}
      </div>

      <OverviewGrid data={overview} />

      <MaintenanceActions />
    </div>
  );
}
