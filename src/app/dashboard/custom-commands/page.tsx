import { env } from "@/env";
import { listCommands } from "@/server/features/custom-commands/queries";
import { CustomCommandsManager } from "./components/custom-commands-manager";

export const dynamic = "force-dynamic";

export default async function CustomCommandsPage() {
  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const commands = await listCommands(guildId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Custom Commands</h1>
      <p className="mt-1 text-sm text-neutral-400">
        <code>!name</code> commands that post text and/or an image — with cooldowns, usage limits,
        auto-delete, and role/channel restrictions.
      </p>
      <CustomCommandsManager initial={commands} />
    </div>
  );
}
