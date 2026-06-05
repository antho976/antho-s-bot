// Gathering subsystem — idle resource collection. All content + tunables live here (like config.ts
// does for combat). Pure math in domain/gather.ts; orchestration in gather.ts.
//
// Drop model: each area carries a weighted drop table per skill it offers. Better areas either
// unlock a rarer resource the starter areas can't drop, or shift the odds toward the better drops.

export const GATHER = {
  baseActionMs: 5_000, // time for one harvest action at no bonuses
  baseCapMs: 12 * 60 * 60_000, // idle banks up to 12h of actions (raised by tool/talents)
  xpBase: 60, // per-skill curve: xp from level L→L+1 = xpBase * L^xpFactor
  xpFactor: 1.9,
  maxLevel: 99,
} as const;

export type GatherSkillId = "mining" | "woodcutting" | "herbalism" | "fishing";

export type GatherSkill = { id: GatherSkillId; name: string; verb: string; emoji: string; noun: string };

export const GATHER_SKILLS: GatherSkill[] = [
  { id: "mining", name: "Mining", verb: "Mining", emoji: "⛏️", noun: "veins" },
  { id: "woodcutting", name: "Woodcutting", verb: "Chopping", emoji: "🪓", noun: "timber" },
  { id: "herbalism", name: "Herbalism", verb: "Foraging", emoji: "🌿", noun: "herbs" },
  { id: "fishing", name: "Fishing", verb: "Fishing", emoji: "🎣", noun: "shoals" },
];

export const GATHER_SKILL_MAP: Record<string, GatherSkill> = Object.fromEntries(
  GATHER_SKILLS.map((s) => [s.id, s]),
);

/** A resource drop — stored in rpg_inventory by id. `xp` is the skill xp per action that yields it
 *  (rarer drops are worth more). These are the future crafting inputs (the seam). */
export type GatherResource = { id: string; name: string; xp: number };

export const RESOURCES: Record<string, GatherResource> = {
  // Mining (common → rare)
  ore_copper: { id: "ore_copper", name: "Copper Ore", xp: 6 },
  ore_iron: { id: "ore_iron", name: "Iron Ore", xp: 12 },
  ore_silver: { id: "ore_silver", name: "Silver Ore", xp: 22 },
  ore_adamant: { id: "ore_adamant", name: "Adamant Ore", xp: 36 },
  // Woodcutting
  log_birch: { id: "log_birch", name: "Birch Log", xp: 6 },
  log_oak: { id: "log_oak", name: "Oak Log", xp: 12 },
  log_yew: { id: "log_yew", name: "Yew Log", xp: 22 },
  log_worldash: { id: "log_worldash", name: "World-Ash Log", xp: 36 },
  // Herbalism
  herb_nettle: { id: "herb_nettle", name: "Nettle", xp: 7 },
  herb_moly: { id: "herb_moly", name: "Moly", xp: 13 },
  herb_wolfsbane: { id: "herb_wolfsbane", name: "Wolfsbane", xp: 24 },
  herb_ambrosia: { id: "herb_ambrosia", name: "Ambrosia Bloom", xp: 38 },
  // Fishing
  fish_herring: { id: "fish_herring", name: "Herring", xp: 7 },
  fish_trout: { id: "fish_trout", name: "Trout", xp: 13 },
  fish_pike: { id: "fish_pike", name: "Pike", xp: 24 },
  fish_roe: { id: "fish_roe", name: "Lyngbakr Roe", xp: 38 },
};

/** Each skill's resources, ordered common → rare. An area's drop weights align to this order. */
export const LADDER: Record<GatherSkillId, string[]> = {
  mining: ["ore_copper", "ore_iron", "ore_silver", "ore_adamant"],
  woodcutting: ["log_birch", "log_oak", "log_yew", "log_worldash"],
  herbalism: ["herb_nettle", "herb_moly", "herb_wolfsbane", "herb_ambrosia"],
  fishing: ["fish_herring", "fish_trout", "fish_pike", "fish_roe"],
};

/**
 * An area you can gather in. Gated by TOTAL gathering level. `drops` maps each offered skill to
 * weights aligned to that skill's LADDER (0 = that resource never drops here). Mixed on purpose —
 * some areas are strong for one skill, some serve two or three, some are weak all-rounders.
 */
export type GatherArea = {
  id: string;
  name: string;
  blurb: string;
  reqLevel: number;
  drops: Partial<Record<GatherSkillId, number[]>>;
};

