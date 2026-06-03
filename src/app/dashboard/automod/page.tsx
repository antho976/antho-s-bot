import { env } from "@/env";
import {
  getConfig,
  listBlocklist,
  recentActions,
} from "@/server/features/automod/queries";
import { AutomodSettings } from "./components/automod-settings";
import { BlocklistManager } from "./components/blocklist-manager";

export const dynamic = "force-dynamic";

export default async function AutomodPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, blocklist, actions] = await Promise.all([
    getConfig(guildId),
    listBlocklist(guildId),
    recentActions(guildId, 30),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Auto-mod — Scam Protection</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Discord handles spam, mentions, and word filters natively — this adds the scam/phishing
        layer it lacks (lookalike domains, &quot;free nitro&quot; links, your own blocklist).
      </p>

      <AutomodSettings initial={config} />
      <BlocklistManager initial={blocklist} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent actions</h2>
        {actions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No scams caught yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {actions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
              >
                <span className="w-20 shrink-0 text-xs uppercase text-red-400">{a.rule}</span>
                <span className="grow truncate text-neutral-300">
                  {a.action}
                  {a.snippet ? ` — ${a.snippet}` : ""}
                </span>
                <span className="shrink-0 text-xs text-neutral-600">
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
