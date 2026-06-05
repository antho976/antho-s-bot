// Pure blacksmithing math — no IO, unit-testable. The service composes these with config + DB.
import { BLACKSMITH, type WeaponRecipe } from "../blacksmith-config";

/** Per-instance weapon data stored in rpg_inventory.instanceStatsJson. */
export type WeaponStats = { upgrade: number };

export function parseWeaponStats(json: string | null): WeaponStats {
  if (!json) return { upgrade: 0 };
  try {
    const v = JSON.parse(json) as Partial<WeaponStats>;
    return { upgrade: Math.max(0, Math.floor(v.upgrade ?? 0)) };
  } catch {
    return { upgrade: 0 };
  }
}

/** Damage a weapon deals at a given upgrade level (added to the wielder's StatBlock damage). */
export function weaponDamage(recipe: WeaponRecipe, upgrade: number): number {
  const perStep = Math.max(1, Math.round(recipe.baseDamage * BLACKSMITH.upgradeDamagePct));
  return recipe.baseDamage + Math.max(0, upgrade) * perStep;
}

export type UpgradeCost = { gold: number; items: { itemId: string; qty: number }[] };

/** Cost to go from upgrade `current` → `current + 1`. */
export function upgradeCost(recipe: WeaponRecipe, current: number): UpgradeCost {
  const step = current + 1;
  const gold = Math.round(recipe.baseDamage * BLACKSMITH.upgradeGoldPer * step);
  const mat = recipe.cost[0];
  const items = mat ? [{ itemId: mat.itemId, qty: BLACKSMITH.upgradeMatPer * step }] : [];
  return { gold, items };
}

export function upgradeXp(recipe: WeaponRecipe, current: number): number {
  return Math.round(recipe.xp * BLACKSMITH.upgradeXpPer * (current + 1));
}

// --- Profession level curve (mirrors gathering's shape, with blacksmith constants) ---

export function profReqForLevel(level: number): number {
  return Math.floor(BLACKSMITH.xpBase * Math.pow(level, BLACKSMITH.xpFactor));
}

export type ProfProgress = { level: number; into: number; needed: number };

export function profProgress(totalXp: number): ProfProgress {
  let level = 1;
  let acc = 0;
  let needed = profReqForLevel(level);
  while (totalXp >= acc + needed && level < BLACKSMITH.maxLevel) {
    acc += needed;
    level += 1;
    needed = profReqForLevel(level);
  }
  return { level, into: totalXp - acc, needed };
}

export function profLevel(totalXp: number): number {
  return profProgress(totalXp).level;
}
