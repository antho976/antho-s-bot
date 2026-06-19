// Blacksmithing orchestration — craft warrior weapons from gathered materials, enhance them, and
// equip them (the equipped weapon's damage feeds combat via service.ts). Composes config + the pure
// math (domain/blacksmith) with the DB.
import { BLACKSMITH_ID, RECIPE_BY_ID } from "./blacksmith-config";
import {
  parseWeaponStats,
  profLevel,
  upgradeCost,
  upgradeXp,
  weaponDamage,
} from "./domain/blacksmith";
import {
  addProfessionXp,
  getInventoryRow,
  getProfessionXp,
  insertInstance,
  listInventory,
  removeItemQty,
  updateInventoryRow,
  updatePlayer,
  type RpgInventoryRow,
  type RpgPlayer,
} from "./queries";

export type Weapon = {
  rowId: number;
  recipeId: string;
  name: string;
  emoji: string;
  upgrade: number;
  maxUpgrade: number;
  damage: number;
  equipped: boolean;
};

function weaponFromRow(row: RpgInventoryRow, equippedId: number | null): Weapon | null {
  const recipe = RECIPE_BY_ID[row.itemId];
  if (!recipe) return null;
  const { upgrade } = parseWeaponStats(row.instanceStatsJson);
  return {
    rowId: row.id,
    recipeId: recipe.id,
    name: recipe.name,
    emoji: recipe.emoji,
    upgrade,
    maxUpgrade: recipe.maxUpgrade,
    damage: weaponDamage(recipe, upgrade),
    equipped: equippedId === row.id,
  };
}

export async function blacksmithLevel(playerId: number): Promise<number> {
  return profLevel(await getProfessionXp(playerId, BLACKSMITH_ID));
}

/** Stackable material counts (itemId → qty), for craft/upgrade affordability + display. */
export async function materialCounts(playerId: number): Promise<Record<string, number>> {
  const rows = await listInventory(playerId);
  const out: Record<string, number> = {};
  for (const r of rows) if (!r.instanceStatsJson) out[r.itemId] = (out[r.itemId] ?? 0) + r.qty;
  return out;
}

export async function listWeapons(player: RpgPlayer): Promise<Weapon[]> {
  const rows = await listInventory(player.id);
  return rows
    .map((r) => weaponFromRow(r, player.equippedWeaponId))
    .filter((w): w is Weapon => w !== null);
}

export async function getWeapon(player: RpgPlayer, rowId: number): Promise<Weapon | null> {
  const row = await getInventoryRow(rowId);
  if (!row || row.playerId !== player.id) return null;
  return weaponFromRow(row, player.equippedWeaponId);
}

export async function equippedWeapon(player: RpgPlayer): Promise<Weapon | null> {
  if (!player.equippedWeaponId) return null;
  const row = await getInventoryRow(player.equippedWeaponId);
  return row ? weaponFromRow(row, player.equippedWeaponId) : null;
}

/** The equipped weapon's damage, added to the wielder's StatBlock in combat (0 if none). */
export async function equippedWeaponDamage(player: RpgPlayer): Promise<number> {
  if (!player.equippedWeaponId) return 0;
  const row = await getInventoryRow(player.equippedWeaponId);
  if (!row || !RECIPE_BY_ID[row.itemId]) return 0;
  return weaponDamage(RECIPE_BY_ID[row.itemId], parseWeaponStats(row.instanceStatsJson).upgrade);
}

export type CraftResult = { ok: boolean; reason?: string; weaponName?: string };

/** Forge a weapon: validate class + level + materials, consume them, mint the instance, grant xp. */
export async function craftWeapon(player: RpgPlayer, recipeId: string): Promise<CraftResult> {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return { ok: false, reason: "Unknown recipe." };
  if (player.classId !== recipe.classId) {
    return { ok: false, reason: `${recipe.name} is a ${recipe.classId} weapon.` };
  }
  if ((await blacksmithLevel(player.id)) < recipe.reqLevel) {
    return { ok: false, reason: `Needs Blacksmithing level ${recipe.reqLevel}.` };
  }
  const counts = await materialCounts(player.id);
  for (const c of recipe.cost) {
    if ((counts[c.itemId] ?? 0) < c.qty) return { ok: false, reason: "Not enough materials." };
  }
  for (const c of recipe.cost) await removeItemQty(player.id, c.itemId, c.qty);
  await insertInstance(player.id, recipe.id, JSON.stringify({ upgrade: 0 }));
  await addProfessionXp(player.id, BLACKSMITH_ID, recipe.xp);
  return { ok: true, weaponName: recipe.name };
}

export type UpgradeResult = { ok: boolean; reason?: string; weapon?: Weapon };

