import type { ReactNode } from "react";
import { env } from "@/env";
import { dailySeries, eventTypeTotals } from "@/server/features/analytics/queries";

export const dynamic = "force-dynamic";

function Card({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-neutral-100">{value}</div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [totals, series] = await Promise.all([
    eventTypeTotals(guildId),
    dailySeries(guildId, 30),
  ]);

  const last30 = series.reduce((s, p) => s + p.count, 0);
  const allTime = totals.reduce((s, t) => s + t.total, 0);
  const maxDay = Math.max(1, ...series.map((p) => p.count));
  const maxMetric = Math.max(1, ...totals.map((t) => t.total));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Everything the bot has tracked since day one. Raw events roll up into permanent daily
        counts; today&apos;s are counted live.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card label="Events (all time)" value={allTime.toLocaleString()} />
        <Card label="Last 30 days" value={last30.toLocaleString()} />
        <Card label="Event types" value={totals.length} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Activity — last 30 days</h2>
        <div className="mt-3 flex h-40 items-end gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          {series.map((p) => (
            <div
              key={p.day}
              title={`${p.day}: ${p.count}`}
              className="flex-1 rounded-sm bg-indigo-600"
              style={{ height: `${Math.max(p.count > 0 ? 2 : 0, Math.round((p.count / maxDay) * 130))}px` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-neutral-600">
          <span>{series[0]?.day}</span>
          <span>{series[series.length - 1]?.day}</span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">By event type</h2>
        {totals.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No events tracked yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {totals.map((t) => (
              <div key={t.metric} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-neutral-300">{t.metric}</span>
                  <span className="text-neutral-500">{t.total.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-neutral-800">
                  <div
                    className="h-2 rounded bg-indigo-600"
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
