// Pure adventure resolution — no IO, unit-testable. The service composes these + persists.
import { MOBS, RPG, type Difficulty, type Mob } from "../config";
import { xpForLevel } from "./stats";

export type Rewards = { xp: number; gold: number; keys: number };
export type LevelResult = { level: number; xp: number; levelsGained: number };
export type Fight = { rounds: number; hpLost: number; defeated: boolean };

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Pick a roaming mob around the player's level (flavor only — combat stats come from level). */
export function pickMob(level: number, rng: () => number = Math.random): Mob {
  const eligible = MOBS.filter((m) => m.level <= level + 1);
  const pool = eligible.length ? eligible : [MOBS[0]];
  return pool[randInt(0, pool.length - 1, rng)];
}

/** Your damage per round. Equipped weapon damage adds here later (the seam so gear matters). */
export function playerDamage(level: number): number {
  return RPG.atkBase + RPG.atkPerLevel * (level - 1); // + equipped weapon (0 for now)
}

/** Mob health + damage, scaled off your level and the difficulty. */
export function mobStats(level: number, diff: Difficulty): { hp: number; dmg: number } {
  const hp = Math.round((RPG.mobHpBase + RPG.mobHpPerLevel * (level - 1)) * diff.hpMult);
  const dmg = Math.round((RPG.mobDmgBase + RPG.mobDmgPerLevel * (level - 1)) * diff.dmgMult);
  return { hp: Math.max(1, hp), dmg: Math.max(1, dmg) };
}

/**
 * Resolve a fight: rounds to kill the mob = ceil(mobHp / yourDamage); the mob hits you (rounds − 1)
 * times (3 hits to kill → 2 hits taken). If that damage would down you, it's a defeat.
 */
export function resolveFight(level: number, currentHp: number, diff: Difficulty): Fight {
  const { hp, dmg } = mobStats(level, diff);
  const rounds = Math.max(1, Math.ceil(hp / Math.max(1, playerDamage(level))));
  const hpLost = dmg * (rounds - 1);
  return { rounds, hpLost, defeated: hpLost >= currentHp };
}

/** XP/gold scale with level × difficulty (±15% spread); keys roll at the difficulty's chance. */
export function rollRewards(level: number, diff: Difficulty, rng: () => number = Math.random): Rewards {
  const spread = () => 0.85 + rng() * 0.3;
  const xp = Math.round((RPG.rewardXpBase + RPG.rewardXpPerLevel * (level - 1)) * diff.xpMult * spread());
  const gold = Math.round((RPG.rewardGoldBase + RPG.rewardGoldPerLevel * (level - 1)) * diff.goldMult * spread());
  const keys = rng() < diff.keyChance ? 1 : 0;
  return { xp: Math.max(1, xp), gold: Math.max(1, gold), keys };
}

/** Apply gained XP, rolling over as many levels as it covers (curve via xpForLevel). */
export function applyXp(level: number, xp: number, gained: number): LevelResult {
  let lvl = level;
  let cur = xp + gained;
  let levelsGained = 0;
  while (cur >= xpForLevel(lvl)) {
    cur -= xpForLevel(lvl);
    lvl += 1;
    levelsGained += 1;
  }
  return { level: lvl, xp: cur, levelsGained };
}
