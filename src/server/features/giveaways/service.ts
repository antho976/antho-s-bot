import {
  ChannelType,
  EmbedBuilder,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "discord.js";
import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { getLevelValue } from "@/server/features/leveling/queries";
import {
  addEntry,
  createGiveaway,
  dueGiveaways,
  getByMessage,
  getEntryUserIds,
  getGiveaway,
  markEnded,
  removeEntry,
  setMessageId,
  type Giveaway,
} from "./queries";

const EMOJI = "🎉";

function embedFor(g: {
  prize: string;
  winnersCount: number;
  endsAt: Date;
}, status: string, winners?: string[]): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`🎉 Giveaway: ${g.prize}`).setColor(0xa855f7);
  if (status === "active") {
    embed.setDescription(
      `React with ${EMOJI} to enter!\nWinners: **${g.winnersCount}**\nEnds <t:${Math.floor(
        g.endsAt.getTime() / 1000,
      )}:R>`,
    );
  } else if (winners && winners.length) {
    embed
      .setColor(0x22c55e)
      .setDescription(`Winner(s): ${winners.map((w) => `<@${w}>`).join(", ")}\nPrize: **${g.prize}**`);
  } else {
    embed.setColor(0x64748b).setDescription("Ended — no eligible entries.");
  }
  return embed;
}

export interface CreateGiveawayOpts {
  guildId: string;
  channelId: string;
  prize: string;
  winnersCount: number;
  durationMin: number;
  pingRoleId?: string | null;
  minLevel: number;
  createdBy?: string | null;
}

export async function createGiveawayInChannel(opts: CreateGiveawayOpts): Promise<Giveaway> {
  const client = getClient();
  if (!client) throw new Error("Bot is offline");
  const channel = await client.channels.fetch(opts.channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error("Target is not a text channel");
  }

  const endsAt = new Date(Date.now() + opts.durationMin * 60_000);
  const giveaway = await createGiveaway({
    guildId: opts.guildId,
    channelId: opts.channelId,
    prize: opts.prize,
    winnersCount: opts.winnersCount,
    endsAt,
    pingRoleId: opts.pingRoleId ?? null,
    minLevel: opts.minLevel,
    createdBy: opts.createdBy ?? null,
  });

  const message = await channel.send({
    content: opts.pingRoleId ? `<@&${opts.pingRoleId}>` : undefined,
    embeds: [embedFor({ prize: opts.prize, winnersCount: opts.winnersCount, endsAt }, "active")],
    allowedMentions: { roles: opts.pingRoleId ? [opts.pingRoleId] : [] },
  });
  await message.react(EMOJI).catch(() => {});
  await setMessageId(giveaway.id, message.id);
  await track(opts.guildId, "giveaway.create", {});
  return { ...giveaway, messageId: message.id };
}

export async function handleGiveawayReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  added: boolean,
): Promise<void> {
  if ((reaction.emoji.name ?? "") !== EMOJI) return;
  const giveaway = await getByMessage(reaction.message.id);
  if (!giveaway || giveaway.status !== "active") return;

  if (!added) {
    await removeEntry(giveaway.id, user.id);
    return;
  }
  if (giveaway.minLevel > 0) {
    const level = await getLevelValue(giveaway.guildId, user.id);
    if (level < giveaway.minLevel) {
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }
  }
  await addEntry(giveaway.id, user.id);
}

function pickWinners(entries: string[], count: number): string[] {
  const pool = [...new Set(entries)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export async function endGiveaway(id: number): Promise<void> {
  const giveaway = await getGiveaway(id);
  if (!giveaway || giveaway.status !== "active") return;

  const winners = pickWinners(await getEntryUserIds(id), giveaway.winnersCount);
  await markEnded(id, winners, "ended");
  await track(giveaway.guildId, "giveaway.end", { winners: winners.length });

  const client = getClient();
  if (!client || !giveaway.messageId) return;
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (msg) {
    await msg
      .edit({
        embeds: [
          embedFor(
            { prize: giveaway.prize, winnersCount: giveaway.winnersCount, endsAt: giveaway.endsAt },
            "ended",
            winners,
          ),
        ],
      })
      .catch(() => {});
  }
  if (winners.length) {
    await channel.send({
      content: `🎉 Congrats ${winners.map((w) => `<@${w}>`).join(", ")} — you won **${giveaway.prize}**!`,
      allowedMentions: { users: winners },
    });
  } else {
    await channel.send(`No eligible entries for **${giveaway.prize}**.`);
  }
}

export async function cancelGiveaway(id: number): Promise<void> {
  const giveaway = await getGiveaway(id);
  if (!giveaway || giveaway.status !== "active") return;
  await markEnded(id, [], "cancelled");
}

/** Scheduler tick: end any giveaways whose time is up. */
export async function checkGiveaways(): Promise<void> {
  const due = await dueGiveaways(Date.now());
  for (const g of due) await endGiveaway(g.id);
}
