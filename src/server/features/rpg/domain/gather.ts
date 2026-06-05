// Pure gathering math — no IO, unit-testable. The service composes these with config + persistence.
import { GATHER } from "../gather-config";

/** XP to advance a gathering skill from `level` to `level + 1`. */
export function gatherReqForLevel(level: number): number {
  return Math.floor(GATHER.xpBase * Math.pow(level, GATHER.xpFactor));
}

export type GatherProgress = { level: number; into: number; needed: number };

/** Resolve a skill's level + within-level progress from cumulative xp (level starts at 1). */
export function gatherProgress(totalXp: number): GatherProgress {
  let level = 1;
  let acc = 0;
  let needed = gatherReqForLevel(level);
  while (totalXp >= acc + needed && level < GATHER.maxLevel) {
    acc += needed;
    level += 1;
    needed = gatherReqForLevel(level);
  }
  return { level, into: totalXp - acc, needed };
}

export function gatherLevel(totalXp: number): number {
  return gatherProgress(totalXp).level;
}

/** Effective harvest rates after tool + per-skill talents are folded in. */
export type Rates = { speed: number; efficiency: number; doubleChance: number; capMs: number };

/** One weighted entry in an area's drop table for a skill. */
export type DropEntry = { resourceId: string; weight: number; xp: number };

export type Harvest = {
  hits: number;
  drops: { resourceId: string; units: number }[];
  totalUnits: number;
  xpGained: number;
  usedMs: number; // elapsed actually counted (after the cap)
  wasCapped: boolean;
};

/**
 * Idle harvest over `elapsedMs` for one skill in one area, spread across the area's weighted drop
 * table. Expected-value smoothed (no per-action RNG) so an idle session is deterministic and the
 * preview matches what you collect. Crucially this is pure time math — it counts real elapsed time
 * whether or not the bot was online for it.
 */
export function computeHarvest(elapsedMs: number, table: DropEntry[], rates: Rates): Harvest {
  const used = Math.min(Math.max(0, elapsedMs), rates.capMs);
  const actionMs = GATHER.baseActionMs / Math.max(0.1, rates.speed);
  const hits = Math.floor(used / actionMs);
  const sumW = table.reduce((a, t) => a + t.weight, 0) || 1;

  const totalPerHit = rates.efficiency * (1 + rates.doubleChance);
  const totalUnitsRaw = hits * totalPerHit;

  const drops = table
    .map((t) => ({ resourceId: t.resourceId, units: Math.floor((totalUnitsRaw * t.weight) / sumW) }))
    .filter((d) => d.units > 0);

  const xpPerHit = table.reduce((a, t) => a + (t.weight / sumW) * t.xp, 0);
  const xpGained = Math.round(hits * xpPerHit);
  const totalUnits = drops.reduce((a, d) => a + d.units, 0);

  return { hits, drops, totalUnits, xpGained, usedMs: used, wasCapped: elapsedMs > rates.capMs };
}
