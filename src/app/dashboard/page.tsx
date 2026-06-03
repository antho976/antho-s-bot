import { getHealth } from "@/server/core/health";
import { PageHeader } from "./_components/ui/page-header";
import { StatTile } from "./_components/ui/stat-tile";
import { MaintenanceActions } from "./_components/maintenance-actions";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const health = await getHealth();

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
        description="Stream notifications are live. Manage channels & schedule under Stream Alerts."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} tone={s.bad ? "bad" : "default"} />
        ))}
      </div>

      <MaintenanceActions />
    </div>
  );
}
