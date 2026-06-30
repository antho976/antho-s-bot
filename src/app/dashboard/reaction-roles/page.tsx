import { getCurrentGuildId } from "@/server/core/current-guild";
import { listPanelsWithPairs } from "@/server/features/reaction-roles/queries";
import { PageHeader } from "../_components/ui/page-header";
import { ReactionRolesManager } from "./components/reaction-roles-manager";

export const dynamic = "force-dynamic";

export default async function ReactionRolesPage() {
  const guildId = await getCurrentGuildId();
  const panels = await listPanelsWithPairs(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Reaction Roles"
        description="Post a panel — members react to self-assign roles. The bot creates the message and adds the reactions for you."
      />
      <ReactionRolesManager initial={panels} />
    </div>
  );
}
