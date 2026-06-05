// Pure adventure resolution — no IO, unit-testable. The service composes these + persists.
import { MOBS, RPG, type Difficulty, type Mob } from "../config";
import type { StatBlock } from "../skills/compute";
import { xpForLevel } from "./stats";

export type Rewards = { xp: number; gold: number; keys: number };
export type LevelResult = { level: number; xp: number; levelsGained: number };
export type Fight = { rounds: number; hpLost: number; defeated: boolean };

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ── Adventure charges ────────────────────────────────────────────────────────────────────────────
// You bank up to RPG.maxAdventureCharges plays. Refilling the Nth charge takes chargeStepMs × N, so
// the clock slows as you hoard. State is (charges, chargeAt); we recompute lazily on read.

/** Time to refill into stack `n` (1-based): 5/10/15/20/25 min for n = 1..5. */
export function chargeIntervalMs(n: number): number {
  return RPG.chargeStepMs * n;
}

export type ChargeState = { charges: number; chargeAt: number; nextInMs: number };

/**
 * Roll a stored (charges, chargeAt) forward to `now`. Each filled charge advances the anchor by its
 * own interval (carryover between charges); at max the clock idles. `nextInMs` is 0 when full.
 */
export function computeCharges(charges: number, chargeAtMs: number, now: number): ChargeState {
  const max = RPG.maxAdventureCharges;
  let c = Math.min(charges, max);
  let t = chargeAtMs || now;
  while (c < max) {
    const need = chargeIntervalMs(c + 1);
    if (now - t >= need) {
      c += 1;
      t += need;
    } else break;
  }
  if (c >= max) return { charges: max, chargeAt: now, nextInMs: 0 };
  return { charges: c, chargeAt: t, nextInMs: chargeIntervalMs(c + 1) - (now - t) };
}

// ── Multi-mob encounters ───────────────────────────────────────────────────────────────────────
// A single foe auto-resolves; with the difficulty's multiMobChance you face a pack of 2..maxMobs
// fought turn-by-turn. EncMob carries live hp so the encounter can be persisted between clicks.

export type EncMob = { name: string; emoji: string; hp: number; maxHp: number; dmg: number };
export type RoundOutcome = "ongoing" | "win" | "lose";
export type RoundResult = { mobs: EncMob[]; playerHp: number; log: string[]; outcome: RoundOutcome };

/** How many foes this adventure spawns: 1 (auto-resolve) or 2..maxMobs (turn-based pack). */
export function rollEncounterSize(diff: Difficulty, rng: () => number = Math.random): number {
  if (diff.maxMobs <= 1 || rng() >= diff.multiMobChance) return 1;
  return randInt(2, diff.maxMobs, rng);
}

/** Build one pack member at the player's level + difficulty (flavor mob + scaled hp/dmg). */
export function makeEncMob(level: number, diff: Difficulty, rng: () => number = Math.random): EncMob {
  const flavor = pickMob(level, rng);
  const { hp, dmg } = mobStats(level, diff);
  return { name: flavor.name, emoji: flavor.emoji, hp, maxHp: hp, dmg };
}

/**
 * One turn of a pack fight: you strike the front foe (crit per your stats, lifesteal heals); then
 * every foe still standing hits back, softened by dodge + damage-reduction. Returns fresh state so
 * the caller can persist it. `win` when the pack is cleared, `lose` when you'd drop.
 */
export function resolveRound(
  stats: StatBlock,
  mobsIn: EncMob[],
  playerHp: number,
  rng: () => number = Math.random,
): RoundResult {
  const mobs = mobsIn.map((m) => ({ ...m }));
  const log: string[] = [];
  const target = mobs.find((m) => m.hp > 0);
  if (!target) return { mobs, playerHp, log, outcome: "win" };

  const crit = rng() < stats.critChance;
  const dealt = Math.max(1, Math.round(stats.damage * (crit ? stats.critMult : 1)));
  target.hp -= dealt;
  log.push(`⚔️ You hit ${target.emoji} ${target.name} for **${dealt}**${crit ? " 💥crit" : ""}.`);
  let hp = playerHp + Math.round(stats.lifesteal * dealt);
  if (target.hp <= 0) log.push(`☠️ ${target.emoji} ${target.name} falls!`);

  const survivors = mobs.filter((m) => m.hp > 0);
  if (survivors.length === 0) return { mobs, playerHp: hp, log, outcome: "win" };

  const raw = survivors.reduce((s, m) => s + m.dmg, 0);
  const incoming = Math.max(0, Math.round(raw * (1 - stats.dodge) * (1 - stats.dmgReduction)));
  hp -= incoming;
  log.push(`🩸 ${survivors.length} foe${survivors.length === 1 ? "" : "s"} hit you for **${incoming}**.`);
  if (hp <= 0) return { mobs, playerHp: 0, log, outcome: "lose" };
  return { mobs, playerHp: hp, log, outcome: "ongoing" };
}

/** Pick a roaming mob around the player's level (flavor only — combat stats come from level). */
export function pickMob(level: number, rng: () => number = Math.random): Mob {
  const eligible = MOBS.filter((m) => m.level <= level + 1);
  const pool = eligible.length ? eligible : [MOBS[0]];
  return pool[randInt(0, pool.length - 1, rng)];
}

/** Mob health + damage, scaled off your level and the difficulty. */
export function mobStats(level: number, diff: Difficulty): { hp: number; dmg: number } {
  const hp = Math.round((RPG.mobHpBase + RPG.mobHpPerLevel * (level - 1)) * diff.hpMult);
  const dmg = Math.round((RPG.mobDmgBase + RPG.mobDmgPerLevel * (level - 1)) * diff.dmgMult);
  return { hp: Math.max(1, hp), dmg: Math.max(1, dmg) };
}

/**
 * Resolve a fight from your StatBlock. Crit raises effective damage; rounds = ceil(mobHp / it); the
 * mob hits you (rounds − 1) times, reduced by dodge + damage-reduction; lifesteal heals some back.
 * If the net damage would down you, it's a defeat. (Expected-value — adventures stay smooth.)
 */
export function resolveFight(
  stats: StatBlock,
  currentHp: number,
  level: number,
  diff: Difficulty,
): Fight {
  const { hp, dmg } = mobStats(level, diff);
  const effDamage = Math.max(1, stats.damage * (1 + stats.critChance * (stats.critMult - 1)));
  const rounds = Math.max(1, Math.ceil(hp / effDamage));
  const taken = dmg * (rounds - 1) * (1 - stats.dodge) * (1 - stats.dmgReduction);
  const healed = stats.lifesteal * effDamage * rounds;
  const hpLost = Math.max(0, Math.round(taken - healed));
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
