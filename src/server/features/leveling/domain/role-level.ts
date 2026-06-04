// Pull a target level out of a role name. Lets a server seed leveling from roles it already
// hands out by hand — "Level 40", "Lv 40", "lvl.40", "🏆 Level 5", "lv40" all read as the number.
// Requires the lv/level keyword so plain numbers in a name ("Top 10") never match by accident.

const RE = /(?:lvl?|level)\s*\.?\s*(\d{1,4})/i;

/** The level a role name names, or null if it isn't a level role. Capped to the reward range. */
export function parseRoleLevel(roleName: string): number | null {
  const m = RE.exec(roleName);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : null;
}