export const GATHER_AREAS: GatherArea[] = [
  // Open from the start
  {
    id: "ginnungagap",
    name: "Ginnungagap Verge",
    blurb: "The primordial void's edge — meagre pickings, but it takes all comers.",
    reqLevel: 0,
    drops: { mining: [85, 15, 0, 0], woodcutting: [85, 15, 0, 0], herbalism: [85, 15, 0, 0], fishing: [85, 15, 0, 0] },
  },
  { id: "svartalfar", name: "Svartálfar Deeps", blurb: "Dwarf-delved tunnels veined with ore.", reqLevel: 0, drops: { mining: [55, 40, 5, 0], herbalism: [80, 20, 0, 0] } },
  { id: "jarnvidr", name: "Járnviðr", blurb: "The Ironwood — dense, dark, endless timber.", reqLevel: 0, drops: { woodcutting: [55, 40, 5, 0], mining: [80, 20, 0, 0] } },
  { id: "asphodel", name: "Fields of Asphodel", blurb: "Pale underworld meadows thick with strange herbs.", reqLevel: 0, drops: { herbalism: [55, 40, 5, 0], fishing: [80, 20, 0, 0] } },
  { id: "styx", name: "Shores of Styx", blurb: "The dread river's cold waters teem with fish.", reqLevel: 0, drops: { fishing: [55, 40, 5, 0], herbalism: [80, 20, 0, 0] } },
  // Mid — needs some total level
  { id: "nidavellir", name: "Niðavellir Forge-Caves", blurb: "Where the dwarves smelt; iron runs deep, with seams of silver.", reqLevel: 18, drops: { mining: [15, 50, 30, 5], woodcutting: [30, 55, 15, 0] } },
  { id: "nemean", name: "Nemean Wilds", blurb: "The lion's old hunting ground, overgrown and giving.", reqLevel: 18, drops: { woodcutting: [15, 50, 30, 5], herbalism: [30, 50, 20, 0], mining: [60, 35, 5, 0] } },
  { id: "idunn", name: "Grove of Iðunn", blurb: "The apple-keeper tends rare herbs among the boughs.", reqLevel: 24, drops: { herbalism: [15, 50, 30, 5], woodcutting: [30, 55, 15, 0], fishing: [60, 35, 5, 0] } },
  { id: "mimir", name: "Mímir's Well", blurb: "Wisdom's spring — and fat fish in the deep beneath it.", reqLevel: 24, drops: { fishing: [15, 50, 30, 5], herbalism: [30, 50, 20, 0] } },
  // Late — high total level; the rare drops become reliable
  { id: "othrys", name: "Mount Othrys", blurb: "The Titans' seat; its roots are veined with adamant.", reqLevel: 48, drops: { mining: [0, 15, 45, 40], woodcutting: [40, 45, 15, 0] } },
  { id: "glasir", name: "Glasir's Grove", blurb: "The golden-leaved tree before Valhalla — peerless wood.", reqLevel: 48, drops: { woodcutting: [0, 15, 45, 40], herbalism: [20, 45, 30, 5] } },
  { id: "hesperides", name: "Garden of the Hesperides", blurb: "Nymph-tended groves of golden, potent flora.", reqLevel: 54, drops: { herbalism: [0, 15, 45, 40], fishing: [20, 45, 30, 5] } },
  { id: "lyngbakr", name: "Sea of Lyngbakr", blurb: "Waters astride the island-whale — monstrous catches.", reqLevel: 54, drops: { fishing: [0, 15, 45, 40], mining: [30, 45, 20, 5] } },
];

export const GATHER_AREA_MAP: Record<string, GatherArea> = Object.fromEntries(
  GATHER_AREAS.map((a) => [a.id, a]),
);

/** Skills an area offers (those with a non-empty drop table). */
export function areaSkills(area: GatherArea): GatherSkillId[] {
  return (Object.keys(area.drops) as GatherSkillId[]).filter((s) =>
    (area.drops[s] ?? []).some((w) => w > 0),
  );
}

/** The drop table for one skill in an area: each obtainable resource with its weight + xp. */
export function areaDropTable(
  areaId: string,
  skillId: string,
): { resourceId: string; weight: number; xp: number }[] {
  const area = GATHER_AREA_MAP[areaId];
  const weights = area?.drops[skillId as GatherSkillId];
  if (!weights) return [];
  const ladder = LADDER[skillId as GatherSkillId];
  return weights
    .map((weight, i) => ({ resourceId: ladder[i], weight, xp: RESOURCES[ladder[i]].xp }))
    .filter((d) => d.weight > 0);
}

/** The rarest resource obtainable for a skill in an area (the "up to X" ceiling), or null. */
export function topResourceName(areaId: string, skillId: string): string | null {
  const table = areaDropTable(areaId, skillId);
  if (table.length === 0) return null;
  return RESOURCES[table[table.length - 1].resourceId].name;
}

