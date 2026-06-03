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
import {
  createPoll,
  duePolls,
  getByMessage,
  getPoll,
  markEnded,
  setMessageId,
  type Poll,
} from "./queries";

const NUM = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export interface CreatePollOpts {
  guildId: string;
  channelId: string;
  question: string;
  options: string[];
  multi: boolean;
  durationMin: number; // 0 = manual end only
  createdBy?: string | null;
}

export async function createPollInChannel(opts: CreatePollOpts): Promise<Poll> {
  const client = getClient();
  if (!client) throw new Error("Bot is offline");
  const channel = await client.channels.fetch(opts.channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error("Target is not a text channel");
  }
  const options = opts.options.slice(0, NUM.length);
  const endsAt = opts.durationMin > 0 ? new Date(Date.now() + opts.durationMin * 60_000) : null;

  const poll = await createPoll({
    guildId: opts.guildId,
    channelId: opts.channelId,
    question: opts.question,
    optionsJson: JSON.stringify(options),
    multi: opts.multi,
    endsAt,
    createdBy: opts.createdBy ?? null,
  });

  const lines = options.map((o, i) => `${NUM[i]} ${o}`).join("\n");
  const extra =
    (endsAt ? `\n\nEnds <t:${Math.floor(endsAt.getTime() / 1000)}:R>` : "") +
    (opts.multi ? "\n*(multiple choice)*" : "");
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${opts.question}`)
    .setColor(0x3b82f6)
    .setDescription(lines + extra);
  const message = await channel.send({ embeds: [embed] });
  for (let i = 0; i < options.length; i++) await message.react(NUM[i]).catch(() => {});
  await setMessageId(poll.id, message.id);
  await track(opts.guildId, "poll.create", {});
  return { ...poll, messageId: message.id };
}

/** Single-choice enforcement: remove the user's votes on other options. */
export async function handlePollReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  const poll = await getByMessage(reaction.message.id);
  if (!poll || poll.status !== "active" || poll.multi) return;

  const emojiName = reaction.emoji.name ?? "";
  if (!NUM.includes(emojiName)) return;

  const message = reaction.message.partial
    ? await reaction.message.fetch().catch(() => null)
    : reaction.message;
  if (!message) return;

  const options = JSON.parse(poll.optionsJson) as string[];
  for (let i = 0; i < options.length; i++) {
    if (NUM[i] === emojiName) continue;
    const r = message.reactions.cache.get(NUM[i]);
    if (r) await r.users.remove(user.id).catch(() => {});
  }
}

export async function endPoll(id: number): Promise<void> {
  const poll = await getPoll(id);
  if (!poll || poll.status !== "active") return;
  await markEnded(id);
  await track(poll.guildId, "poll.end", {});

  const client = getClient();
  if (!client || !poll.messageId) return;
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const message = await channel.messages.fetch(poll.messageId).catch(() => null);
  if (!message) return;

  const options = JSON.parse(poll.optionsJson) as string[];
  const counts = options.map((o, i) => {
    const r = message.reactions.cache.get(NUM[i]);
    return { option: o, count: r ? Math.max(0, r.count - 1) : 0 };
  });
  const total = counts.reduce((s, c) => s + c.count, 0);
  const lines = counts
    .map(
      (c, i) =>
        `${NUM[i]} ${c.option} — **${c.count}**${total ? ` (${Math.round((c.count / total) * 100)}%)` : ""}`,
    )
    .join("\n");
  const max = Math.max(0, ...counts.map((c) => c.count));
  const winners = counts.filter((c) => c.count === max && max > 0).map((c) => c.option);

  const embed = new EmbedBuilder()
    .setTitle(`📊 Results: ${poll.question}`)
    .setColor(0x22c55e)
    .setDescription(lines + (winners.length ? `\n\nWinner: **${winners.join(", ")}**` : ""));
  await channel.send({ embeds: [embed] });
}

/** Scheduler tick: end any timed polls that are due. */
export async function checkPolls(): Promise<void> {
  const due = await duePolls(Date.now());
  for (const p of due) await endPoll(p.id);
}
