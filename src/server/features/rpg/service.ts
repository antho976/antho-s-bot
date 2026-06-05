import type { Message } from "discord.js";
import { DEV_TOOLS } from "@/env";
import { DIFFICULTIES, DIFFICULTY_MAP, RPG, type Difficulty, type Mob } from "./config";
import {
  applyXp,
  computeCharges,
  makeEncMob,
  pickMob,
  resolveFight,
  resolveRound,
  rollEncounterSize,
  rollRewards,
  type EncMob,
} from "./domain/adventure";
import { equippedWeaponDamage } from "./blacksmith";
import { applyRegen, classDef, maxHp } from "./domain/stats";
import { computeStats, type StatBlock } from "./skills/compute";
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
  fled: boolean;
  packSize: number; // 1 = single foe (auto-resolved); >1 = a pack fought turn-by-turn
  rounds: number;
  hpLost: number;
  hp: number;
  maxHp: number;
  xp: number;
  gold: number;
  keys: number;
  leveledTo: number | null;
};

/** A live turn-based pack fight, persisted as JSON on the player between button clicks. */
export type Encounter = {
  difficultyId: string;
  mobs: EncMob[];
  playerHp: number;
  startSize: number;
  rounds: number;
  log: string[];
};

export type Charges = { charges: number; max: number; nextInMs: number };

export type AdventureOutcome =
  | { kind: "no_charge"; nextInMs: number }
  | { kind: "result"; player: RpgPlayer; report: AdventureReport }
  | { kind: "encounter"; player: RpgPlayer; encounter: Encounter };

/** Your effective combat stats: skill-tree passives + the equipped weapon's damage. */
async function playerStats(player: RpgPlayer): Promise<StatBlock> {
  const allocated = await getAllocatedNodeIds(player.id);
  const stats = computeStats(player.classId, player.level, allocated);
  stats.damage += await equippedWeaponDamage(player); // the equipped-weapon seam, now filled
  return stats;
}

/** Lazy-refill adventure charges on read; persist (advancing the clock anchor) if the count changed. */
export async function withCharges(
  player: RpgPlayer,
): Promise<{ player: RpgPlayer; charges: Charges }> {
  const max = RPG.maxAdventureCharges;
  if (DEV_TOOLS) return { player, charges: { charges: max, max, nextInMs: 0 } };
  const now = Date.now();
  const cs = computeCharges(player.adventureCharges, player.adventureChargeAt?.getTime() ?? now, now);
  if (cs.charges !== player.adventureCharges) {
    const patch = { adventureCharges: cs.charges, adventureChargeAt: new Date(cs.chargeAt) };
    await updatePlayer(player.id, patch);
    player = { ...player, ...patch };
  }
  return { player, charges: { charges: cs.charges, max, nextInMs: cs.nextInMs } };
}

/**
 * Begin an adventure: spend a charge, then roll the encounter size. A single foe auto-resolves into a
 * result (mob health vs your damage); a pack of 2+ opens a turn-based Encounter the player drives via
 * fightRound. The dev bot skips the charge cost. Returns `no_charge` (with the refill ETA) when tapped out.
 */
export async function startAdventure(
  player: RpgPlayer,
  difficulty: Difficulty,
): Promise<AdventureOutcome> {
  const now = Date.now();
  let chargePatch: { adventureCharges?: number; adventureChargeAt?: Date } = {};
  if (!DEV_TOOLS) {
    const cs = computeCharges(player.adventureCharges, player.adventureChargeAt?.getTime() ?? now, now);
    if (cs.charges <= 0) return { kind: "no_charge", nextInMs: cs.nextInMs };
    // Spend one and restart the refill clock for the slot just freed.
    chargePatch = { adventureCharges: cs.charges - 1, adventureChargeAt: new Date(now) };
  }

  const cls = classDef(player.classId);
  const stats = await playerStats(player);
  const size = rollEncounterSize(difficulty);

  if (size === 1) {
    const mob = pickMob(player.level);
    const fight = resolveFight(stats, player.hp, player.level, difficulty);
    if (fight.defeated) {
      const patch = { ...chargePatch, hp: 1, lastAdventureAt: new Date(now), adventureEncounterJson: null };
      await updatePlayer(player.id, patch);
      return {
        kind: "result",
        player: { ...player, ...patch },
        report: {
          mob, difficulty, defeated: true, fled: false, packSize: 1, rounds: fight.rounds,
          hpLost: player.hp - 1, hp: 1, maxHp: maxHp(cls, player.level),
          xp: 0, gold: 0, keys: 0, leveledTo: null,
        },
      };
    }
    const rewards = rollRewards(player.level, difficulty);
    const leveled = applyXp(player.level, player.xp, rewards.xp);
    const leveledTo = leveled.levelsGained > 0 ? leveled.level : null;
    const newMaxHp = maxHp(cls, leveled.level);
    const hp = leveledTo ? newMaxHp : Math.max(1, player.hp - fight.hpLost);
    const patch = {
      ...chargePatch, xp: leveled.xp, level: leveled.level, gold: player.gold + rewards.gold,
      hp, lastAdventureAt: new Date(now), adventureEncounterJson: null,
    };
    await updatePlayer(player.id, patch);
    if (rewards.keys > 0) await addItem(player.id, "key", rewards.keys);
    return {
      kind: "result",
      player: { ...player, ...patch },
      report: {
        mob, difficulty, defeated: false, fled: false, packSize: 1, rounds: fight.rounds,
        hpLost: fight.hpLost, hp, maxHp: newMaxHp,
        xp: rewards.xp, gold: rewards.gold, keys: rewards.keys, leveledTo,
      },
    };
  }

  // Pack: open a turn-based encounter and persist it; the player drives it with fightRound.
  const mobs = Array.from({ length: size }, () => makeEncMob(player.level, difficulty));
  const encounter: Encounter = {
    difficultyId: difficulty.id, mobs, playerHp: player.hp, startSize: size, rounds: 0,
    log: [`👹 A pack of **${size}** ${difficulty.label} foes closes in!`],
  };
  const patch = {
    ...chargePatch, lastAdventureAt: new Date(now), adventureEncounterJson: JSON.stringify(encounter),
  };
  await updatePlayer(player.id, patch);
  return { kind: "encounter", player: { ...player, ...patch }, encounter };
}

