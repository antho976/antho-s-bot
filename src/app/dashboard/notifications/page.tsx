import { getCurrentGuildId } from "@/server/core/current-guild";
import { listChannels } from "@/server/features/notifications/queries";
import { listSchedule } from "@/server/features/notifications/schedule-queries";
import { PageHeader } from "../_components/ui/page-header";
import { NotificationsManager } from "./components/notifications-manager";
import { ScheduleManager } from "./components/schedule-manager";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const guildId = await getCurrentGuildId();
  const [channels, schedule] = await Promise.all([
    listChannels(guildId),
    listSchedule(guildId),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Notifications"
        description={
          <>
            Watch Twitch &amp; YouTube channels and post alerts. Use the <strong>Fake</strong>{" "}
            buttons to preview an alert in your Discord — no going live required.
          </>
        }
      />
      <NotificationsManager initial={channels} />
      <ScheduleManager initial={schedule} channels={channels} />
    </div>
  );
}
