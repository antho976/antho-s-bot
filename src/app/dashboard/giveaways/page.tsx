import { env } from "@/env";
import { listGiveaways } from "@/server/features/giveaways/queries";
import { GiveawaysManager } from "./components/giveaways-manager";

export const dynamic = "force-dynamic";

export default async function GiveawaysPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const giveaways = await listGiveaways(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Giveaways</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Start a giveaway — members enter with 🎉, and the bot picks winners automatically when it
        ends (optionally gated by level).
      </p>
      <GiveawaysManager initial={giveaways} />
    </div>
  );
}
