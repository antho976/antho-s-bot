import type { MessageCreateOptions } from "discord.js";
import { getClient } from "./client";

/**
 * Sends a message to a text channel by id. Returns false (instead of throwing) when the bot is
 * offline or the channel is missing/unusable — callers treat sending as best-effort.
 */
export async function sendToChannel(
  channelId: string,
  payload: MessageCreateOptions,
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) return false;
    await channel.send(payload);
    return true;
  } catch {
    return false;
  }
}
