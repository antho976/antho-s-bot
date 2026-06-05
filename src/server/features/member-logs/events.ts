import { Events, type Client, type User } from "discord.js";
import { highlightChanges } from "./domain/diff";
import {
  deleteRoleSnapshot,
  getRoleSnapshot,
  saveRoleSnapshot,
} from "./queries";
import { logEvent, seedGuildRoleSnapshots, type LogField } from "./service";

/** `<t:unix:F>` long date + `(<t:unix:R>)` relative — Discord renders both in the viewer's locale. */
function whenFields(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `<t:${s}:F> (<t:${s}:R>)`;
}

function authorOf(user: User) {
  return { name: user.tag, iconURL: user.displayAvatarURL() };
}

/** Role IDs a member currently holds, minus @everyone (whose id equals the guild id). */
function roleIdsOf(roles: Iterable<string>, guildId: string): string[] {
  return [...roles].filter((id) => id !== guildId);
}

function roleMentions(ids: string[]): string {
  return ids.map((r) => `<@&${r}>`).join(" ").slice(0, 1024) || "—";
}

/** Attach all member-log gateway handlers. Best-effort: uncached messages log limited info. */
export function registerMemberLogEvents(client: Client): void {
  // Seed every member's roles so role diffs are correct from the first change (fixes the
  // "all roles show as added" bug for members discord.js hadn't cached). Runs once we're ready.
  const seedAll = () => {
    for (const guild of client.guilds.cache.values()) void seedGuildRoleSnapshots(guild);
  };
  if (client.isReady()) seedAll();
  else client.once(Events.ClientReady, seedAll);

  client.on(Events.GuildMemberAdd, async (m) => {
    // Record their starting roles so their first role change diffs cleanly.
    await saveRoleSnapshot(m.guild.id, m.id, roleIdsOf(m.roles.cache.keys(), m.guild.id));
    await logEvent(m.guild.id, {
      type: "join",
      title: "Member joined",
      userId: m.id,
      author: authorOf(m.user),
      thumbnail: m.user.displayAvatarURL(),
      description: `<@${m.id}> (${m.user.tag})`,
      fields: [
        { name: "Account created", value: whenFields(m.user.createdTimestamp) },
        { name: "Member count", value: `${m.guild.memberCount}`, inline: true },
      ],
      summary: `${m.user.tag} joined`,
    });
  });

  client.on(Events.GuildMemberRemove, async (m) => {
    const tag = m.user?.tag ?? m.id;
    const had = await getRoleSnapshot(m.guild.id, m.id); // what they held before leaving
    await deleteRoleSnapshot(m.guild.id, m.id);

    const fields: LogField[] = [];
    if (had?.length) fields.push({ name: `Roles (${had.length})`, value: roleMentions(had) });
    if (m.joinedTimestamp) fields.push({ name: "Joined", value: whenFields(m.joinedTimestamp) });

    await logEvent(m.guild.id, {
      type: "leave",
      title: "Member left",
      userId: m.id,
      author: m.user ? authorOf(m.user) : undefined,
      thumbnail: m.user?.displayAvatarURL(),
      description: `<@${m.id}> (${tag})`,
      fields,
      summary: `${tag} left`,
    });
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    await logEvent(ban.guild.id, {
      type: "ban",
      title: "Member banned",
      userId: ban.user.id,
      author: authorOf(ban.user),
      thumbnail: ban.user.displayAvatarURL(),
      description: `<@${ban.user.id}> (${ban.user.tag})`,
      fields: ban.reason ? [{ name: "Reason", value: ban.reason }] : undefined,
      summary: `${ban.user.tag} banned`,
    });
  });

  client.on(Events.GuildBanRemove, async (ban) => {
    await logEvent(ban.guild.id, {
      type: "unban",
      title: "Member unbanned",
      userId: ban.user.id,
      author: authorOf(ban.user),
      thumbnail: ban.user.displayAvatarURL(),
      description: `<@${ban.user.id}> (${ban.user.tag})`,
      summary: `${ban.user.tag} unbanned`,
    });
  });

  client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
    if (oldM.nickname !== newM.nickname) {
      await logEvent(newM.guild.id, {
        type: "nickname",
        title: "Nickname changed",
        userId: newM.id,
        author: authorOf(newM.user),
        description: `<@${newM.id}>`,
        fields: [
          { name: "Before", value: oldM.nickname ?? "—", inline: true },
          { name: "After", value: newM.nickname ?? "—", inline: true },
        ],
        summary: `${newM.user.tag} nickname changed`,
      });
    }

    // newM's role list comes straight from the gateway payload, so it's reliable even when the
    // member was uncached. We diff it against our stored snapshot instead of oldM's cache.
    const current = roleIdsOf(newM.roles.cache.keys(), newM.guild.id);
    const snapshot = await getRoleSnapshot(newM.guild.id, newM.id);
    await saveRoleSnapshot(newM.guild.id, newM.id, current);
    if (snapshot === null) return; // first sighting — seeded above, nothing trustworthy to diff yet

    const before = new Set(snapshot);
    const after = new Set(current);
    const added = current.filter((r) => !before.has(r));
    const removed = snapshot.filter((r) => !after.has(r));
    if (!added.length && !removed.length) return;

    const fields: LogField[] = [];
    if (added.length) fields.push({ name: `Added (${added.length})`, value: roleMentions(added) });
    if (removed.length) fields.push({ name: `Removed (${removed.length})`, value: roleMentions(removed) });
    await logEvent(newM.guild.id, {
      type: "roles",
      title: "Roles updated",
      userId: newM.id,
      author: authorOf(newM.user),
      description: `<@${newM.id}>`,
      fields,
      summary: `${newM.user.tag} roles changed`,
    });
  });

  client.on(Events.MessageDelete, async (msg) => {
    if (!msg.guildId || msg.author?.bot) return;
    // Uncached deletions (message sent before the bot started, or evicted from cache) arrive with no
    // content, author, or attachments — logging them just spams "(no cached content)". Only log a
    // deletion we can actually describe.
    if (!msg.content && !msg.attachments?.size) return;
    const fields: LogField[] = [{ name: "Channel", value: `<#${msg.channelId}>`, inline: true }];
    if (msg.author) fields.push({ name: "Author", value: `<@${msg.author.id}>`, inline: true });
    const attachNote = msg.attachments?.size ? `*${msg.attachments.size} attachment(s)*` : "";
    await logEvent(msg.guildId, {
      type: "msg_delete",
      title: "Message deleted",
      userId: msg.author?.id,
      author: msg.author ? authorOf(msg.author) : undefined,
      description: msg.content ? msg.content + (attachNote ? `\n\n${attachNote}` : "") : attachNote,
      fields,
      summary: `message by ${msg.author?.tag ?? "?"} deleted`,
    });
  });

  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!newMsg.guildId || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const before = oldMsg.content ?? "";
    const after = newMsg.content ?? "";
    await logEvent(newMsg.guildId, {
      type: "msg_edit",
      title: "Message edited",
      url: newMsg.url, // title links straight to the message
      userId: newMsg.author?.id ?? undefined,
      author: newMsg.author ? authorOf(newMsg.author) : undefined,
      fields: [
        { name: "Before", value: before || "(uncached)" },
        // Bold only the words that changed; falls back to plain text if the old copy is uncached.
        { name: "After", value: highlightChanges(before, after) || "—" },
        { name: "Channel", value: `<#${newMsg.channelId}>`, inline: true },
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
      author: newS.member ? authorOf(newS.member.user) : undefined,
      description: `<@${newS.id}> ${desc}`,
      summary: `voice: ${desc}`,
    });
  });
}
