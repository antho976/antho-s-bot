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

export type Harvest = {
  hits: number;
  units: number; // resources gained (efficiency × rating × double, expected-value)
  xpGained: number;
  usedMs: number; // elapsed actually counted (after the cap)
  wasCapped: boolean;
};

/**
 * Idle harvest over `elapsedMs` for one skill in one area. Expected-value smoothed (no per-action
 * RNG) so an idle session is deterministic and the preview matches what you collect.
 */
export function computeHarvest(
  elapsedMs: number,
  ratingMult: number,
  resourceXp: number,
  rates: Rates,
): Harvest {
  const used = Math.min(Math.max(0, elapsedMs), rates.capMs);
  const actionMs = GATHER.baseActionMs / Math.max(0.1, rates.speed);
  const hits = Math.floor(used / actionMs);
  const perHit = rates.efficiency * ratingMult * (1 + rates.doubleChance);
  const units = Math.floor(hits * perHit);
  const xpGained = Math.round(hits * resourceXp * ratingMult);
  return { hits, units, xpGained, usedMs: used, wasCapped: elapsedMs > rates.capMs };
}
