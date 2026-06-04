// Tunables + catalogs for the RPG. Content/balance lives here so it's editable in one place
// (planning/11 keeps numbers out of the design doc, not out of the code).

/** Global knobs. */
export const RPG = {
  xpBase: 50, // xp to clear level 1
  xpFactor: 1.5, // xp curve steepness (xpForLevel = xpBase * level^xpFactor)
  regenIntervalMs: 5 * 60_000, // one hp regen tick every 5 min, computed lazily on read
  hpPerTick: 5,
  embedColor: 0x8b5cf6, // violet-500
} as const;

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
