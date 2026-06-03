import { env } from "@/env";
import { getConfig, listBirthdays } from "@/server/features/birthdays/queries";
import { PageHeader } from "../_components/ui/page-header";
import { BirthdaySettings } from "./components/birthday-settings";

export const dynamic = "force-dynamic";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function BirthdaysPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, list] = await Promise.all([getConfig(guildId), listBirthdays(guildId)]);
  const sorted = [...list].sort((a, b) => a.month - b.month || a.day - b.day);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Birthdays"
        description={
          <>
            Members set their birthday with <code>/birthday set</code>; the bot announces on the day
            (and can hand out a birthday role).
          </>
        }
      />

      <BirthdaySettings initial={config} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text">Set birthdays ({list.length})</h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-faint">No birthdays set yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {sorted.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm"
              >
                <span className="text-muted">user {b.userId}</span>
                <span className="text-muted">
                  {MONTHS[b.month] ?? b.month} {b.day}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
