// Tunables + catalogs for the RPG. Content/balance lives here so it's editable in one place
// (planning/11 keeps numbers out of the design doc, not out of the code).

/** Global knobs — all tunable; numbers get dialed after playtest. */
export const RPG = {
  xpBase: 50, // xp to clear level 1
  xpFactor: 1.5, // xp curve steepness (xpForLevel = xpBase * level^xpFactor)
  regenIntervalMs: 5 * 60_000, // one hp regen tick every 5 min, computed lazily on read
  regenPercent: 0.1, // hp recovered per tick = 10% of max hp (scales with level)
  embedColor: 0x8b5cf6, // violet-500

  adventureCooldownMs: 3 * 60_000, // one adventure per 3 min (poll: 1–5 → 3)

  // Combat. yourDamage = atkBase + atkPerLevel*(level-1) + equipped weapon (0 for now — the weapon
  // term is the seam so gear matters; we don't auto-scale it away). A fight is:
  //   rounds = ceil(mobHp / yourDamage); the mob hits you (rounds − 1) times for mobDmg each.
  atkBase: 8,
  atkPerLevel: 4,
  mobHpBase: 18,
  mobHpPerLevel: 10,
  mobDmgBase: 6,
  mobDmgPerLevel: 3,

  // Reward bases, before the per-difficulty multipliers.
  rewardXpBase: 8,
  rewardXpPerLevel: 4,
  rewardGoldBase: 5,
  rewardGoldPerLevel: 3,
} as const;

/** A roaming monster you can fight on an Adventure. `level` scales rewards + gates who you meet. */
export type Mob = { name: string; emoji: string; level: number };

export const MOBS: Mob[] = [
  { name: "Slime", emoji: "🟢", level: 1 },
  { name: "Giant Rat", emoji: "🐀", level: 2 },
  { name: "Goblin", emoji: "👺", level: 3 },
  { name: "Wild Boar", emoji: "🐗", level: 5 },
  { name: "Bandit", emoji: "🗡️", level: 7 },
  { name: "Skeleton", emoji: "💀", level: 10 },
];

/** Difficulty scales the mob's health + damage (off your level) and the rewards. */
export type Difficulty = {
  id: string;
  label: string;
  emoji: string;
  style: "primary" | "secondary" | "success" | "danger";
  hpMult: number; // mob health
  dmgMult: number; // mob damage
  xpMult: number;
  goldMult: number;
  keyChance: number;
  minLevel: number; // gated: shown disabled below this level
};

export const DIFFICULTIES: Difficulty[] = [
  { id: "easy", label: "Easy", emoji: "🟢", style: "success", hpMult: 0.6, dmgMult: 0.6, xpMult: 0.7, goldMult: 0.7, keyChance: 0.15, minLevel: 1 },
  { id: "normal", label: "Normal", emoji: "🟡", style: "primary", hpMult: 1.0, dmgMult: 1.0, xpMult: 1.0, goldMult: 1.0, keyChance: 0.25, minLevel: 1 },
  { id: "hard", label: "Hard", emoji: "🔴", style: "danger", hpMult: 1.5, dmgMult: 1.4, xpMult: 1.6, goldMult: 1.6, keyChance: 0.45, minLevel: 1 },
  { id: "brutal", label: "Brutal", emoji: "🟣", style: "danger", hpMult: 2.2, dmgMult: 1.9, xpMult: 2.5, goldMult: 2.5, keyChance: 0.65, minLevel: 10 },
];

export const DIFFICULTY_MAP: Record<string, Difficulty> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d]),
);

/** Item catalog (defs in code, like classes/mobs). Inventory rows reference these by id. */
export type ItemDef = { id: string; name: string; emoji: string; stackable: boolean };

export const ITEMS: Record<string, ItemDef> = {
  key: { id: "key", name: "Adventure Key", emoji: "🗝️", stackable: true },
};

export type ClassDef = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  baseHp: number;
  hpPerLevel: number;
};

/**
 * Class catalog. Single class for now, but it's a keyed list so adding classes (and, later,
 * multi-class) is data, not a rewrite (planning/11).
 */
export const CLASSES: Record<string, ClassDef> = {
  adventurer: {
    id: "adventurer",
    name: "Adventurer",
    emoji: "🗡️",
    blurb: "A versatile wanderer — jack of all trades.",
    baseHp: 100,
    hpPerLevel: 20,
  },
};

export const DEFAULT_CLASS = "adventurer";

/**
 * Hub categories → one button each. Data-driven so views are added without touching the hub.
 * `style` maps to a Discord button color (only 4 exist: primary/secondary/success/danger).
 */
export const HUB_CATEGORIES = [
  { view: "combat", label: "Combat", emoji: "⚔️", style: "danger" },
  { view: "inventory", label: "Inventory", emoji: "🎒", style: "primary" },
  { view: "guild", label: "Guild", emoji: "🏰", style: "success" },
  { view: "shop", label: "Shop", emoji: "🛒", style: "success" },
  { view: "quests", label: "Quests", emoji: "📜", style: "primary" },
  { view: "options", label: "Options", emoji: "⚙️", style: "secondary" },
] as const;

export type HubView = (typeof HUB_CATEGORIES)[number]["view"];
