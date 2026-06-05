// Dungeons — active, turn-based PvE delves (no auto). Unlike Adventures (one expected-value roll),
// a dungeon is a live fight resolved click-by-click: you coat your blade with the foe's weakness,
// time your guard against telegraphed heavy blows, and spend skills on cooldown. Run state lives in
// rpg_dungeon_runs (one per player); pure combat math is in domain/dungeon, orchestration in
// dungeon.ts. Content/tunables live here (like config.ts / gather-config.ts / blacksmith-config.ts).
//
// Entry costs 🗝️ keys (earned from Adventures) — that's the loop tying the two combat modes together.

export const DUNGEON_PROF_ID = "dungeoneering"; // reserved seam; not yet awarding profession xp

export const DUNGEON = {
  coatingHits: 3, // attacks a blade coating lasts before it wears off
  weaknessMult: 1.8, // damage × this when the coating matches the foe's weakness
  resistMult: 0.5, // damage × this when it matches what the foe resists
  guardReduction: 0.7, // fraction of an incoming hit negated while guarding
  heavyTelegraphChance: 0.35, // chance a foe winds up a (telegraphed) heavy blow next turn
  logLines: 6, // combat-log lines kept in the run state
} as const;

/** A blade-coating / damage element. Foes are weak to one and may resist another. */
export type Element = { id: string; name: string; emoji: string };

export const ELEMENTS: Element[] = [
  { id: "fire", name: "Fire", emoji: "🔥" },
  { id: "frost", name: "Frost", emoji: "❄️" },
  { id: "poison", name: "Poison", emoji: "🧪" },
  { id: "shock", name: "Shock", emoji: "⚡" },
  { id: "holy", name: "Holy", emoji: "✨" },
];

export const ELEMENT_MAP: Record<string, Element> = Object.fromEntries(
  ELEMENTS.map((e) => [e.id, e]),
);

/** A dungeon foe. Flat stats (not level-scaled) — the dungeon's tier *is* its difficulty, so a
 *  high-level player breezes a low dungeon for little reward and seeks deeper ones. */
export type DungeonEnemy = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  dmg: number; // base damage per turn
  heavyMult: number; // a telegraphed heavy blow deals dmg × this
  weakness: string; // element id — coat with this to hit hard
  resist?: string; // element id — coating with this is half-strength
  xp: number; // granted on kill (accrues into the run reward)
  gold: number;
  boss?: boolean;
  drop?: { itemId: string; qty: number }; // guaranteed material on kill (bosses feed the Blacksmith)
};

export const ENEMIES: Record<string, DungeonEnemy> = {
  // --- Crypt of the Restless (holy/poison) ---
  e_skeleton: { id: "e_skeleton", name: "Skeleton", emoji: "💀", hp: 60, dmg: 9, heavyMult: 1.8, weakness: "holy", resist: "poison", xp: 30, gold: 14 },
  e_ghoul: { id: "e_ghoul", name: "Ghoul", emoji: "🧟", hp: 85, dmg: 13, heavyMult: 1.9, weakness: "fire", resist: "poison", xp: 42, gold: 18 },
  e_bonelord: { id: "e_bonelord", name: "Bone Lord", emoji: "☠️", hp: 190, dmg: 17, heavyMult: 2.2, weakness: "holy", resist: "frost", xp: 130, gold: 75, boss: true, drop: { itemId: "ore_iron", qty: 3 } },

  // --- Frostmaw Grotto (fire) ---
  e_wisp: { id: "e_wisp", name: "Frost Wisp", emoji: "🌀", hp: 115, dmg: 16, heavyMult: 1.8, weakness: "fire", resist: "frost", xp: 70, gold: 30 },
  e_troll: { id: "e_troll", name: "Ice Troll", emoji: "🧌", hp: 155, dmg: 22, heavyMult: 2.0, weakness: "fire", resist: "frost", xp: 92, gold: 40 },
  e_jotun: { id: "e_jotun", name: "Jötun Warden", emoji: "🥶", hp: 330, dmg: 30, heavyMult: 2.3, weakness: "fire", resist: "frost", xp: 250, gold: 155, boss: true, drop: { itemId: "ore_silver", qty: 3 } },

  // --- Sunken Forge (frost) ---
  e_hound: { id: "e_hound", name: "Magma Hound", emoji: "🐕‍🦺", hp: 185, dmg: 26, heavyMult: 1.9, weakness: "frost", resist: "fire", xp: 130, gold: 55 },
  e_drake: { id: "e_drake", name: "Cinder Drake", emoji: "🐉", hp: 250, dmg: 34, heavyMult: 2.1, weakness: "frost", resist: "fire", xp: 175, gold: 80 },
  e_titan: { id: "e_titan", name: "Forge Titan", emoji: "🗿", hp: 540, dmg: 46, heavyMult: 2.5, weakness: "frost", resist: "fire", xp: 500, gold: 330, boss: true, drop: { itemId: "ore_adamant", qty: 3 } },
};

