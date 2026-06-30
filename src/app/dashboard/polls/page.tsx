import { getCurrentGuildId } from "@/server/core/current-guild";
import { listPolls } from "@/server/features/polls/queries";
import { PageHeader } from "../_components/ui/page-header";
import { PollsManager } from "./components/polls-manager";

export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const guildId = await getCurrentGuildId();
  const polls = await listPolls(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Polls"
        description="Post a poll — members vote with number reactions. Results are tallied automatically when it ends (or end it manually)."
      />
      <PollsManager initial={polls} />
    </div>
  );
}
