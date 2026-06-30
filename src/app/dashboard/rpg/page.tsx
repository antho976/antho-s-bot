import { getCurrentGuildId } from "@/server/core/current-guild";
import { getRpgConfig } from "@/server/features/rpg/queries";
import { getLatency } from "@/server/features/rpg/metrics";
import { PageHeader } from "../_components/ui/page-header";
import { RpgSettings } from "./components/rpg-settings";
import { LatencyPanel } from "./components/latency-panel";

export const dynamic = "force-dynamic";

export default async function RpgPage() {
  const guildId = await getCurrentGuildId();
  const config = await getRpgConfig(guildId);
  const latency = getLatency();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="RPG"
        description="The community RPG. Players open their adventure hub with /rpg — a public, owner-gated profile with combat, guild, inventory and more. Turn it on and pick where hubs are posted."
      />
      <RpgSettings initial={config} />
      <LatencyPanel initial={latency} />
    </div>
  );
}
