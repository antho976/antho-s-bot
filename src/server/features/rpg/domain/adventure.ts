// Pure adventure resolution — no IO, unit-testable. The service composes these + persists.
import { MOBS, RPG, type Mob } from "../config";
import { xpForLevel } from "./stats";

export type Rewards = { xp: number; keys: number };
export type LevelResult = { level: number; xp: number; levelsGained: number };

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Pick a roaming mob around the player's level (anything up to level+1). */
export function pickMob(level: number, rng: () => number = Math.random): Mob {
  const eligible = MOBS.filter((m) => m.level <= level + 1);
  const pool = eligible.length ? eligible : [MOBS[0]];
  return pool[randInt(0, pool.length - 1, rng)];
}

/** XP scales with the mob's level (±15% spread); keys drop at a flat chance. No gold by design. */
export function rollRewards(mob: Mob, rng: () => number = Math.random): Rewards {
  const base = RPG.adventureXpBase + mob.level * RPG.adventureXpPerLevel;
  const xp = Math.max(1, Math.round(base * (0.85 + rng() * 0.3)));
  const keys = rng() < RPG.keyDropChance ? 1 : 0;
  return { xp, keys };
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