/** Enhance a weapon by one level: spend gold + materials, raise its damage, grant xp. */
export async function upgradeWeapon(player: RpgPlayer, rowId: number): Promise<UpgradeResult> {
  const row = await getInventoryRow(rowId);
  if (!row || row.playerId !== player.id || !RECIPE_BY_ID[row.itemId]) {
    return { ok: false, reason: "Weapon not found." };
  }
  const recipe = RECIPE_BY_ID[row.itemId];
  const { upgrade } = parseWeaponStats(row.instanceStatsJson);
  if (upgrade >= recipe.maxUpgrade) return { ok: false, reason: "Already at max enhancement." };

  const cost = upgradeCost(recipe, upgrade);
  if (player.gold < cost.gold) return { ok: false, reason: `Needs ${cost.gold.toLocaleString()} gold.` };
  const counts = await materialCounts(player.id);
  for (const it of cost.items) {
    if ((counts[it.itemId] ?? 0) < it.qty) return { ok: false, reason: "Not enough materials." };
  }

  for (const it of cost.items) await removeItemQty(player.id, it.itemId, it.qty);
  await updatePlayer(player.id, { gold: player.gold - cost.gold });
  const nextJson = JSON.stringify({ upgrade: upgrade + 1 });
  await updateInventoryRow(rowId, { instanceStatsJson: nextJson });
  await addProfessionXp(player.id, BLACKSMITH_ID, upgradeXp(recipe, upgrade));

  return { ok: true, weapon: weaponFromRow({ ...row, instanceStatsJson: nextJson }, player.equippedWeaponId) ?? undefined };
}

export type MultiUpgradeResult = UpgradeResult & { applied: number; spentGold: number };

/**
 * Enhance a weapon as many times as gold + materials allow, up to its max — one batched write.
 * The per-level cost climbs, so we tally affordable steps first, then persist the consumed
 * materials, gold, and accrued profession XP in one go.
 */
export async function upgradeWeaponMax(player: RpgPlayer, rowId: number): Promise<MultiUpgradeResult> {
  const row = await getInventoryRow(rowId);
  if (!row || row.playerId !== player.id || !RECIPE_BY_ID[row.itemId]) {
    return { ok: false, reason: "Weapon not found.", applied: 0, spentGold: 0 };
  }
  const recipe = RECIPE_BY_ID[row.itemId];
  let upgrade = parseWeaponStats(row.instanceStatsJson).upgrade;
  if (upgrade >= recipe.maxUpgrade) {
    return { ok: false, reason: "Already at max enhancement.", applied: 0, spentGold: 0 };
  }

  const counts = await materialCounts(player.id);
  let gold = player.gold;
  let spentGold = 0;
  let xp = 0;
  let applied = 0;
  const consumed: Record<string, number> = {};

  while (upgrade < recipe.maxUpgrade) {
    const cost = upgradeCost(recipe, upgrade);
    if (gold < cost.gold) break;
    if (cost.items.some((it) => (counts[it.itemId] ?? 0) < it.qty)) break;
    gold -= cost.gold;
    spentGold += cost.gold;
    for (const it of cost.items) {
      counts[it.itemId] = (counts[it.itemId] ?? 0) - it.qty;
      consumed[it.itemId] = (consumed[it.itemId] ?? 0) + it.qty;
    }
    xp += upgradeXp(recipe, upgrade);
    upgrade += 1;
    applied += 1;
  }

  if (applied === 0) {
    return { ok: false, reason: "Can't afford the next enhancement.", applied: 0, spentGold: 0 };
  }

  for (const [itemId, qty] of Object.entries(consumed)) await removeItemQty(player.id, itemId, qty);
  await updatePlayer(player.id, { gold });
  const nextJson = JSON.stringify({ upgrade });
  await updateInventoryRow(rowId, { instanceStatsJson: nextJson });
  await addProfessionXp(player.id, BLACKSMITH_ID, xp);

  return {
    ok: true,
    applied,
    spentGold,
    weapon: weaponFromRow({ ...row, instanceStatsJson: nextJson }, player.equippedWeaponId) ?? undefined,
  };
}

export async function equipWeapon(player: RpgPlayer, rowId: number): Promise<{ ok: boolean; reason?: string }> {
  const row = await getInventoryRow(rowId);
  if (!row || row.playerId !== player.id || !RECIPE_BY_ID[row.itemId]) {
    return { ok: false, reason: "Weapon not found." };
  }
  await updatePlayer(player.id, { equippedWeaponId: rowId });
  return { ok: true };
}

export async function unequipWeapon(player: RpgPlayer): Promise<void> {
  await updatePlayer(player.id, { equippedWeaponId: null });
}
