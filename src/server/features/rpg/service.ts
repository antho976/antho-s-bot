import type { Message } from "discord.js";
import { RPG, type Mob } from "./config";
import { applyXp, pickMob, rollRewards, type Rewards } from "./domain/adventure";
import { applyRegen, classDef, maxHp } from "./domain/stats";
import { updatePlayer, type RpgPlayer } from "./queries";

/** Apply lazy regen on load and persist it if anything changed. Returns the up-to-date player. */
export async function withRegen(player: RpgPlayer): Promise<RpgPlayer> {
  const r = applyRegen(player, classDef(player.classId), Date.now());
  if (r.hp === player.hp) return player;
  await updatePlayer(player.id, { hp: r.hp, lastRegenAt: r.lastRegenAt });
  return { ...player, hp: r.hp, lastRegenAt: r.lastRegenAt };
}

export type AdventureOutcome =
  | { ok: false; remainingMs: number }
  | { ok: true; player: RpgPlayer; mob: Mob; rewards: Rewards; leveledTo: number | null };

/**
 * Run one Adventure: enforce the cooldown (lazy timestamp check, no timer), roll a mob + rewards,
 * apply XP/level-ups, and persist. Heals to full on level-up (adventures deal no damage anyway).
 */
export async function runAdventure(player: RpgPlayer): Promise<AdventureOutcome> {
  const now = Date.now();
  const last = player.lastAdventureAt ? player.lastAdventureAt.getTime() : 0;
  const remaining = RPG.adventureCooldownMs - (now - last);
  if (remaining > 0) return { ok: false, remainingMs: remaining };

  const mob = pickMob(player.level);
  const rewards = rollRewards(mob);
  const leveled = applyXp(player.level, player.xp, rewards.xp);
  const leveledTo = leveled.levelsGained > 0 ? leveled.level : null;
  const cls = classDef(player.classId);

  const patch = {
    xp: leveled.xp,
    level: leveled.level,
    keys: player.keys + rewards.keys,
    lastAdventureAt: new Date(now),
    ...(leveledTo ? { hp: maxHp(cls, leveled.level) } : {}),
  };
  await updatePlayer(player.id, patch);
  return { ok: true, player: { ...player, ...patch }, mob, rewards, leveledTo };
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