export function enemyDef(id: string): DungeonEnemy | undefined {
  return ENEMIES[id];
}

/** A dungeon: an ordered list of rooms (enemy ids), the last being the boss. Gated by level + keys. */
export type DungeonDef = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  reqLevel: number;
  keyCost: number; // 🗝️ keys spent to enter
  rooms: string[]; // enemy ids, in order
  clearBonus: { xp: number; gold: number }; // granted on top of accrued loot for a full clear
};

export const DUNGEONS: DungeonDef[] = [
  {
    id: "dng_crypt",
    name: "Crypt of the Restless",
    emoji: "⚰️",
    blurb: "The unquiet dead shamble the dark. Holy light lays them to rest.",
    reqLevel: 3,
    keyCost: 1,
    rooms: ["e_skeleton", "e_ghoul", "e_bonelord"],
    clearBonus: { xp: 60, gold: 40 },
  },
  {
    id: "dng_grotto",
    name: "Frostmaw Grotto",
    emoji: "🧊",
    blurb: "An ice-locked cave where the cold itself bites. Bring fire.",
    reqLevel: 9,
    keyCost: 1,
    rooms: ["e_wisp", "e_troll", "e_jotun"],
    clearBonus: { xp: 140, gold: 90 },
  },
  {
    id: "dng_forge",
    name: "Sunken Forge",
    emoji: "🌋",
    blurb: "A drowned smithy still burning at its heart. Frost is your ally here.",
    reqLevel: 16,
    keyCost: 2,
    rooms: ["e_hound", "e_drake", "e_titan"],
    clearBonus: { xp: 320, gold: 220 },
  },
];

export const DUNGEON_MAP: Record<string, DungeonDef> = Object.fromEntries(
  DUNGEONS.map((d) => [d.id, d]),
);

export function dungeonDef(id: string): DungeonDef | undefined {
  return DUNGEON_MAP[id];
}

/**
 * A combat skill usable in a dungeon, on a per-run cooldown (turns). `classId` gates class-only
 * skills; the rest are universal. The pure reducer reads these numeric fields — no per-skill code.
 */
export type Ability = {
  id: string;
  name: string;
  emoji: string;
  classId?: string; // undefined = available to every class
  cooldown: number; // turns before it can be used again
  damageMult?: number; // × your attack damage (omit = no attack)
  hits?: number; // number of strikes (default 1 when damageMult set)
  healPct?: number; // heal this fraction of max HP
  guard?: boolean; // also raise guard against the foe's next blow
  autoWeakness?: boolean; // strikes the foe's weakness regardless of coating
  desc: string;
};

export const ABILITIES: Ability[] = [
  // Universal
  { id: "heavy_strike", name: "Heavy Strike", emoji: "🔨", cooldown: 3, damageMult: 2.2, desc: "A committed blow for heavy damage." },
  { id: "mend", name: "Mend", emoji: "💚", cooldown: 4, healPct: 0.32, desc: "Bind your wounds, restoring HP." },
  // Class signatures
  { id: "brace", name: "Brace", emoji: "🛡️", classId: "warrior", cooldown: 4, healPct: 0.12, guard: true, desc: "Raise your shield: guard the next blow and recover a little." },
  { id: "arcane_surge", name: "Arcane Surge", emoji: "🔮", classId: "mage", cooldown: 3, damageMult: 1.7, autoWeakness: true, desc: "Unleash power that always strikes the foe's weakness." },
  { id: "volley", name: "Volley", emoji: "🏹", classId: "archer", cooldown: 3, damageMult: 0.8, hits: 3, desc: "Loose three quick arrows." },
];

export const ABILITY_MAP: Record<string, Ability> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a]),
);

/** Abilities a class may use in a dungeon: every universal one, plus its class signature. */
export function abilitiesFor(classId: string): Ability[] {
  return ABILITIES.filter((a) => !a.classId || a.classId === classId);
}
