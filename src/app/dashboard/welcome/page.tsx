import { getCurrentGuildId } from "@/server/core/current-guild";
import { getConfig, listBackgrounds } from "@/server/features/welcome/queries";
import { PageHeader } from "../_components/ui/page-header";
import { WelcomeSettings } from "./components/welcome-settings";
import { BackgroundsManager } from "./components/backgrounds-manager";
import { WelcomePreview } from "./components/welcome-preview";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const guildId = await getCurrentGuildId();
  const [config, backgrounds] = await Promise.all([
    getConfig(guildId),
    listBackgrounds(guildId),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Welcome & Goodbye"
        description="Greet new members (and farewell leavers) with a message and custom artwork."
      />
      <WelcomeSettings initial={config} />
      <BackgroundsManager initial={backgrounds} />
      <WelcomePreview />
    </div>
  );
}
