// Pure dungeon combat — no IO, unit-testable. One `applyAction(state, action, stats)` advances a
// run by a single round: your action resolves, then (if it survives) the foe retaliates. The
// service composes this with config + the DB; the StatBlock is passed in (computed from class +
// level + skills + equipped weapon), so the engine never reads the player row itself. `rng` is a
// param (default Math.random) so the round is unit-testable, mirroring domain/adventure.
import {
  ABILITY_MAP,
  DUNGEON,
  ELEMENT_MAP,
  dungeonDef,
  enemyDef,
  type DungeonEnemy,
} from "../dungeon-config";
import type { StatBlock } from "../skills/compute";

export type EnemyState = {
  id: string;
  hp: number;
  maxHp: number;
  intent: "normal" | "heavy"; // "heavy" = a telegraphed big blow is coming (guard it)
};

export type RewardState = { xp: number; gold: number; items: { itemId: string; qty: number }[] };

/** A timed combat modifier from an active (e.g. Berserk). Ticks down one per round; gone at 0. */
export type ActiveBuff = {
  id: string;
  name: string;
  emoji: string;
  dmgMult: number; // × damage you deal (1 = none)
  dmgTakenMult: number; // × damage you take (1 = none)
  turns: number;
};

/** The whole serialisable run, stored as JSON in rpg_dungeon_runs.stateJson. */
export type RunState = {
  dungeonId: string;
  roomIndex: number; // 0-based; last room = boss
  hp: number; // your current HP (carries across rooms — the core resource)
  maxHp: number; // snapshot at entry (level can't change mid-run)
  enemy: EnemyState;
  coating: string | null; // active blade element, or null
  coatingHits: number; // attacks the coating has left
  cooldowns: Record<string, number>; // abilityId → turns remaining
  buffs: ActiveBuff[]; // timed modifiers from actives
  turn: number;
  log: string[]; // last few combat-log lines
  reward: RewardState; // loot accrued from cleared rooms (granted on win/flee, lost on death)
  status: "active" | "won" | "lost";
};

export type DungeonAction =
  | { type: "attack" }
  | { type: "guard" }
  | { type: "coat"; element: string }
  | { type: "ability"; id: string }
  | { type: "advance" }; // proceed to the next room after a kill

// --- Construction --------------------------------------------------------------------------------

export function newEnemyState(enemyId: string): EnemyState {
  const def = enemyDef(enemyId);
  const hp = def?.hp ?? 1;
  return { id: enemyId, hp, maxHp: hp, intent: "normal" };
}

export function startRun(dungeonId: string, maxHp: number, hp: number): RunState {
  const dungeon = dungeonDef(dungeonId);
  const firstId = dungeon?.rooms[0] ?? "";
  const first = enemyDef(firstId);
  return {
    dungeonId,
    roomIndex: 0,
    hp,
    maxHp,
    enemy: newEnemyState(firstId),
    coating: null,
    coatingHits: 0,
    cooldowns: {},
    buffs: [],
    turn: 1,
    log: [`You enter ${dungeon?.name ?? "the dungeon"}.${first ? ` ${first.emoji} A ${first.name} bars the way.` : ""}`],
    reward: { xp: 0, gold: 0, items: [] },
    status: "active",
  };
}

// --- Pure helpers --------------------------------------------------------------------------------

function clone(s: RunState): RunState {
  return {
    ...s,
    enemy: { ...s.enemy },
    cooldowns: { ...s.cooldowns },
    buffs: (s.buffs ?? []).map((b) => ({ ...b })), // ?? tolerates runs persisted before buffs existed
    log: [...s.log],
    reward: { xp: s.reward.xp, gold: s.reward.gold, items: s.reward.items.map((i) => ({ ...i })) },
  };
}

function push(s: RunState, line: string): void {
  s.log.push(line);
  if (s.log.length > DUNGEON.logLines) s.log = s.log.slice(-DUNGEON.logLines);
}

/** Coating → damage multiplier vs this foe. `auto` forces a weakness hit (regardless of coating). */
function elementMult(coating: string | null, enemy: DungeonEnemy, auto: boolean): number {
  if (auto) return DUNGEON.weaknessMult;
  if (!coating) return 1;
  if (coating === enemy.weakness) return DUNGEON.weaknessMult;
  if (coating === enemy.resist) return DUNGEON.resistMult;
  return 1;
}

