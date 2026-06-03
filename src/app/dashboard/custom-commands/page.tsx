import { env } from "@/env";
import { listCommands } from "@/server/features/custom-commands/queries";
import { PageHeader } from "../_components/ui/page-header";
import { CustomCommandsManager } from "./components/custom-commands-manager";

export const dynamic = "force-dynamic";

export default async function CustomCommandsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const commands = await listCommands(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Custom Commands"
        description={
          <>
            <code>!name</code> commands that post text and/or an image — with cooldowns, usage
            limits, auto-delete, and role/channel restrictions.
          </>
        }
      />
      <CustomCommandsManager initial={commands} />
    </div>
  );
}
