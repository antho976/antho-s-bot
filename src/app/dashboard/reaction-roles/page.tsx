import { env } from "@/env";
import { listPanelsWithPairs } from "@/server/features/reaction-roles/queries";
import { ReactionRolesManager } from "./components/reaction-roles-manager";

export const dynamic = "force-dynamic";

export default async function ReactionRolesPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const panels = await listPanelsWithPairs(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Reaction Roles</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Post a panel — members react to self-assign roles. The bot creates the message and adds the
        reactions for you.
      </p>
      <ReactionRolesManager initial={panels} />
    </div>
  );
}
