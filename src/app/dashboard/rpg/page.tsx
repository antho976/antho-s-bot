import { env } from "@/env";
import { getRpgConfig } from "@/server/features/rpg/queries";
import { PageHeader } from "../_components/ui/page-header";
import { RpgSettings } from "./components/rpg-settings";

export const dynamic = "force-dynamic";

export default async function RpgPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const config = await getRpgConfig(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="RPG"
        description="The community RPG. Players open their adventure hub with /rpg — a public, owner-gated profile with combat, guild, inventory and more. Turn it on and pick where hubs are posted."
      />
      <RpgSettings initial={config} />
    </div>
  );
}
