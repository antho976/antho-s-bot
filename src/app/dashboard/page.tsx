import { getHealth } from "@/server/core/health";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const health = await getHealth();

  const stats = [
    {
      label: "Bot",
      value: health.discord.ready ? "Online" : "Offline",
      good: health.discord.ready,
    },
    {
      label: "Database",
      value: health.db.ok ? "Connected" : "Down",
      good: health.db.ok,
    },
    {
      label: "Guilds",
      value: health.discord.guilds ?? "—",
      good: true,
    },
    {
      label: "Gateway ping",
      value: health.discord.ping != null ? `${health.discord.ping} ms` : "—",
      good: true,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Phase 0 — the skeleton is live. Features arrive in later phases.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              {s.label}
            </div>
            <div
              className={`mt-1 text-lg font-semibold ${
                s.good ? "text-neutral-100" : "text-red-400"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-sm font-semibold text-neutral-200">What&apos;s next</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-400">
          <li>• Phase 1 — Twitch &amp; YouTube notifications + stream reminders</li>
          <li>• Phase 2 — Welcome artwork &amp; leveling</li>
          <li>• Phase 3 — Auto-mod, member logs, support tickets</li>
          <li>• Quick actions (VIPs, fake live/end) land with Phase 1</li>
        </ul>
      </div>
    </div>
  );
}
