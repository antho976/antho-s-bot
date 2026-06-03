import { env } from "@/env";
import { getConfig, listTickets } from "@/server/features/support/queries";
import { PageHeader } from "../_components/ui/page-header";
import { SupportSettings } from "./components/support-settings";

export const dynamic = "force-dynamic";

const PRIORITY_CLR: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-amber-400",
  medium: "text-sky-400",
  low: "text-muted",
};

export default async function SupportPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, tickets] = await Promise.all([
    getConfig(guildId),
    listTickets(guildId, undefined, 50),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Support Tickets"
        description={
          <>
            Members open tickets with <code>/ticket open</code> — each is auto-triaged by priority
            &amp; category into a private thread and your staff role is pinged. Close with{" "}
            <code>/ticket close</code>.
          </>
        }
      />

      <SupportSettings initial={config} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No tickets yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Subject</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-left font-medium">Priority</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2 text-faint">{t.number}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-text">{t.subject}</td>
                    <td className="px-3 py-2 text-muted">{t.category}</td>
                    <td className={`px-3 py-2 capitalize ${PRIORITY_CLR[t.priority] ?? ""}`}>
                      {t.priority}
                    </td>
                    <td className="px-3 py-2 text-muted">{t.status}</td>
                    <td className="px-3 py-2 text-xs text-faint">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
