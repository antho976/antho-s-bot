import { env } from "@/env";
import { getConfig } from "@/server/features/starboard/queries";
import { PageHeader } from "../_components/ui/page-header";
import { StarboardSettings } from "./components/starboard-settings";

export const dynamic = "force-dynamic";

export default async function StarboardPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const config = await getConfig(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Highlights"
        description="When a message gets enough star reactions, the bot reposts it to your highlights channel and keeps the star count updated."
      />
      <StarboardSettings initial={config} />
    </div>
  );
}
