import { env } from "@/env";
import { getConfig } from "@/server/features/starboard/queries";
import { StarboardSettings } from "./components/starboard-settings";

export const dynamic = "force-dynamic";

export default async function StarboardPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const config = await getConfig(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Highlights</h1>
      <p className="mt-1 text-sm text-neutral-400">
        When a message gets enough star reactions, the bot reposts it to your highlights channel
        and keeps the star count updated.
      </p>
      <StarboardSettings initial={config} />
    </div>
  );
}
