// Small presentation helpers shared by /rank and the leaderboards. Pure — safe to unit-test.

/** A text progress bar, e.g. `███████░░░░░░░` for 50%. */
export function progressBar(pct: number, width = 16): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** Minutes → "45 min" / "2h 3m" / "4h". */
export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Medal for the top three places, a bold ordinal otherwise (i is 0-based). */
export function rankPrefix(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `**${i + 1}.**`;
}

export const DEFAULT_LEVEL_UP_MESSAGE = "🎉 {user} reached **level {level}**!";

/**
 * Render a level-up announcement from a (possibly blank) template. `{user}` is replaced with the
 * caller-supplied token (a mention or a plain name) and `{level}` with the level number.
 */
export function renderLevelUp(
  template: string | null | undefined,
  user: string,
  level: number,
): string {
  const t = template?.trim() || DEFAULT_LEVEL_UP_MESSAGE;
  return t.replaceAll("{user}", user).replaceAll("{level}", String(level));
}