/** Resolve one round of the active encounter. Returns the ongoing encounter, or a win/lose result. */
export async function fightRound(player: RpgPlayer): Promise<AdventureOutcome | null> {
  if (!player.adventureEncounterJson) return null;
  const enc = JSON.parse(player.adventureEncounterJson) as Encounter;
  const difficulty = DIFFICULTY_MAP[enc.difficultyId] ?? DIFFICULTIES[0];
  const cls = classDef(player.classId);
  const stats = await playerStats(player);

  const r = resolveRound(stats, enc.mobs, enc.playerHp);
  const cap = maxHp(cls, player.level);
  const hpNow = Math.min(cap, Math.max(0, r.playerHp));
  enc.rounds += 1;
  enc.mobs = r.mobs;
  enc.playerHp = hpNow;
  enc.log = [...enc.log, ...r.log].slice(-6);
  const lead = enc.mobs.find((m) => m.hp > 0) ?? enc.mobs[0] ?? { name: "foe", emoji: "👹" };
  const repMob: Mob = { name: lead.name, emoji: lead.emoji, level: player.level };

  if (r.outcome === "win") {
    let xp = 0, gold = 0, keys = 0;
    for (let i = 0; i < enc.startSize; i++) {
      const rw = rollRewards(player.level, difficulty);
      xp += rw.xp; gold += rw.gold; keys += rw.keys;
    }
    const leveled = applyXp(player.level, player.xp, xp);
    const leveledTo = leveled.levelsGained > 0 ? leveled.level : null;
    const newMaxHp = maxHp(cls, leveled.level);
    const hp = leveledTo ? newMaxHp : Math.min(newMaxHp, hpNow);
    const patch = {
      xp: leveled.xp, level: leveled.level, gold: player.gold + gold, hp, adventureEncounterJson: null,
    };
    await updatePlayer(player.id, patch);
    if (keys > 0) await addItem(player.id, "key", keys);
    return {
      kind: "result",
      player: { ...player, ...patch },
      report: {
        mob: repMob, difficulty, defeated: false, fled: false, packSize: enc.startSize,
        rounds: enc.rounds, hpLost: Math.max(0, player.hp - hp), hp, maxHp: newMaxHp,
        xp, gold, keys, leveledTo,
      },
    };
  }

  if (r.outcome === "lose") {
    const patch = { hp: 1, adventureEncounterJson: null };
    await updatePlayer(player.id, patch);
    return {
      kind: "result",
      player: { ...player, ...patch },
      report: {
        mob: repMob, difficulty, defeated: true, fled: false, packSize: enc.startSize,
        rounds: enc.rounds, hpLost: player.hp - 1, hp: 1, maxHp: cap,
        xp: 0, gold: 0, keys: 0, leveledTo: null,
      },
    };
  }

  const patch = { hp: hpNow, adventureEncounterJson: JSON.stringify(enc) };
  await updatePlayer(player.id, patch);
  return { kind: "encounter", player: { ...player, ...patch }, encounter: enc };
}

/** Retreat from the active encounter: no rewards, no parting damage — you just bail. */
export async function fleeEncounter(player: RpgPlayer): Promise<AdventureOutcome | null> {
  if (!player.adventureEncounterJson) return null;
  const enc = JSON.parse(player.adventureEncounterJson) as Encounter;
  const difficulty = DIFFICULTY_MAP[enc.difficultyId] ?? DIFFICULTIES[0];
  const cls = classDef(player.classId);
  const patch = { adventureEncounterJson: null };
  await updatePlayer(player.id, patch);
  const lead = enc.mobs.find((m) => m.hp > 0) ?? enc.mobs[0] ?? { name: "foe", emoji: "👹" };
  return {
    kind: "result",
    player: { ...player, ...patch },
    report: {
      mob: { name: lead.name, emoji: lead.emoji, level: player.level },
      difficulty, defeated: false, fled: true, packSize: enc.startSize, rounds: enc.rounds,
      hpLost: 0, hp: player.hp, maxHp: maxHp(cls, player.level),
      xp: 0, gold: 0, keys: 0, leveledTo: null,
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
