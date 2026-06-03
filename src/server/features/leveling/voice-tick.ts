import { getClient } from "@/server/integrations/discord/client";
import { getConfig } from "./queries";
import { awardVoiceXp } from "./service";

/**
 * Scheduler tick: award one voice-minute of XP to eligible members currently in voice.
 * "Eligible" = not a bot, not in the AFK channel, and (if voiceRequireActive) not muted/deafened.
 */
export async function checkVoiceXp(): Promise<void> {
  const client = getClient();
  if (!client) return;

  for (const guild of client.guilds.cache.values()) {
    const config = await getConfig(guild.id);
    if (!config.enabled || config.xpPerVoiceMin <= 0) continue;

    for (const vs of guild.voiceStates.cache.values()) {
      if (!vs.channelId || vs.channelId === guild.afkChannelId) continue;
      const member = vs.member;
      if (!member || member.user.bot) continue;
      if (
        config.voiceRequireActive &&
        (vs.selfMute || vs.selfDeaf || vs.serverMute || vs.serverDeaf)
      ) {
        continue;
      }
      await awardVoiceXp(guild.id, member.id, 1);
    }
  }
}
