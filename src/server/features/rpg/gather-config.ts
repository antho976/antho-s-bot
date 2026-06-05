// Gathering subsystem — idle resource collection. All content + tunables live here (like config.ts
// does for combat), so adding skills/areas/tools is editing data, not the engine. The pure math is
// in domain/gather.ts; orchestration in gather.ts. See planning/11 for the RPG's data-as-content rule.

export const GATHER = {
  baseActionMs: 5_000, // time for one harvest action at no bonuses
  baseCapMs: 12 * 60 * 60_000, // idle banks up to 12h of actions (raised by tool/talents)
  xpBase: 60, // per-skill curve: xp from level L→L+1 = xpBase * L^xpFactor
  xpFactor: 1.9,
  maxLevel: 99,
} as const;

export type GatherSkillId = "mining" | "woodcutting" | "herbalism" | "fishing";

export type GatherSkill = { id: GatherSkillId; name: string; emoji: string; verb: string };

export const GATHER_SKILLS: GatherSkill[] = [
  { id: "mining", name: "Mining", emoji: "⛏️", verb: "mining" },
  { id: "woodcutting", name: "Woodcutting", emoji: "🪓", verb: "chopping" },
  { id: "herbalism", name: "Herbalism", emoji: "🌿", verb: "foraging" },
  { id: "fishing", name: "Fishing", emoji: "🎣", verb: "fishing" },
];

export const GATHER_SKILL_MAP: Record<string, GatherSkill> = Object.fromEntries(
  GATHER_SKILLS.map((s) => [s.id, s]),
);

/** Resource drops — stored in rpg_inventory by id. `value` = sell gold; `xp` = skill xp per action.
 *  These are also the future crafting inputs (the seam: they're plain stackable items already). */
export type GatherResource = { id: string; name: string; emoji: string; value: number; xp: number };

export const RESOURCES: Record<string, GatherResource> = {
  // Mining
  ore_copper: { id: "ore_copper", name: "Copper Ore", emoji: "🟫", value: 3, xp: 6 },
  ore_iron: { id: "ore_iron", name: "Iron Ore", emoji: "⛓️", value: 9, xp: 15 },
  ore_adamant: { id: "ore_adamant", name: "Adamant Ore", emoji: "🔩", value: 24, xp: 34 },
  // Woodcutting
  log_birch: { id: "log_birch", name: "Birch Log", emoji: "🪵", value: 3, xp: 6 },
  log_oak: { id: "log_oak", name: "Oak Log", emoji: "🪵", value: 9, xp: 15 },
  log_ashwood: { id: "log_ashwood", name: "World-Ash Log", emoji: "🪵", value: 24, xp: 34 },
  // Herbalism
  herb_nettle: { id: "herb_nettle", name: "Nettle", emoji: "🌱", value: 4, xp: 7 },
  herb_moly: { id: "herb_moly", name: "Moly", emoji: "🌿", value: 11, xp: 17 },
  herb_ambrosia: { id: "herb_ambrosia", name: "Ambrosia Bloom", emoji: "💮", value: 27, xp: 36 },
  // Fishing
  fish_herring: { id: "fish_herring", name: "Herring", emoji: "🐟", value: 4, xp: 7 },
  fish_trout: { id: "fish_trout", name: "Trout", emoji: "🐠", value: 11, xp: 17 },
  fish_roe: { id: "fish_roe", name: "Lyngbakr Roe", emoji: "🍥", value: 27, xp: 36 },
};

/** The resource each skill drops, by tier (1-3). An area's `tier` selects which one. */
export const RESOURCE_BY_SKILL: Record<GatherSkillId, [string, string, string]> = {
  mining: ["ore_copper", "ore_iron", "ore_adamant"],
  woodcutting: ["log_birch", "log_oak", "log_ashwood"],
  herbalism: ["herb_nettle", "herb_moly", "herb_ambrosia"],
  fishing: ["fish_herring", "fish_trout", "fish_roe"],
};

export type YieldRating = "poor" | "good" | "best";

export function ratingMult(r: YieldRating): number {
  return r === "best" ? 1.6 : r === "good" ? 1.0 : 0.5;
}

export function ratingIcon(r: YieldRating): string {
  return r === "best" ? "🟢" : r === "good" ? "🟡" : "🔴";
}

/** An area you can idle in. Gated by TOTAL gathering level; rates each skill it offers. Mixed on
 *  purpose — some are best-in-slot for one skill, some serve two, some are weak all-rounders. */
export type GatherArea = {
  id: string;
  name: string;
  blurb: string;
  reqLevel: number; // required total gathering level
  tier: 1 | 2 | 3; // which resource tier its skills drop
  yields: Partial<Record<GatherSkillId, YieldRating>>;
};

