// Aggregate a player's combat stats from class + level + allocated passive nodes. This is the
// StatBlock the adventure resolver reads (and the dungeon engine + weapons will read later).
import { classDef } from "../domain/stats";
import { getTree } from "./trees";

export type StatBlock = {
  damage: number; // per round, before crit
  critChance: number; // 0..1
  critMult: number; // multiplier on a crit (1.5 = +50%)
  lifesteal: number; // 0..1 of damage dealt, healed back
  dodge: number; // 0..1 chance to avoid a hit
  dmgReduction: number; // 0..1
};

export function computeStats(classId: string, level: number, allocated: string[]): StatBlock {
  const cls = classDef(classId);
  const stats: StatBlock = {
    damage: cls.atkBase + cls.atkPerLevel * (level - 1),
    critChance: 0.05,
    critMult: 1.5,
    lifesteal: 0,
    dodge: 0,
    dmgReduction: 0,
  };

  const tree = getTree(classId);
  if (tree) {
    const owned = new Set(allocated);
    for (const node of tree.nodes) {
      if (!node.effect || !owned.has(node.id)) continue;
      for (const [key, value] of Object.entries(node.effect)) {
        stats[key as keyof StatBlock] += value;
      }
    }
  }

  // Keep the probabilistic stats sane.
  stats.critChance = Math.min(1, stats.critChance);
  stats.dodge = Math.min(0.8, stats.dodge);
  stats.dmgReduction = Math.min(0.8, stats.dmgReduction);
  return stats;
}
