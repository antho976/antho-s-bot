import { env } from "@/env";
import { getConfig, recentEvents } from "@/server/features/member-logs/queries";
import { PageHeader } from "../_components/ui/page-header";
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
      <PageHeader
        title="Member Logs"
        description="Log server events to a channel — toggle exactly what you want tracked."
      />

      <MemberLogsSettings initial={config} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Recent activity</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No events logged yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm"
              >
                <span className="w-20 shrink-0 text-xs uppercase text-faint">{e.type}</span>
                <span className="grow truncate text-text">{e.summary}</span>
                <span className="shrink-0 text-xs text-faint">
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
