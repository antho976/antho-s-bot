// Dungeon orchestration — composes the pure reducer (domain/dungeon) + config with the DB. Holds the
// one active run per player in rpg_dungeon_runs as a JSON blob; each click loads it, applies one
// action, and saves (or finalises on win/loss/flee). Rewards accrue inside the run and are granted
// to the player exactly once at finalisation — never per-render — so re-reads can't double-pay.
import { applyXp } from "./domain/adventure";
import { applyAction, startRun, type DungeonAction, type RunState } from "./domain/dungeon";
import { abilitiesFor, dungeonDef } from "./dungeon-config";
import { equippedWeaponDamage } from "./blacksmith";
import { classDef, maxHp } from "./domain/stats";
import { computeStats } from "./skills/compute";
import {
  addItem,
  deleteDungeonRun,
  getAllocatedNodeIds,
  getDungeonRun,
  listInventory,
  removeItemQty,
  updatePlayer,
  upsertDungeonRun,
  type RpgPlayer,
} from "./queries";

const KEY_ITEM = "key";

/** How many adventure keys a player holds (stackable, non-instance rows). */
export async function countKeys(playerId: number): Promise<number> {
  const rows = await listInventory(playerId);
  return rows
    .filter((r) => r.itemId === KEY_ITEM && !r.instanceStatsJson)
    .reduce((a, r) => a + r.qty, 0);
}

/** The player's live run, or null. Tolerates a corrupt blob (treats it as no run). */
export async function getActiveRun(player: RpgPlayer): Promise<RunState | null> {
  const row = await getDungeonRun(player.id);
  if (!row) return null;
  try {
    return JSON.parse(row.stateJson) as RunState;
  } catch {
    return null;
  }
}

/** Combat StatBlock for a dungeon turn — same composition Adventures use (class + skills + weapon). */
async function statsFor(player: RpgPlayer) {
  const allocated = await getAllocatedNodeIds(player.id);
  const stats = computeStats(player.classId, player.level, allocated);
  stats.damage += await equippedWeaponDamage(player);
  return stats;
}

export type EnterResult = { ok: boolean; reason?: string };

/** Start a delve: validate level + keys + that no run is active, spend the keys, persist the run. */
export async function enterDungeon(player: RpgPlayer, dungeonId: string): Promise<EnterResult> {
  const dungeon = dungeonDef(dungeonId);
  if (!dungeon) return { ok: false, reason: "Unknown dungeon." };
  if (await getDungeonRun(player.id)) return { ok: false, reason: "You're already in a dungeon." };
  if (player.level < dungeon.reqLevel) {
    return { ok: false, reason: `Requires level ${dungeon.reqLevel}.` };
  }
  const keys = await countKeys(player.id);
  if (keys < dungeon.keyCost) {
    return { ok: false, reason: `Needs ${dungeon.keyCost} 🗝️ key${dungeon.keyCost > 1 ? "s" : ""} — you have ${keys}.` };
  }

  await removeItemQty(player.id, KEY_ITEM, dungeon.keyCost);
  const cls = classDef(player.classId);
  const mh = maxHp(cls, player.level);
  const run = startRun(dungeonId, mh, Math.min(player.hp, mh));
  await upsertDungeonRun(player.id, dungeonId, JSON.stringify(run));
  return { ok: true };
}

export type DungeonSummary = {
  outcome: "won" | "lost" | "fled";
  xp: number;
  gold: number;
  items: { itemId: string; qty: number }[];
  leveledTo: number | null;
  hp: number;
  maxHp: number;
};

/** End a run: write back HP, grant accrued loot (none on death), delete the run row. Idempotent at
 *  the call site because the row is deleted — a stale click then finds no run. */
async function finalize(
  player: RpgPlayer,
  run: RunState,
  outcome: "won" | "lost" | "fled",
): Promise<DungeonSummary> {
  const cls = classDef(player.classId);
  await deleteDungeonRun(player.id);

  if (outcome === "lost") {
    await updatePlayer(player.id, { hp: 1 });
    return { outcome, xp: 0, gold: 0, items: [], leveledTo: null, hp: 1, maxHp: maxHp(cls, player.level) };
  }

  // Won or fled — keep the loot earned so far. XP rolls levels like an adventure; a level-up heals.
  const leveled = applyXp(player.level, player.xp, run.reward.xp);
  const leveledTo = leveled.levelsGained > 0 ? leveled.level : null;
  const newMax = maxHp(cls, leveled.level);
  const hp = leveledTo ? newMax : Math.max(1, Math.min(run.hp, newMax));

  await updatePlayer(player.id, {
    xp: leveled.xp,
    level: leveled.level,
    gold: player.gold + run.reward.gold,
    hp,
  });
  for (const it of run.reward.items) await addItem(player.id, it.itemId, it.qty);

  return { outcome, xp: run.reward.xp, gold: run.reward.gold, items: run.reward.items, leveledTo, hp, maxHp: newMax };
}

export type DungeonOutcome =
  | { kind: "run"; run: RunState }
  | { kind: "result"; run: RunState; summary: DungeonSummary };

/** Apply one combat action. Returns the updated run, or a final result when the run ends. Null when
 *  there is no active run (stale click). Class-gated abilities the player can't use are ignored. */
export async function actInDungeon(
  player: RpgPlayer,
  action: DungeonAction,
): Promise<DungeonOutcome | null> {
  const run = await getActiveRun(player);
  if (!run || run.status !== "active") return null;

  if (action.type === "ability" && !abilitiesFor(player.classId).some((a) => a.id === action.id)) {
    return { kind: "run", run };
  }

  const next = applyAction(run, action, await statsFor(player));
  if (next.status === "won" || next.status === "lost") {
    const summary = await finalize(player, next, next.status);
    return { kind: "result", run: next, summary };
  }
  await upsertDungeonRun(player.id, run.dungeonId, JSON.stringify(next));
  return { kind: "run", run: next };
}

/** Abandon the run, escaping with whatever loot you've banked from cleared rooms. */
export async function fleeDungeon(
  player: RpgPlayer,
): Promise<{ run: RunState; summary: DungeonSummary } | null> {
  const run = await getActiveRun(player);
  if (!run) return null;
  const summary = await finalize(player, run, "fled");
  return { run, summary };
}
