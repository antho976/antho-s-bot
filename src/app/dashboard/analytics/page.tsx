import { env } from "@/env";
import { dailySeries, eventTypeTotals } from "@/server/features/analytics/queries";
import { PageHeader } from "../_components/ui/page-header";
import { StatTile } from "../_components/ui/stat-tile";
import { Card } from "../_components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [totals, series] = await Promise.all([eventTypeTotals(guildId), dailySeries(guildId, 30)]);

  const last30 = series.reduce((s, p) => s + p.count, 0);
  const allTime = totals.reduce((s, t) => s + t.total, 0);
  const maxDay = Math.max(1, ...series.map((p) => p.count));
  const maxMetric = Math.max(1, ...totals.map((t) => t.total));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Analytics"
        description="Everything the bot has tracked since day one. Raw events roll up into permanent daily counts; today's are counted live."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Events (all time)" value={allTime.toLocaleString()} />
        <StatTile label="Last 30 days" value={last30.toLocaleString()} />
        <StatTile label="Event types" value={totals.length} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text">Activity — last 30 days</h2>
        <Card className="mt-3 flex h-40 items-end gap-1 p-4">
          {series.map((p) => (
            <div
              key={p.day}
              title={`${p.day}: ${p.count}`}
              className="flex-1 rounded-sm bg-accent"
              style={{ height: `${Math.max(p.count > 0 ? 2 : 0, Math.round((p.count / maxDay) * 130))}px` }}
            />
          ))}
        </Card>
        <div className="mt-1 flex justify-between text-xs text-faint">
          <span>{series[0]?.day}</span>
          <span>{series[series.length - 1]?.day}</span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text">By event type</h2>
        {totals.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No events tracked yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {totals.map((t) => (
              <div key={t.metric} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-muted">{t.metric}</span>
                  <span className="text-faint">{t.total.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-surface-2">
                  <div
                    className="h-2 rounded bg-accent"
                    style={{ width: `${Math.round((t.total / maxMetric) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
