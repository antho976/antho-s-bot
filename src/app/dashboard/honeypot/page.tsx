import { env } from "@/env";
import { getConfig, recentActions } from "@/server/features/honeypot/queries";
import { PageHeader } from "../_components/ui/page-header";
import { HoneypotSettings } from "./components/honeypot-settings";

export const dynamic = "force-dynamic";

export default async function HoneypotPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, actions] = await Promise.all([
    getConfig(guildId),
    recentActions(guildId, 30),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Honeypot — Trap Channel"
        description={
          <>
            A channel nobody legitimate should post in. Anyone who isn&apos;t staff or exempt that
            posts there is muted, has their recent messages purged server-wide, and you get pinged.
          </>
        }
      />

      <HoneypotSettings initial={config} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Recent triggers</h2>
        {actions.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No one has tripped the trap yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {actions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm"
              >
                <span className="w-32 shrink-0 truncate text-xs text-red-400">
                  {a.userId ? `<@${a.userId}>` : "—"}
                </span>
                <span className="grow truncate text-muted">
                  {a.action}
                  {a.snippet ? ` — ${a.snippet}` : ""}
                </span>
                <span className="shrink-0 text-xs text-faint">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
