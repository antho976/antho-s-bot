import { ChannelType } from "discord.js";
import { getClient } from "./client";

export interface GuildOption {
  id: string;
  name: string;
}

export interface GuildOptions {
  channels: GuildOption[];
  roles: GuildOption[];
}

/** Text channels + assignable roles for the guild, for dashboard dropdowns. */
export async function getGuildOptions(guildId: string): Promise<GuildOptions> {
  const client = getClient();
  if (!client) return { channels: [], roles: [] };
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { channels: [], roles: [] };

  const channels: GuildOption[] = [];
  const channelColl = await guild.channels.fetch().catch(() => null);
  if (channelColl) {
    for (const ch of channelColl.values()) {
      if (
        ch &&
        (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
      ) {
        channels.push({ id: ch.id, name: ch.name });
      }
    }
  }
  channels.sort((a, b) => a.name.localeCompare(b.name));

  const roleArr: { id: string; name: string; position: number }[] = [];
  const roleColl = await guild.roles.fetch().catch(() => null);
  if (roleColl) {
    for (const r of roleColl.values()) {
      if (r.id === guild.id || r.managed) continue; // skip @everyone + integration roles
      roleArr.push({ id: r.id, name: r.name, position: r.position });
    }
  }
  roleArr.sort((a, b) => b.position - a.position);

  return { channels, roles: roleArr.map(({ id, name }) => ({ id, name })) };
}
