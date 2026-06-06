import { type Message } from "discord.js";
import { track } from "@/server/core/analytics";
import { logger } from "@/server/core/logger";
import { chatCompletion, hasOpenRouterKey } from "@/server/integrations/openrouter/client";
import { decideReply } from "./domain/decide";
import { isReplyWorthy } from "./domain/filter";
import { buildChatMessages, type HistoryItem } from "./domain/prompt";
import { getConfig, listMemoryContent, parseChannels } from "./queries";

// Runtime-only throttling state (intentionally not persisted — resetting on restart is fine and
// keeps the message path DB-write-free). Cooldown is per channel; the daily cap is per guild.
const lastReplyAt = new Map<string, number>();
const daily = new Map<string, { day: string; count: number }>();
const todayKey = () => new Date().toISOString().slice(0, 10);

/** MessageCreate handler: decide whether to chime in, then generate + send a reply. */
export async function handleSmartReply(message: Message): Promise<void> {
  if (!message.inGuild()) return;
  const me = message.client.user;
  if (!me || message.author.id === me.id) return; // never reply to ourselves (loop guard)

  let config;
  try {
    config = await getConfig(message.guildId);
  } catch {
    return;
  }
  if (!config.enabled || !hasOpenRouterKey()) return;
  if (config.ignoreBots && message.author.bot) return;

  const allowed = parseChannels(config.allowedChannelsJson);
  if (allowed.length > 0 && !allowed.includes(message.channelId)) return;

  const isMention = config.replyOnMention && message.mentions.users.has(me.id);
  const decision = decideReply({
    isMention,
    worthy: isReplyWorthy(message.content, config.minMessageLength),
    replyChance: config.replyChance,
    roll: Math.random() * 100,
  });
  if (!decision.reply) return;

  // Mentions bypass the cooldown (an explicit ping should always land) but still respect the
  // daily cap so a runaway can't blow through OpenRouter's free-tier limits.
  if (!isMention) {
    const last = lastReplyAt.get(message.channelId);
    if (last !== undefined && Date.now() - last < config.cooldownSeconds * 1000) return;
  }
  if (config.dailyCap > 0) {
    const d = daily.get(message.guildId);
    if (d && d.day === todayKey() && d.count >= config.dailyCap) return;
  }

  try {
    const [memory, history] = await Promise.all([
      listMemoryContent(message.guildId),
      fetchHistory(message, config.contextMessages, me.id),
    ]);

    const messages = buildChatMessages({
      botName: config.botName,
      persona: config.persona,
      memory,
      history,
    });

    await message.channel.sendTyping().catch(() => {});

    const text = await chatCompletion({
      model: config.model,
      messages,
      maxTokens: Math.max(64, Math.ceil(config.maxReplyChars / 3)),
    });
    if (!text) return;

    await message.reply({
      content: text.slice(0, config.maxReplyChars),
      allowedMentions: { parse: [] }, // never let generated text ping roles/@everyone
    });

    lastReplyAt.set(message.channelId, Date.now());
    bumpDaily(message.guildId);
    await track(message.guildId, "smartreply.reply", {
      reason: decision.reason,
      model: config.model,
    });
  } catch (err) {
    logger.warn("smart-reply", "Failed to generate or send reply", err);
  }
}

function bumpDaily(guildId: string): void {
  const day = todayKey();
  const d = daily.get(guildId);
  if (d && d.day === day) d.count += 1;
  else daily.set(guildId, { day, count: 1 });
}

/** Fetch the last N messages (chronological) plus the triggering message, for context. */
async function fetchHistory(
  message: Message<true>,
  limit: number,
  selfId: string,
): Promise<HistoryItem[]> {
  const items: HistoryItem[] = [];
  try {
    const fetched = await message.channel.messages.fetch({
      limit: Math.min(Math.max(limit, 1), 50),
      before: message.id,
    });
    for (const m of [...fetched.values()].reverse()) {
      const content = m.cleanContent.trim();
      if (!content) continue;
      items.push({ authorName: displayName(m), content, isSelf: m.author.id === selfId });
    }
  } catch {
    // Context is best-effort — a fetch failure just means a thinner prompt.
  }

  const current = message.cleanContent.trim();
  items.push({
    authorName: displayName(message),
    content: current || "(pinged you with no other text)",
    isSelf: false,
  });
  return items;
}

function displayName(m: Message): string {
  return m.member?.displayName ?? m.author.username;
}
