import { getConfig as automodConfig } from "@/server/features/automod/queries";
import { getConfig as birthdayConfig } from "@/server/features/birthdays/queries";
import { getConfig as levelConfig } from "@/server/features/leveling/queries";
import { getConfig as memberLogConfig } from "@/server/features/member-logs/queries";
import { getConfig as starboardConfig } from "@/server/features/starboard/queries";
import { getConfig as supportConfig } from "@/server/features/support/queries";
import { getConfig as welcomeConfig } from "@/server/features/welcome/queries";
import { listCommands } from "@/server/features/custom-commands/queries";
import { listChannels } from "@/server/features/notifications/queries";

/** A portable JSON snapshot of the guild's configuration + content (for download/migration). */
export async function exportData(guildId: string) {
  const [leveling, welcome, automod, starboard, support, birthday, memberLogs] = await Promise.all([
    levelConfig(guildId),
    welcomeConfig(guildId),
    automodConfig(guildId),
    starboardConfig(guildId),
    supportConfig(guildId),
    birthdayConfig(guildId),
    memberLogConfig(guildId),
  ]);
  const [customCommands, streamChannels] = await Promise.all([
    listCommands(guildId),
    listChannels(guildId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    guildId,
    configs: { leveling, welcome, automod, starboard, support, birthday, memberLogs },
    customCommands,
    streamChannels,
  };
}
