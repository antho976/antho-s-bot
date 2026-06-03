import { env } from "@/env";
import { listSubmissions } from "@/server/features/pets/queries";
import { PetsManager } from "./components/pets-manager";

export const dynamic = "force-dynamic";

export default async function PetsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const submissions = await listSubmissions(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Pets</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Members submit pets with <code>/pet submit</code>; approve or deny them here (the submitter
        gets a DM). <em>Idleon-specific data/giveaway integration is deferred.</em>
      </p>
      <PetsManager initial={submissions} />
    </div>
  );
}
