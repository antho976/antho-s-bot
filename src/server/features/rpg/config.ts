// Tunables + catalogs for the RPG. Content/balance lives here so it's editable in one place
// (planning/11 keeps numbers out of the design doc, not out of the code).

/** Global knobs — all tunable; numbers get dialed after playtest. */
export const RPG = {
  xpBase: 50, // xp to clear level 1
  xpFactor: 1.5, // xp curve steepness (xpForLevel = xpBase * level^xpFactor)
  regenIntervalMs: 5 * 60_000, // one hp regen tick every 5 min, computed lazily on read
  regenPercent: 0.1, // hp recovered per tick = 10% of max hp (scales with level)
  embedColor: 0x8b5cf6, // violet-500

  // Adventure charges replace the old flat cooldown: you bank up to maxAdventureCharges "plays".
  // The Nth charge takes chargeStepMs × N to refill (5/10/15/20/25 min for charges 1–5), so the
  // more you hoard, the slower the next one comes. Computed lazily on read (no timers).
  maxAdventureCharges: 5,
  chargeStepMs: 5 * 60_000,

  // Combat. yourDamage = your class's atkBase + atkPerLevel*(level-1) + equipped weapon (0 for now;
  // the weapon term is the seam so gear matters). A fight is:
  //   rounds = ceil(mobHp / yourDamage); the mob hits you (rounds − 1) times for mobDmg each.
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
  hint: string; // one-line legend blurb
  emoji: string;
  style: "primary" | "secondary" | "success" | "danger";
  hpMult: number; // mob health
  dmgMult: number; // mob damage
  xpMult: number;
  goldMult: number;
  keyChance: number;
  minLevel: number; // gated: shown disabled below this level
  // A single fight auto-resolves; with chance multiMobChance you instead face a pack of 2..maxMobs
  // that must be fought turn-by-turn. Easy never packs; it climbs to "a lot" on Brutal.
  multiMobChance: number;
  maxMobs: number;
};

export const DIFFICULTIES: Difficulty[] = [
  { id: "easy", label: "Easy", hint: "safest, least loot", emoji: "🟢", style: "success", hpMult: 1.6, dmgMult: 1.1, xpMult: 1.0, goldMult: 1.0, keyChance: 0.60, minLevel: 1, multiMobChance: 0, maxMobs: 1 },
  { id: "normal", label: "Normal", hint: "a fair fight", emoji: "🟡", style: "primary", hpMult: 2.0, dmgMult: 1.4, xpMult: 1.6, goldMult: 1.6, keyChance: 0.90, minLevel: 1, multiMobChance: 0.20, maxMobs: 2 },
  { id: "hard", label: "Hard", hint: "risky, better loot", emoji: "🔴", style: "danger", hpMult: 2.5, dmgMult: 2.4, xpMult: 2.4, goldMult: 2.4, keyChance: 1.20, minLevel: 1, multiMobChance: 0.45, maxMobs: 3 },
  { id: "brutal", label: "Brutal", hint: "deadly, best loot", emoji: "🟣", style: "danger", hpMult: 5.2, dmgMult: 4.9, xpMult: 6.2, goldMult: 6.2, keyChance: 7.00, minLevel: 1, multiMobChance: 0.75, maxMobs: 4 },
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
  atkBase: number; // your damage per round at level 1
  atkPerLevel: number;
};

/**
 * Starter classes. A keyed list so adding classes (and the later branch specialisations) is data,
 * not a rewrite (planning/11). Stats give each a real identity: Warrior tanks, Mage glass-cannons,
 * Archer balances.
 */
export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    emoji: "🛡️",
    blurb: "Shield-bound and unbroken. The frontline of every saga, soaking blows that fell lesser folk.",
    baseHp: 130,
    hpPerLevel: 26,
    atkBase: 8,
    atkPerLevel: 4,
  },
  mage: {
    id: "mage",
    name: "Mage",
    emoji: "🔮",
    blurb: "Reads the runes and bends the seidr. Devastating, but fragile. Strike first or fall fast.",
    baseHp: 80,
    hpPerLevel: 14,
    atkBase: 13,
    atkPerLevel: 6,
  },
  archer: {
    id: "archer",
    name: "Archer",
    emoji: "🏹",
    blurb: "Swift and sure, blessed by the hunt. Balanced of hand and deadly at any range.",
    baseHp: 100,
    hpPerLevel: 20,
    atkBase: 10,
    atkPerLevel: 5,
  },
};

export const DEFAULT_CLASS = "warrior";

/** The world's opening lore — Norse and Greek myth share these realms. Shown on first /rpg. */
export const INTRO_LORE = [
  "The Allfather's ravens and the Fates' shears watch over the same mortals now.",
  "Aesir and Olympian have grown distant, and the realms between them teem with monsters, ruins, and forgotten gold.",
  "You are no one yet. But every saga begins with a single step.",
].join("\n\n");

/**
 * Hub categories → one button each. Data-driven so views are added without touching the hub.
 * `style` maps to a Discord button color (only 4 exist: primary/secondary/success/danger).
 */
export const HUB_CATEGORIES = [
  { view: "combat", label: "Combat", emoji: "⚔️", style: "danger" },
  { view: "dungeon", label: "Dungeons", emoji: "💀", style: "danger" },
  { view: "player", label: "Player", emoji: "👤", style: "success" },
  { view: "gather", label: "Gather", emoji: "⛏️", style: "primary" }, 
  { view: "guild", label: "Guild", emoji: "🏰", style: "success" },
  { view: "quests", label: "Quests", emoji: "📜", style: "primary" },
  { view: "options", label: "Options", emoji: "⚙️", style: "secondary" },
] as const;

export type HubView = (typeof HUB_CATEGORIES)[number]["view"];
