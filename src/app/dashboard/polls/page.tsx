import { env } from "@/env";
import { listPolls } from "@/server/features/polls/queries";
import { PollsManager } from "./components/polls-manager";

export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const polls = await listPolls(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Polls</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Post a poll — members vote with number reactions. Results are tallied automatically when it
        ends (or end it manually).
      </p>
      <PollsManager initial={polls} />
    </div>
  );
}