function addReward(s: RunState, drop: { itemId: string; qty: number }): void {
  const existing = s.reward.items.find((i) => i.itemId === drop.itemId);
  if (existing) existing.qty += drop.qty;
  else s.reward.items.push({ ...drop });
}

function tickCooldowns(s: RunState): void {
  for (const id of Object.keys(s.cooldowns)) {
    s.cooldowns[id] = Math.max(0, s.cooldowns[id] - 1);
    if (s.cooldowns[id] === 0) delete s.cooldowns[id];
  }
}

function tickBuffs(s: RunState): void {
  s.buffs = s.buffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
}

/** Product of a buff field across active buffs (1 when none). */
function buffMult(s: RunState, key: "dmgMult" | "dmgTakenMult"): number {
  return s.buffs.reduce((m, b) => m * b[key], 1);
}

/** Resolve a damaging action (attack or a damaging ability): roll each hit, apply, log, wear the
 *  coating. Mutates `s` — read s.enemy.hp afterwards for the result. */
function strike(
  s: RunState,
  enemy: DungeonEnemy,
  stats: StatBlock,
  opts: { mult: number; hits?: number; auto?: boolean; label?: string },
  rng: () => number,
): void {
  const hits = Math.max(1, opts.hits ?? 1);
  const usedCoating = !opts.auto && s.coating !== null;
  const mult = elementMult(s.coating, enemy, opts.auto ?? false);

  const dealtMult = buffMult(s, "dmgMult");
  let total = 0;
  let crit = false;
  for (let i = 0; i < hits && s.enemy.hp > 0; i++) {
    const isCrit = rng() < stats.critChance;
    const dmg = Math.max(1, Math.round(stats.damage * opts.mult * mult * dealtMult * (isCrit ? stats.critMult : 1)));
    s.enemy.hp = Math.max(0, s.enemy.hp - dmg);
    total += dmg;
    crit = crit || isCrit;
  }

  // Wear the coating one attack-step (auto-weakness abilities don't burn it).
  let tag = "";
  if (opts.auto) {
    tag = ` (${ELEMENT_MAP[enemy.weakness]?.emoji ?? ""} weakness!)`;
  } else if (usedCoating && s.coating) {
    if (s.coating === enemy.weakness) tag = ` (${ELEMENT_MAP[s.coating]?.emoji ?? ""} weakness!)`;
    else if (s.coating === enemy.resist) tag = " (resisted)";
    s.coatingHits -= 1;
    if (s.coatingHits <= 0) s.coating = null;
  }

  const who = opts.label ? `${opts.label} hits` : "🗡️ You hit";
  push(s, `${who} ${enemy.name} for **${total}**${crit ? " 💥crit" : ""}${tag}.`);
}

function onEnemyDeath(s: RunState, enemy: DungeonEnemy): void {
  s.reward.xp += enemy.xp;
  s.reward.gold += enemy.gold;
  if (enemy.drop) addReward(s, enemy.drop);
  push(s, `💀 ${enemy.name} falls!`);

  const dungeon = dungeonDef(s.dungeonId);
  const isLast = !dungeon || s.roomIndex >= dungeon.rooms.length - 1;
  if (isLast) {
    s.status = "won";
    if (dungeon) {
      s.reward.xp += dungeon.clearBonus.xp;
      s.reward.gold += dungeon.clearBonus.gold;
      push(s, `🏆 You have cleared ${dungeon.name}!`);
    }
  }
}

/** The foe's retaliation: heavy if telegraphed, reduced by guard / dmgReduction, dodged outright on
 *  a dodge roll. Then telegraph (or not) the next blow. Mutates `s`; sets status "lost" on a KO. */
function enemyTurn(
  s: RunState,
  enemy: DungeonEnemy,
  stats: StatBlock,
  guarding: boolean,
  rng: () => number,
): void {
  const heavy = s.enemy.intent === "heavy";
  let dmg = heavy ? Math.round(enemy.dmg * enemy.heavyMult) : enemy.dmg;

  if (rng() < stats.dodge) {
    push(s, `💨 You dodge the ${enemy.name}'s ${heavy ? "heavy " : ""}blow.`);
  } else {
    dmg = Math.round(dmg * (1 - stats.dmgReduction) * buffMult(s, "dmgTakenMult"));
    if (guarding) dmg = Math.round(dmg * (1 - DUNGEON.guardReduction));
    dmg = Math.max(1, dmg);
    s.hp = Math.max(0, s.hp - dmg);
    push(s, `${enemy.emoji} ${enemy.name} hits you for **${dmg}**${heavy ? " 🔆heavy" : ""}${guarding ? " 🛡️guarded" : ""}.`);
  }

  if (s.hp <= 0) {
    s.status = "lost";
    push(s, "☠️ You have fallen.");
    return;
  }

  // Telegraph the next blow.
  const wind = rng() < DUNGEON.heavyTelegraphChance;
  s.enemy.intent = wind ? "heavy" : "normal";
  if (wind) push(s, `🔆 The ${enemy.name} winds up a heavy blow…`);
}

