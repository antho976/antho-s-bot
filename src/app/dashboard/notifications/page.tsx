import { env } from "@/env";
import { listChannels } from "@/server/features/notifications/queries";
import { NotificationsManager } from "./components/notifications-manager";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const channels = await listChannels(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Watch Twitch &amp; YouTube channels and post alerts. Use the <strong>Fake</strong>{" "}
        buttons to preview an alert in your Discord — no going live required.
      </p>
      <NotificationsManager initial={channels} />
    </div>
  );
}
