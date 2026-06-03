import { env } from "@/env";
import { getConfig, recentEvents } from "@/server/features/member-logs/queries";
import { MemberLogsSettings } from "./components/member-logs-settings";

export const dynamic = "force-dynamic";

export default async function MemberLogsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, events] = await Promise.all([
    getConfig(guildId),
    recentEvents(guildId, 30),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Member Logs</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Log server events to a channel — toggle exactly what you want tracked.
      </p>

      <MemberLogsSettings initial={config} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No events logged yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
              >
                <span className="w-20 shrink-0 text-xs uppercase text-neutral-500">{e.type}</span>
                <span className="grow truncate text-neutral-200">{e.summary}</span>
                <span className="shrink-0 text-xs text-neutral-600">
                  {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