/** Flavour word for how good a skill is in an area, from the drop table's tier weighting. */
const ABUNDANCE: { min: number; word: string }[] = [
  { min: 3.0, word: "abundant" },
  { min: 2.3, word: "rich" },
  { min: 1.8, word: "plentiful" },
  { min: 1.4, word: "modest" },
  { min: 0, word: "sparse" },
];

export function areaAbundance(areaId: string, skillId: string): string {
  const table = areaDropTable(areaId, skillId);
  if (table.length === 0) return "none";
  const ladder = LADDER[skillId as GatherSkillId];
  const sum = table.reduce((a, t) => a + t.weight, 0) || 1;
  const score = table.reduce((a, t) => a + t.weight * (ladder.indexOf(t.resourceId) + 1), 0) / sum;
  return (ABUNDANCE.find((b) => score >= b.min) ?? ABUNDANCE[ABUNDANCE.length - 1]).word;
}

/** Drop odds for a skill in an area, as resource name + rounded percent (common → rare). */
export function areaOdds(areaId: string, skillId: string): { name: string; pct: number }[] {
  const table = areaDropTable(areaId, skillId);
  const sum = table.reduce((a, t) => a + t.weight, 0) || 1;
  return table.map((t) => ({ name: RESOURCES[t.resourceId].name, pct: Math.round((t.weight / sum) * 100) }));
}

/** The multitool ladder — one tool line for every skill. Each tier needs a total gathering level +
 *  gold (earned from combat) and strictly improves on the last. Tier 0 (bare hands) is implicit. */
export type GatherTool = {
  tier: number;
  name: string;
  reqLevel: number;
  cost: number;
  speed: number; // action-speed multiplier (higher = faster)
  efficiency: number; // resources per action
  doubleChance: number; // chance to double an action's drop
  capBonusH: number; // extra idle hours over the 12h base
};

export const GATHER_TOOLS: GatherTool[] = [
  { tier: 1, name: "Worn Multitool", reqLevel: 0, cost: 250, speed: 1.15, efficiency: 1.1, doubleChance: 0.05, capBonusH: 0 },
  { tier: 2, name: "Dwarf-forged Multitool", reqLevel: 30, cost: 1_500, speed: 1.35, efficiency: 1.25, doubleChance: 0.12, capBonusH: 1 },
  { tier: 3, name: "Bronze of Hephaestus", reqLevel: 70, cost: 6_000, speed: 1.6, efficiency: 1.45, doubleChance: 0.2, capBonusH: 2 },
  { tier: 4, name: "Uru-cast Multitool", reqLevel: 130, cost: 20_000, speed: 1.9, efficiency: 1.7, doubleChance: 0.3, capBonusH: 4 },
  { tier: 5, name: "Gleipnir-wrought Multitool", reqLevel: 220, cost: 60_000, speed: 2.3, efficiency: 2.0, doubleChance: 0.45, capBonusH: 6 },
];

export function toolName(tier: number): string {
  return GATHER_TOOLS.find((t) => t.tier === tier)?.name ?? "Bare hands";
}

/** Tool bonuses for a tier (0 = bare hands). */
export function toolAt(tier: number): { speed: number; efficiency: number; doubleChance: number; capBonusH: number } {
  const t = GATHER_TOOLS.find((x) => x.tier === tier);
  return t
    ? { speed: t.speed, efficiency: t.efficiency, doubleChance: t.doubleChance, capBonusH: t.capBonusH }
    : { speed: 1, efficiency: 1, doubleChance: 0, capBonusH: 0 };
}

/** Per-skill talents (the "small tree"). Same shape for every skill; points to spend = skill level. */
export type TalentKind = "speed" | "efficiency" | "double" | "cap";
export type GatherTalent = { id: string; name: string; kind: TalentKind; per: number; maxRank: number; unit: string };

export const GATHER_TALENTS: GatherTalent[] = [
  { id: "efficiency", name: "Efficiency", kind: "efficiency", per: 0.1, maxRank: 5, unit: "+10% yield" },
  { id: "double", name: "Double Drops", kind: "double", per: 0.04, maxRank: 5, unit: "+4% double" },
  { id: "swift", name: "Swift Hands", kind: "speed", per: 0.08, maxRank: 5, unit: "+8% speed" },
  { id: "endurance", name: "Endurance", kind: "cap", per: 1, maxRank: 4, unit: "+1h idle cap" },
];

export const GATHER_TALENT_MAP: Record<string, GatherTalent> = Object.fromEntries(
  GATHER_TALENTS.map((t) => [t.id, t]),
);
