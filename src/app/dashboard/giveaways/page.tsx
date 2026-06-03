import { env } from "@/env";
import { listGiveaways } from "@/server/features/giveaways/queries";
import { PageHeader } from "../_components/ui/page-header";
import { GiveawaysManager } from "./components/giveaways-manager";

export const dynamic = "force-dynamic";

export default async function GiveawaysPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const giveaways = await listGiveaways(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Giveaways"
        description="Start a giveaway — members enter with 🎉, and the bot picks winners automatically when it ends (optionally gated by level)."
      />
      <GiveawaysManager initial={giveaways} />
    </div>
  );
}