// --- The reducer ---------------------------------------------------------------------------------

/**
 * Advance the run one round. Returns a new state (never mutates the input). Invalid actions (acting
 * on a dead foe, advancing mid-fight, unknown / on-cooldown ids) return the state unchanged.
 */
export function applyAction(
  state: RunState,
  action: DungeonAction,
  stats: StatBlock,
  rng: () => number = Math.random,
): RunState {
  if (state.status !== "active") return state;
  const enemy = enemyDef(state.enemy.id);
  if (!enemy) return state;
  const s = clone(state);

  // Advance to the next room — only valid once the current foe is dead.
  if (action.type === "advance") {
    if (s.enemy.hp > 0) return state;
    const dungeon = dungeonDef(s.dungeonId);
    const nextIndex = s.roomIndex + 1;
    if (!dungeon || nextIndex >= dungeon.rooms.length) return state;
    s.roomIndex = nextIndex;
    s.enemy = newEnemyState(dungeon.rooms[nextIndex]);
    s.coating = null; // fresh blade for a fresh foe
    s.coatingHits = 0;
    s.buffs = []; // buffs don't carry between rooms
    const next = enemyDef(dungeon.rooms[nextIndex]);
    s.log = [`You press deeper.${next ? ` ${next.emoji} A ${next.name} emerges.` : ""}`];
    s.turn += 1;
    return s;
  }

  // Every other action needs a living foe.
  if (s.enemy.hp <= 0) return state;

  let guarding = false;
  switch (action.type) {
    case "guard":
      guarding = true;
      push(s, "🛡️ You raise your guard.");
      break;
    case "coat": {
      const el = ELEMENT_MAP[action.element];
      if (!el) return state;
      s.coating = el.id;
      s.coatingHits = DUNGEON.coatingHits;
      push(s, `🧪 You coat your blade with ${el.emoji} ${el.name}.`);
      break;
    }
    case "attack":
      strike(s, enemy, stats, { mult: 1 }, rng);
      break;
    case "ability": {
      const ab = ABILITY_MAP[action.id];
      if (!ab || (s.cooldowns[ab.id] ?? 0) > 0) return state;
      if (ab.healPct) {
        const heal = Math.max(1, Math.round(s.maxHp * ab.healPct));
        s.hp = Math.min(s.maxHp, s.hp + heal);
        push(s, `${ab.emoji} ${ab.name}: +**${heal}** HP.`);
      }
      if (ab.guard) guarding = true;
      if (ab.buff) {
        s.buffs = s.buffs.filter((b) => b.id !== ab.id); // recast refreshes rather than stacks
        s.buffs.push({
          id: ab.id,
          name: ab.name,
          emoji: ab.emoji,
          dmgMult: ab.buff.dmgMult ?? 1,
          dmgTakenMult: ab.buff.dmgTakenMult ?? 1,
          turns: ab.buff.turns,
        });
        push(s, `${ab.emoji} ${ab.name} — active for ${ab.buff.turns} turns.`);
      }
      if (ab.damageMult) {
        strike(s, enemy, stats, { mult: ab.damageMult, hits: ab.hits, auto: ab.autoWeakness, label: `${ab.emoji} ${ab.name}` }, rng);
      }
      s.cooldowns[ab.id] = ab.cooldown;
      break;
    }
  }

  // Did the foe die from your action? No retaliation; accrue loot (and maybe win).
  if (s.enemy.hp <= 0) {
    onEnemyDeath(s, enemy);
    tickCooldowns(s);
    tickBuffs(s);
    s.turn += 1;
    return s;
  }

  enemyTurn(s, enemy, stats, guarding, rng);
  tickCooldowns(s);
  tickBuffs(s);
  s.turn += 1;
  return s;
}
