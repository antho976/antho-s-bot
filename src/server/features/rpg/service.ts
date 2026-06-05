import type { Message } from "discord.js";
import { DEV_TOOLS } from "@/env";
import { RPG, type Difficulty, type Mob } from "./config";
import { applyXp, pickMob, resolveFight, rollRewards } from "./domain/adventure";
import { applyRegen, classDef, maxHp } from "./domain/stats";
import { computeStats } from "./skills/compute";
import { isAllocatable } from "./skills/graph";
import { getTree } from "./skills/trees";
import {
  addItem,
  allocateNode,
  getAllocatedNodeIds,
  updatePlayer,
  type RpgPlayer,
} from "./queries";

/** Apply lazy regen on load and persist it if anything changed. Returns the up-to-date player. */
export async function withRegen(player: RpgPlayer): Promise<RpgPlayer> {
  const r = applyRegen(player, classDef(player.classId), Date.now());
  if (r.hp === player.hp) return player;
  await updatePlayer(player.id, { hp: r.hp, lastRegenAt: r.lastRegenAt });
  return { ...player, hp: r.hp, lastRegenAt: r.lastRegenAt };
}

export type AdventureReport = {
  mob: Mob;
  difficulty: Difficulty;
  defeated: boolean;
  rounds: number;
  hpLost: number;
  hp: number;
  maxHp: number;
  xp: number;
  gold: number;
  keys: number;
  leveledTo: number | null;
};

export type AdventureOutcome =
  | { ok: false; remainingMs: number }
  | { ok: true; player: RpgPlayer; report: AdventureReport };

/**
 * Run one Adventure at a chosen difficulty: enforce the cooldown, resolve the fight (mob health vs
 * your damage), and persist. Lose → no rewards, dropped to 1 HP. Win → XP/gold/keys scaled by
 * difficulty, minus the HP you took; a level-up heals you to full as a bonus. Cooldown is spent
 * either way. Keys are awarded as an inventory item.
 */
export async function runAdventure(
  player: RpgPlayer,
  difficulty: Difficulty,
): Promise<AdventureOutcome> {
  const now = Date.now();
  const last = player.lastAdventureAt ? player.lastAdventureAt.getTime() : 0;
  const remaining = DEV_TOOLS ? 0 : RPG.adventureCooldownMs - (now - last);
  if (remaining > 0) return { ok: false, remainingMs: remaining };

  const cls = classDef(player.classId);
  const allocated = await getAllocatedNodeIds(player.id);
  const stats = computeStats(player.classId, player.level, allocated);
  const mob = pickMob(player.level);
  const fight = resolveFight(stats, player.hp, player.level, difficulty);

  if (fight.defeated) {
    const patch = { hp: 1, lastAdventureAt: new Date(now) };
    await updatePlayer(player.id, patch);
    return {
      ok: true,
      player: { ...player, ...patch },
      report: {
        mob,
        difficulty,
        defeated: true,
        rounds: fight.rounds,
        hpLost: player.hp - 1,
        hp: 1,
        maxHp: maxHp(cls, player.level),
        xp: 0,
        gold: 0,
        keys: 0,
        leveledTo: null,
      },
    };
  }

  const rewards = rollRewards(player.level, difficulty);
  const leveled = applyXp(player.level, player.xp, rewards.xp);
  const leveledTo = leveled.levelsGained > 0 ? leveled.level : null;
  const newMaxHp = maxHp(cls, leveled.level);
  const hp = leveledTo ? newMaxHp : Math.max(1, player.hp - fight.hpLost);

  const patch = {
    xp: leveled.xp,
    level: leveled.level,
    gold: player.gold + rewards.gold,
    hp,
    lastAdventureAt: new Date(now),
  };
  await updatePlayer(player.id, patch);
  if (rewards.keys > 0) await addItem(player.id, "key", rewards.keys);

  return {
    ok: true,
    player: { ...player, ...patch },
    report: {
      mob,
      difficulty,
      defeated: false,
      rounds: fight.rounds,
      hpLost: fight.hpLost,
      hp,
      maxHp: newMaxHp,
      xp: rewards.xp,
      gold: rewards.gold,
      keys: rewards.keys,
      leveledTo,
    },
  };
}

/** Allocate a skill node if it's reachable (PoE pathing) and a point is free. No-op otherwise. */
export async function allocateSkill(player: RpgPlayer, nodeId: string): Promise<void> {
  const tree = getTree(player.classId);
  if (!tree) return;
  const stored = await getAllocatedNodeIds(player.id);
  if (stored.includes(nodeId)) return;
  if (player.level - stored.length <= 0) return; // no points free
  const allocated = new Set([tree.root, ...stored]);
  if (!isAllocatable(tree, allocated, nodeId)) return;
  await allocateNode(player.id, nodeId);
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
