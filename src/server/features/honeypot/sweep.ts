import {
  PermissionFlagsBits,
  type Guild,
  type GuildTextBasedChannel,
  type Message,
} from "discord.js";

const PAGES_PER_CHANNEL = 5; // up to 500 recent messages scanned per channel — bounds the cost

/**
 * Delete a user's messages across every readable text channel within the lookback window.
 * Discord has no "all messages by a user" API, so we scan channels and bulk-delete (which only
 * works for messages under 14 days — our window is minutes). Pagination stops as soon as a
 * channel's messages fall outside the window. Returns how many messages were deleted.
 */
export async function purgeRecentMessages(
  guild: Guild,
  userId: string,
  lookbackMs: number,
): Promise<number> {
  if (lookbackMs <= 0) return 0;
  const me = guild.members.me;
  if (!me) return 0;

  const cutoff = Date.now() - lookbackMs;
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return 0;

  let deleted = 0;
  for (const channel of channels.values()) {
    if (!channel || !channel.isTextBased()) continue;
    const text = channel as GuildTextBasedChannel;

    const perms = text.permissionsFor(me);
    if (
      !perms?.has(PermissionFlagsBits.ViewChannel) ||
      !perms.has(PermissionFlagsBits.ReadMessageHistory) ||
      !perms.has(PermissionFlagsBits.ManageMessages)
    ) {
      continue;
    }

    deleted += await purgeChannel(text, userId, cutoff);
  }
  return deleted;
}

async function purgeChannel(
  channel: GuildTextBasedChannel,
  userId: string,
  cutoff: number,
): Promise<number> {
  const targets: Message[] = [];
  let before: string | undefined;

  for (let page = 0; page < PAGES_PER_CHANNEL; page++) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;

    let reachedOld = false;
    for (const m of batch.values()) {
      if (m.createdTimestamp < cutoff) reachedOld = true;
      else if (m.author.id === userId) targets.push(m);
    }
    before = batch.last()?.id;
    if (reachedOld || batch.size < 100) break;
  }

  let deleted = 0;
  for (let i = 0; i < targets.length; i += 100) {
    const done = await channel.bulkDelete(targets.slice(i, i + 100), true).catch(() => null);
    deleted += done?.size ?? 0;
  }
  return deleted;
}
