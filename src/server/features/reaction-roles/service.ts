import {
  EmbedBuilder,
  type Guild,
  type Message,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "discord.js";
import { logger } from "@/server/core/logger";
import { getClient } from "@/server/integrations/discord/client";
import {
  addPairs,
  createPanel,
  deletePairsByMessage,
  deletePanelRows,
  getPairsByMessage,
  getPanel,
  getPanelByMessage,
  updatePanel,
  type Panel,
} from "./queries";

export interface PairInput {
  emoji: string; // raw (unicode char or "<:name:id>")
  roleId: string;
  label?: string;
}

/** Extract the storage/react key from an emoji string: the id for a custom emoji, else the raw. */
function parseEmoji(raw: string): string {
  const m = raw.match(/<a?:\w+:(\d+)>/);
  return m ? m[1] : raw.trim();
}

/**
 * Turn what a user typed into a renderable emoji. A custom emoji entered as a shortcode (`:name:`),
 * a bare name, or a bare id is resolved against the guild's emojis into `<:name:id>` (so it both
 * renders in the panel and can be reacted with). Full `<:name:id>` and unicode emojis pass through.
 */
function resolveEmoji(raw: string, guild: Guild): string {
  const s = raw.trim();
  if (/^<a?:\w+:\d+>$/.test(s)) return s; // already a full custom emoji
  if (/^\d+$/.test(s)) {
    const byId = guild.emojis.cache.get(s);
    return byId ? byId.toString() : s;
  }
  const name = s.match(/^:?([A-Za-z0-9_]+):?$/)?.[1];
  if (name) {
    const found = guild.emojis.cache.find((e) => e.name?.toLowerCase() === name.toLowerCase());
    if (found) return found.toString();
  }
  return s; // unicode emoji, or an unknown name — leave as typed
}

function buildPanelEmbed(
  title: string | undefined,
  pairs: { emoji: string; roleId: string }[],
): EmbedBuilder {
  const description = pairs.map((p) => `${p.emoji} — <@&${p.roleId}>`).join("\n");
  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(title || "Reaction Roles")
    .setDescription(description || "—");
}

/** Bring a message's reactions in line with the wanted set: drop stale ones, add missing ones. */
async function syncReactions(message: Message, wantedKeys: string[]): Promise<void> {
  const want = new Set(wantedKeys);
  for (const reaction of message.reactions.cache.values()) {
    const key = reaction.emoji.id ?? reaction.emoji.name;
    if (key && !want.has(key)) await reaction.remove().catch(() => {});
  }
  for (const key of wantedKeys) {
    if (!message.reactions.cache.has(key)) {
      await message.react(key).catch((err) => logger.warn("reaction-roles", "Failed to react", err));
    }
  }
}

/** Post a reaction-role panel message, add the reactions, and store the mapping. */
export async function createReactionRolePanel(
  guildId: string,
  channelId: string,
  title: string | undefined,
  mode: string,
  pairs: PairInput[],
): Promise<Panel> {
  const client = getClient();
  if (!client) throw new Error("Bot is offline");

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new Error("Target is not a text channel");
  }

  // Resolve custom-emoji shortcodes (`:name:`) to `<:name:id>` so they render + can be reacted with.
  const resolved = pairs.map((p) => ({ ...p, emoji: resolveEmoji(p.emoji, channel.guild) }));
  const message = await channel.send({ embeds: [buildPanelEmbed(title, resolved)] });

  const panel = await createPanel({ guildId, channelId, messageId: message.id, title, mode });
  await addPairs(
    resolved.map((p) => ({
      messageId: message.id,
      emoji: p.emoji, // store the renderable form; matched via parseEmoji at react time
      roleId: p.roleId,
      label: p.label ?? null,
    })),
  );
  await syncReactions(message, resolved.map((p) => parseEmoji(p.emoji)));
  return panel;
}

/** Edit an existing panel: update its message + reactions + stored mapping in place. */
export async function editReactionRolePanel(
  id: number,
  title: string | undefined,
  mode: string,
  pairs: PairInput[],
): Promise<Panel> {
  const panel = await getPanel(id);
  if (!panel) throw new Error("Panel not found");
  const client = getClient();
  if (!client) throw new Error("Bot is offline");

  const channel = await client.channels.fetch(panel.channelId);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new Error("Target is not a text channel");
  }
  const message = await channel.messages.fetch(panel.messageId).catch(() => null);
  if (!message) throw new Error("The panel's message is gone — delete this panel and make a new one.");

  const resolved = pairs.map((p) => ({ ...p, emoji: resolveEmoji(p.emoji, channel.guild) }));
  await message.edit({ embeds: [buildPanelEmbed(title, resolved)] });

  await updatePanel(id, { title: title ?? null, mode });
  await deletePairsByMessage(panel.messageId);
  await addPairs(
    resolved.map((p) => ({
      messageId: panel.messageId,
      emoji: p.emoji,
      roleId: p.roleId,
      label: p.label ?? null,
    })),
  );
  await syncReactions(message, resolved.map((p) => parseEmoji(p.emoji)));

  return { ...panel, title: title ?? null, mode };
}

/** Delete the panel: remove the Discord message (best-effort) + DB rows. */
export async function deleteReactionRolePanel(id: number): Promise<void> {
  const panel = await getPanel(id);
  if (!panel) return;
  const client = getClient();
  if (client) {
    try {
      const channel = await client.channels.fetch(panel.channelId);
      if (channel?.isTextBased()) {
        const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
        await msg?.delete().catch(() => {});
      }
    } catch {
      // ignore — message may already be gone
    }
  }
  await deletePanelRows(id, panel.messageId);
}

/** Apply (or undo) a role when a user reacts on a panel. */
export async function handleReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  added: boolean,
): Promise<void> {
  const messageId = reaction.message.id;
  const pairs = await getPairsByMessage(messageId);
  if (!pairs.length) return;

  const key = reaction.emoji.id ?? reaction.emoji.name;
  if (!key) return;
  const pair = pairs.find((p) => parseEmoji(p.emoji) === key);
  if (!pair) return;

  const guild = reaction.message.guild;
  if (!guild) return;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const panel = await getPanelByMessage(messageId);
  const mode = panel?.mode ?? "toggle";

  try {
    if (added) {
      if (mode === "unique") {
        const others = pairs
          .map((p) => p.roleId)
          .filter((r) => r !== pair.roleId && member.roles.cache.has(r));
        if (others.length) await member.roles.remove(others);
      }
      await member.roles.add(pair.roleId);
    } else if (mode !== "verify") {
      await member.roles.remove(pair.roleId);
    }
  } catch (err) {
    logger.warn("reaction-roles", "Failed to update role", err);
  }
}
