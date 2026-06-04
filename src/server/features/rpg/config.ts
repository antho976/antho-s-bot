// Tunables + catalogs for the RPG. Content/balance lives here so it's editable in one place
// (planning/11 keeps numbers out of the design doc, not out of the code).

/** Global knobs. */
export const RPG = {
  xpBase: 50, // xp to clear level 1
  xpFactor: 1.5, // xp curve steepness (xpForLevel = xpBase * level^xpFactor)
  regenIntervalMs: 5 * 60_000, // one hp regen tick every 5 min, computed lazily on read
  hpPerTick: 5,
  embedColor: 0x8b5cf6, // violet-500

  // Adventure: the basic combat grind (poll picked 1–5 min → 3). Light by design — XP + the odd
  // key. Real difficulty/rewards live in dungeons later (planning/11).
  adventureCooldownMs: 3 * 60_000,
  adventureXpBase: 8,
  adventureXpPerLevel: 4,
  keyDropChance: 0.25,
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
