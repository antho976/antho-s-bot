import { env } from "@/env";
import { getConfig, listBackgrounds } from "@/server/features/welcome/queries";
import { WelcomeSettings } from "./components/welcome-settings";
import { BackgroundsManager } from "./components/backgrounds-manager";
import { WelcomePreview } from "./components/welcome-preview";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const [config, backgrounds] = await Promise.all([
    getConfig(guildId),
    listBackgrounds(guildId),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Welcome &amp; Goodbye</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Greet new members (and farewell leavers) with a message and custom artwork.
      </p>
      <WelcomeSettings initial={config} />
      <BackgroundsManager initial={backgrounds} />
      <WelcomePreview />
    </div>
  );
}
