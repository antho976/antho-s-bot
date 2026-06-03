import { Events, type Client } from "discord.js";
import { logEvent } from "./service";

/** Attach all member-log gateway handlers. Best-effort: uncached messages log limited info. */
export function registerMemberLogEvents(client: Client): void {
  client.on(Events.GuildMemberAdd, async (m) => {
    await logEvent(m.guild.id, {
      type: "join",
      title: "Member joined",
      description: `<@${m.id}> (${m.user.tag})`,
      userId: m.id,
      summary: `${m.user.tag} joined`,
    });
  });

  client.on(Events.GuildMemberRemove, async (m) => {
    const tag = m.user?.tag ?? m.id;
    await logEvent(m.guild.id, {
      type: "leave",
      title: "Member left",
      description: `${tag}`,
      userId: m.id,
      summary: `${tag} left`,
    });
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    await logEvent(ban.guild.id, {
      type: "ban",
      title: "Member banned",
      description: `${ban.user.tag}`,
      userId: ban.user.id,
      summary: `${ban.user.tag} banned`,
    });
  });

  client.on(Events.GuildBanRemove, async (ban) => {
    await logEvent(ban.guild.id, {
      type: "unban",
      title: "Member unbanned",
      description: `${ban.user.tag}`,
      userId: ban.user.id,
      summary: `${ban.user.tag} unbanned`,
    });
  });

  client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
    if (oldM.nickname !== newM.nickname) {
      await logEvent(newM.guild.id, {
        type: "nickname",
        title: "Nickname changed",
        userId: newM.id,
        fields: [
          { name: "Before", value: oldM.nickname ?? "—" },
          { name: "After", value: newM.nickname ?? "—" },
        ],
        summary: `${newM.user.tag} nickname changed`,
      });
    }
    const before = new Set(oldM.roles.cache.keys());
    const after = new Set(newM.roles.cache.keys());
    const added = [...after].filter((r) => !before.has(r));
    const removed = [...before].filter((r) => !after.has(r));
    if (added.length || removed.length) {
      const fields: { name: string; value: string }[] = [];
      if (added.length) fields.push({ name: "Added", value: added.map((r) => `<@&${r}>`).join(" ") });
      if (removed.length) fields.push({ name: "Removed", value: removed.map((r) => `<@&${r}>`).join(" ") });
      await logEvent(newM.guild.id, {
        type: "roles",
        title: "Roles updated",
        userId: newM.id,
        fields,
        summary: `${newM.user.tag} roles changed`,
      });
    }
  });

  client.on(Events.MessageDelete, async (msg) => {
    if (!msg.guildId || msg.author?.bot) return;
    await logEvent(msg.guildId, {
      type: "msg_delete",
      title: "Message deleted",
      description: msg.content ? msg.content : "(no cached content)",
      userId: msg.author?.id,
      fields: [{ name: "Channel", value: `<#${msg.channelId}>` }],
      summary: `message by ${msg.author?.tag ?? "?"} deleted`,
    });
  });

  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!newMsg.guildId || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    await logEvent(newMsg.guildId, {
      type: "msg_edit",
      title: "Message edited",
      userId: newMsg.author?.id ?? undefined,
      fields: [
        { name: "Before", value: oldMsg.content || "(uncached)" },
        { name: "After", value: newMsg.content || "—" },
        { name: "Channel", value: `<#${newMsg.channelId}>` },
      ],
      summary: `message by ${newMsg.author?.tag ?? "?"} edited`,
    });
  });

  client.on(Events.VoiceStateUpdate, async (oldS, newS) => {
    if (oldS.channelId === newS.channelId) return;
    let desc: string;
    if (!oldS.channelId && newS.channelId) desc = `joined <#${newS.channelId}>`;
    else if (oldS.channelId && !newS.channelId) desc = `left <#${oldS.channelId}>`;
    else desc = `moved <#${oldS.channelId}> → <#${newS.channelId}>`;
    await logEvent(newS.guild.id, {
      type: "voice",
      title: "Voice update",
      userId: newS.id,
      description: `<@${newS.id}> ${desc}`,
      summary: `voice: ${desc}`,
    });
  });
}
