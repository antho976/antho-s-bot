import type { Message } from "discord.js";
import { applyRegen, classDef } from "./domain/stats";
import { updatePlayer, type RpgPlayer } from "./queries";

/** Apply lazy regen on load and persist it if anything changed. Returns the up-to-date player. */
export async function withRegen(player: RpgPlayer): Promise<RpgPlayer> {
  const r = applyRegen(player, classDef(player.classId), Date.now());
  if (r.hp === player.hp) return player;
  await updatePlayer(player.id, { hp: r.hp, lastRegenAt: r.lastRegenAt });
  return { ...player, hp: r.hp, lastRegenAt: r.lastRegenAt };
}

/**
 * Keep one live hub board per player: delete the previous hub message (best-effort) and remember
 * the new one. Navigation edits the same message in place, so this only fires on a fresh /rpg.
 */
export async function rememberHubMessage(player: RpgPlayer, message: Message): Promise<void> {
  if (
    player.lastHubMessageId &&
    player.lastHubChannelId &&
    player.lastHubMessageId !== message.id
  ) {
    try {
      const ch = await message.client.channels.fetch(player.lastHubChannelId);
      if (ch?.isTextBased()) {
        const old = await ch.messages.fetch(player.lastHubMessageId);
        await old.delete();
      }
    } catch {
      // already gone / not deletable — fine
    }
  }
  await updatePlayer(player.id, {
    lastHubChannelId: message.channelId,
    lastHubMessageId: message.id,
  });
}
