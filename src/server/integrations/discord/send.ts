import type { Message, MessageCreateOptions, MessageEditOptions } from "discord.js";
import { getClient } from "./client";

async function fetchSendable(channelId: string) {
  const client = getClient();
  if (!client) return null;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) return null;
    return channel;
  } catch {
    return null;
  }
}

/**
 * Sends a message and returns it (null when the bot is offline or the channel is
 * missing/unusable) — callers treat sending as best-effort.
 */
export async function sendMessage(
  channelId: string,
  payload: MessageCreateOptions,
): Promise<Message | null> {
  const channel = await fetchSendable(channelId);
  if (!channel) return null;
  try {
    return await channel.send(payload);
  } catch {
    return null;
  }
}

/** Like sendMessage, for callers that only care whether it went out. */
export async function sendToChannel(
  channelId: string,
  payload: MessageCreateOptions,
): Promise<boolean> {
  return (await sendMessage(channelId, payload)) !== null;
}

/** Edit a previously-sent message in place (e.g. live-stats refresh). Best-effort. */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: MessageEditOptions,
): Promise<boolean> {
  const channel = await fetchSendable(channelId);
  if (!channel) return false;
  try {
    const message = await channel.messages.fetch(messageId);
    await message.edit(payload);
    return true;
  } catch {
    return false;
  }
}
