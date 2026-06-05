import {
  EmbedBuilder,
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
  deletePanelRows,
  getPairsByMessage,
  getPanel,
  getPanelByMessage,
  type Panel,
} from "./queries";

export interface PairInput {
  emoji: string; // raw (unicode char or "<:name:id>")
  roleId: string;
  label?: string;
}

/** Extract the storage/react key from a raw emoji string. */
function parseEmoji(raw: string): string {
  const m = raw.match(/<a?:\w+:(\d+)>/);
  return m ? m[1] : raw.trim();
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

  const description = pairs.map((p) => `${p.emoji} — <@&${p.roleId}>`).join("\n");
  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(title || "Reaction Roles")
    .setDescription(description || "—");
  const message = await channel.send({ embeds: [embed] });

  const panel = await createPanel({ guildId, channelId, messageId: message.id, title, mode });
  await addPairs(
    pairs.map((p) => ({
      messageId: message.id,
      emoji: parseEmoji(p.emoji),
      roleId: p.roleId,
      label: p.label ?? null,
    })),
  );
  for (const p of pairs) {
    await message.react(parseEmoji(p.emoji)).catch(() => {});
  }
  return panel;
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
  const pair = pairs.find((p) => p.emoji === key);
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
