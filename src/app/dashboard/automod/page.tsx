import { getCurrentGuildId } from "@/server/core/current-guild";
import {
  getConfig,
  listBlocklist,
  recentActions,
} from "@/server/features/automod/queries";
import { PageHeader } from "../_components/ui/page-header";
import { AutomodSettings } from "./components/automod-settings";
import { BlocklistManager } from "./components/blocklist-manager";

export const dynamic = "force-dynamic";

export default async function AutomodPage() {
  const guildId = await getCurrentGuildId();
  const [config, blocklist, actions] = await Promise.all([
    getConfig(guildId),
    listBlocklist(guildId),
    recentActions(guildId, 30),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Auto-mod — Scam Protection"
        description={
          <>
            Discord handles spam, mentions, and word filters natively — this adds the scam/phishing
            layer it lacks (lookalike domains, &quot;free nitro&quot; links, your own blocklist).
          </>
        }
      />

      <AutomodSettings initial={config} />
      <BlocklistManager initial={blocklist} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Recent actions</h2>
        {actions.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No scams caught yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {actions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm"
              >
                <span className="w-20 shrink-0 text-xs uppercase text-red-400">{a.rule}</span>
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