export const GATHER_AREAS: GatherArea[] = [
  // Tier 1 — open from the start
  { id: "ginnungagap", name: "Ginnungagap Verge", blurb: "The primordial void's edge — meagre pickings, but it takes all comers.", reqLevel: 0, tier: 1, yields: { mining: "poor", woodcutting: "poor", herbalism: "poor", fishing: "poor" } },
  { id: "svartalfar", name: "Svartálfar Deeps", blurb: "Dwarf-delved tunnels veined with ore.", reqLevel: 0, tier: 1, yields: { mining: "best", herbalism: "poor" } },
  { id: "jarnvidr", name: "Járnviðr", blurb: "The Ironwood — dense, dark, endless timber.", reqLevel: 0, tier: 1, yields: { woodcutting: "best", mining: "poor" } },
  { id: "asphodel", name: "Fields of Asphodel", blurb: "Pale underworld meadows thick with strange herbs.", reqLevel: 0, tier: 1, yields: { herbalism: "best", fishing: "poor" } },
  { id: "styx", name: "Shores of Styx", blurb: "The dread river's cold waters teem with fish.", reqLevel: 0, tier: 1, yields: { fishing: "best", herbalism: "poor" } },
  // Tier 2 — mid (needs some total level)
  { id: "nidavellir", name: "Niðavellir Forge-Caves", blurb: "Where the dwarves smelt — iron runs deep.", reqLevel: 18, tier: 2, yields: { mining: "best", woodcutting: "good" } },
  { id: "nemean", name: "Nemean Wilds", blurb: "The lion's old hunting ground, overgrown and giving.", reqLevel: 18, tier: 2, yields: { woodcutting: "best", herbalism: "good", mining: "poor" } },
  { id: "idunn", name: "Grove of Iðunn", blurb: "The apple-keeper tends rare herbs among the boughs.", reqLevel: 24, tier: 2, yields: { herbalism: "best", woodcutting: "good", fishing: "poor" } },
  { id: "mimir", name: "Mímir's Well", blurb: "Wisdom's spring — and fat fish in the deep beneath it.", reqLevel: 24, tier: 2, yields: { fishing: "best", herbalism: "good" } },
  // Tier 3 — late (high total level)
  { id: "othrys", name: "Mount Othrys", blurb: "The Titans' seat; its roots are veined with adamant.", reqLevel: 48, tier: 3, yields: { mining: "best", woodcutting: "poor" } },
  { id: "glasir", name: "Glasir's Grove", blurb: "The golden-leaved tree before Valhalla — peerless wood.", reqLevel: 48, tier: 3, yields: { woodcutting: "best", herbalism: "good" } },
  { id: "hesperides", name: "Garden of the Hesperides", blurb: "Nymph-tended groves of golden, potent flora.", reqLevel: 54, tier: 3, yields: { herbalism: "best", fishing: "good" } },
  { id: "lyngbakr", name: "Sea of Lyngbakr", blurb: "Waters astride the island-whale — monstrous catches.", reqLevel: 54, tier: 3, yields: { fishing: "best", mining: "poor" } },
];

export const GATHER_AREA_MAP: Record<string, GatherArea> = Object.fromEntries(
  GATHER_AREAS.map((a) => [a.id, a]),
);

/** The resource id a skill drops in an area (by the area's tier), or null if the area lacks it. */
export function areaResource(areaId: string, skillId: string): string | null {
  const area = GATHER_AREA_MAP[areaId];
  if (!area || !area.yields[skillId as GatherSkillId]) return null;
  return RESOURCE_BY_SKILL[skillId as GatherSkillId][area.tier - 1];
}

/** The multitool ladder — one tool line for every skill. Each tier needs a total gathering level +
 *  gold and strictly improves on the last. Tier 0 (bare hands) is implicit. */
export type GatherTool = {
  tier: number;
  name: string;
  reqLevel: number; // total gathering level
  cost: number; // gold
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

export const MAX_TOOL_TIER = GATHER_TOOLS.length;

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
export type GatherTalent = { id: string; name: string; kind: TalentKind; per: number; maxRank: number; emoji: string; unit: string };

export const GATHER_TALENTS: GatherTalent[] = [
  { id: "efficiency", name: "Efficiency", kind: "efficiency", per: 0.1, maxRank: 5, emoji: "📦", unit: "+10% yield" },
  { id: "double", name: "Double Drops", kind: "double", per: 0.04, maxRank: 5, emoji: "✨", unit: "+4% double" },
  { id: "swift", name: "Swift Hands", kind: "speed", per: 0.08, maxRank: 5, emoji: "💨", unit: "+8% speed" },
  { id: "endurance", name: "Endurance", kind: "cap", per: 1, maxRank: 4, emoji: "⏳", unit: "+1h idle cap" },
];

export const GATHER_TALENT_MAP: Record<string, GatherTalent> = Object.fromEntries(
  GATHER_TALENTS.map((t) => [t.id, t]),
);
