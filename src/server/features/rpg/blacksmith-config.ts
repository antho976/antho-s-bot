// Blacksmithing profession — craft warrior weapons from gathered ore + wood, then enhance them.
// Content/tunables live here (like config.ts / gather-config.ts). Pure math is in domain/blacksmith.
//
// A crafted weapon is an rpg_inventory instance: itemId = recipe id, instanceStatsJson = {"upgrade":N}.
// Everything else (name, damage) derives from the recipe + upgrade level, so it stays data-driven.

export const BLACKSMITH_ID = "blacksmithing";

export const BLACKSMITH = {
  // Profession level curve: xp from level L→L+1 = xpBase * L^xpFactor.
  xpBase: 80,
  xpFactor: 1.85,
  maxLevel: 99,

  // Enhancement. Each upgrade adds `upgradeDamagePct` of base damage; capped per recipe (maxUpgrade).
  upgradeDamagePct: 0.18,
  // Cost to go from upgrade U → U+1: gold + the recipe's primary material, both scaling with (U+1).
  upgradeGoldPer: 9, // × baseDamage × (U+1)
  upgradeMatPer: 1, // × (U+1) of the recipe's first material
  upgradeXpPer: 0.35, // × craft xp × (U+1)
} as const;

/** A craftable weapon. `classId` gates who may forge it (warriors only for now). */
export type WeaponRecipe = {
  id: string;
  name: string;
  emoji: string;
  classId: string;
  reqLevel: number; // blacksmithing level required to craft
  baseDamage: number;
  maxUpgrade: number;
  xp: number; // blacksmithing xp granted on craft
  cost: { itemId: string; qty: number }[]; // gathered materials consumed
};

export const WEAPON_RECIPES: WeaponRecipe[] = [
  {
    id: "wpn_copper_sword",
    name: "Copper Sword",
    emoji: "🗡️",
    classId: "warrior",
    reqLevel: 1,
    baseDamage: 6,
    maxUpgrade: 10,
    xp: 25,
    cost: [
      { itemId: "ore_copper", qty: 6 },
      { itemId: "log_birch", qty: 2 },
    ],
  },
  {
    id: "wpn_iron_greatsword",
    name: "Iron Greatsword",
    emoji: "⚔️",
    classId: "warrior",
    reqLevel: 10,
    baseDamage: 14,
    maxUpgrade: 10,
    xp: 60,
    cost: [
      { itemId: "ore_iron", qty: 8 },
      { itemId: "log_oak", qty: 3 },
    ],
  },
  {
    id: "wpn_silver_warblade",
    name: "Silver Warblade",
    emoji: "🗡️",
    classId: "warrior",
    reqLevel: 25,
    baseDamage: 26,
    maxUpgrade: 10,
    xp: 130,
    cost: [
      { itemId: "ore_silver", qty: 10 },
      { itemId: "log_yew", qty: 4 },
    ],
  },
  {
    id: "wpn_adamant_cleaver",
    name: "Adamant Cleaver",
    emoji: "🪓",
    classId: "warrior",
    reqLevel: 45,
    baseDamage: 46,
    maxUpgrade: 10,
    xp: 280,
    cost: [
      { itemId: "ore_adamant", qty: 12 },
      { itemId: "log_worldash", qty: 5 },
    ],
  },
];

export const RECIPE_BY_ID: Record<string, WeaponRecipe> = Object.fromEntries(
  WEAPON_RECIPES.map((r) => [r.id, r]),
);

export function isWeaponItem(itemId: string): boolean {
  return itemId in RECIPE_BY_ID;
}
