export interface CurveConfig {
  curveType: string; // 'multiplier' | 'custom'
  curveBase: number;
  curveFactor: number;
}

/** XP needed to advance FROM `level` to `level + 1`. */
export function xpForLevel(
  level: number,
  c: CurveConfig,
  custom?: Map<number, number>,
): number {
  if (c.curveType === "custom" && custom?.has(level + 1)) {
    return custom.get(level + 1)!;
  }
  return Math.max(1, Math.round(c.curveBase * Math.pow(c.curveFactor, level)));
}

export interface Progress {
  level: number;
  into: number; // xp earned within the current level
  needed: number; // xp required to finish the current level
}

/** Resolve level + within-level progress for a cumulative XP total. */
export function progressFromXp(
  totalXp: number,
  c: CurveConfig,
  custom?: Map<number, number>,
): Progress {
  let level = 0;
  let acc = 0;
  let needed = xpForLevel(0, c, custom);
  while (totalXp >= acc + needed && level < 1000) {
    acc += needed;
    level++;
    needed = xpForLevel(level, c, custom);
  }
  return { level, into: totalXp - acc, needed };
}

export function levelFromXp(
  totalXp: number,
  c: CurveConfig,
  custom?: Map<number, number>,
): number {
  return progressFromXp(totalXp, c, custom).level;
}
