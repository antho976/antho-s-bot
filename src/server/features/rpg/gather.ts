// Gathering orchestration — composes the pure math (domain/gather) with config + persistence.
// One active idle session per player; drops are banked lazily on collect (no timers, survives
// the bot being offline — elapsed is computed from a stored timestamp).
import {
  GATHER,
  GATHER_AREAS,
  GATHER_AREA_MAP,
  GATHER_SKILLS,
  GATHER_TALENTS,
  GATHER_TALENT_MAP,
  GATHER_TOOLS,
  areaDropTable,
  areaSkills,
  toolAt,
} from "./gather-config";
import { computeHarvest, gatherLevel, type Rates } from "./domain/gather";
import {
  addGatherXp,
  addItem,
  allocGatherTalent,
  getGatherTalents,
  getGatheringXp,
  resetGatherTalentNode,
  updatePlayer,
  type RpgPlayer,
} from "./queries";

export type GatheringLevels = { perSkill: Record<string, number>; total: number };

/** Per-skill levels (derived from xp) + the summed total used to gate areas/tools. */
export async function gatheringLevels(playerId: number): Promise<GatheringLevels> {
  const xp = await getGatheringXp(playerId);
  const perSkill: Record<string, number> = {};
  let total = 0;
  for (const s of GATHER_SKILLS) {
    const lvl = gatherLevel(xp[s.id] ?? 0);
    perSkill[s.id] = lvl;
    total += lvl;
  }
  return { perSkill, total };
}

/** Allocated talent ranks for one skill, as { nodeId: rank }. */
export async function talentRanksFor(
  playerId: number,
  skillId: string,
): Promise<Record<string, number>> {
  const rows = await getGatherTalents(playerId);
  const out: Record<string, number> = {};
  for (const r of rows) if (r.skillId === skillId) out[r.nodeId] = r.rank;
  return out;
}

/** Fold the tool tier + a skill's talents into effective harvest rates. */
export function ratesFor(toolTier: number, ranks: Record<string, number>): Rates {
  const tool = toolAt(toolTier);
  let speed = tool.speed;
  let efficiency = tool.efficiency;
  let doubleChance = tool.doubleChance;
  let capH = tool.capBonusH;
  for (const t of GATHER_TALENTS) {
    const r = ranks[t.id] ?? 0;
    if (!r) continue;
    if (t.kind === "speed") speed += t.per * r;
    else if (t.kind === "efficiency") efficiency += t.per * r;
    else if (t.kind === "double") doubleChance += t.per * r;
    else if (t.kind === "cap") capH += t.per * r;
  }
  return {
    speed,
    efficiency,
    doubleChance: Math.min(0.95, doubleChance),
    capMs: GATHER.baseCapMs + capH * 3_600_000,
  };
}

export type GatherPreview = {
  active: boolean;
  areaId?: string;
  drops?: { resourceId: string; units: number }[];
  totalUnits?: number;
  xp?: number;
  perSkill?: { skillId: string; xp: number }[];
  wasCapped?: boolean;
  remainingMs?: number;
};

/**
 * Compute (without persisting) what the current session has earned so far. You gather *every* skill
 * the area offers at once, so this aggregates across them. Pure time math — counts real elapsed
 * time whether or not the bot was online for it.
 */
export async function previewGather(player: RpgPlayer): Promise<GatherPreview> {
  const { gatherAreaId, gatherStartedAt } = player;
  if (!gatherAreaId || !gatherStartedAt) return { active: false };
  const area = GATHER_AREA_MAP[gatherAreaId];
  const skills = area ? areaSkills(area) : [];
  if (skills.length === 0) return { active: false };

  const elapsed = Date.now() - gatherStartedAt.getTime();
  const dropMap = new Map<string, number>();
  const perSkill: { skillId: string; xp: number }[] = [];
  let xp = 0;
  let maxCapMs = 0;
  for (const s of skills) {
    const ranks = await talentRanksFor(player.id, s);
    const rates = ratesFor(player.toolTier, ranks);
    maxCapMs = Math.max(maxCapMs, rates.capMs);
    const h = computeHarvest(elapsed, areaDropTable(gatherAreaId, s), rates);
    for (const d of h.drops) dropMap.set(d.resourceId, (dropMap.get(d.resourceId) ?? 0) + d.units);
    perSkill.push({ skillId: s, xp: h.xpGained });
    xp += h.xpGained;
  }
  const drops = [...dropMap].map(([resourceId, units]) => ({ resourceId, units }));
  const totalUnits = drops.reduce((a, d) => a + d.units, 0);
  const remainingMs = Math.max(0, maxCapMs - elapsed);
  return { active: true, areaId: gatherAreaId, drops, totalUnits, xp, perSkill, wasCapped: remainingMs <= 0, remainingMs };
}

export type CollectResult = { totalUnits: number; xp: number } | null;

/** Bank the current session's drops + xp and reset the clock (keeps gathering). */
export async function collectGather(player: RpgPlayer): Promise<CollectResult> {
  const p = await previewGather(player);
  if (!p.active) return null;
  for (const d of p.drops ?? []) await addItem(player.id, d.resourceId, d.units);
  for (const ps of p.perSkill ?? []) if (ps.xp > 0) await addGatherXp(player.id, ps.skillId, ps.xp);
  await updatePlayer(player.id, { gatherStartedAt: new Date() });
  return { totalUnits: p.totalUnits ?? 0, xp: p.xp ?? 0 };
}

export type StartResult = { ok: boolean; reason?: string };

/** Begin gathering a skill in an area (banks any prior session first). Validates level + offering. */
export async function startGather(player: RpgPlayer, areaId: string): Promise<StartResult> {
  const area = GATHER_AREA_MAP[areaId];
  if (!area || areaSkills(area).length === 0) return { ok: false, reason: "Unknown area." };
  const { total } = await gatheringLevels(player.id);
  if (total < area.reqLevel) {
    return { ok: false, reason: `${area.name} needs total gathering level ${area.reqLevel}.` };
  }
  await collectGather(player); // bank whatever the previous session earned
  await updatePlayer(player.id, {
    gatherSkillId: null,
    gatherAreaId: areaId,
    gatherStartedAt: new Date(),
  });
  return { ok: true };
}

/** Bank the final drops and end the session. */
export async function stopGather(player: RpgPlayer): Promise<CollectResult> {
  const r = await collectGather(player);
  await updatePlayer(player.id, {
    gatherSkillId: null,
    gatherAreaId: null,
    gatherStartedAt: null,
  });
  return r;
}

/** The best "farm everything" area unlocked: most skills offered, then highest tier. */
function bestFarmArea(total: number): string | null {
  const unlocked = GATHER_AREAS.filter((a) => total >= a.reqLevel);
  if (unlocked.length === 0) return null;
  const best = unlocked.reduce((b, a) => {
    const na = areaSkills(a).length;
    const nb = areaSkills(b).length;
    if (na !== nb) return na > nb ? a : b;
    return a.reqLevel > b.reqLevel ? a : b;
  });
  return best.id;
}

export type FarmResult = { ok: boolean; areaName?: string; reason?: string };

/** "Farm XP": jump straight into the best multi-skill area you've unlocked. */
export async function startFarmXp(player: RpgPlayer): Promise<FarmResult> {
  const { total } = await gatheringLevels(player.id);
  const areaId = bestFarmArea(total);
  if (!areaId) return { ok: false, reason: "No areas unlocked yet." };
  const r = await startGather(player, areaId);
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, areaName: GATHER_AREA_MAP[areaId].name };
}

export type BuyToolResult = { ok: boolean; reason?: string };

/** Buy the next multitool tier (ladder: must own the prior tier, meet level + gold). */
export async function buyTool(player: RpgPlayer, tier: number): Promise<BuyToolResult> {
  const tool = GATHER_TOOLS.find((t) => t.tier === tier);
  if (!tool) return { ok: false, reason: "Unknown tool." };
  if (player.toolTier >= tier) return { ok: false, reason: "You already own that tool." };
  if (player.toolTier !== tier - 1) return { ok: false, reason: "Buy the previous tier first." };
  const { total } = await gatheringLevels(player.id);
  if (total < tool.reqLevel) {
    return { ok: false, reason: `Needs total gathering level ${tool.reqLevel}.` };
  }
  if (player.gold < tool.cost) return { ok: false, reason: `Needs ${tool.cost.toLocaleString()} gold.` };
  await collectGather(player); // bank pending drops at the old tool's rate before upgrading
  await updatePlayer(player.id, { toolTier: tier, gold: player.gold - tool.cost });
  return { ok: true };
}

export type AllocResult = { ok: boolean; reason?: string };

/** Spend one point on a gathering talent (points = that skill's level). */
export async function allocGatherTalentPoint(
  player: RpgPlayer,
  skillId: string,
  nodeId: string,
): Promise<AllocResult> {
  const talent = GATHER_TALENT_MAP[nodeId];
  if (!talent) return { ok: false, reason: "Unknown talent." };
  const xp = await getGatheringXp(player.id);
  const level = gatherLevel(xp[skillId] ?? 0);
  const ranks = await talentRanksFor(player.id, skillId);
  const spent = Object.values(ranks).reduce((a, b) => a + b, 0);
  if (spent >= level) return { ok: false, reason: "No talent points free — level the skill up." };
  if ((ranks[nodeId] ?? 0) >= talent.maxRank) return { ok: false, reason: "That talent is maxed." };
  await collectGather(player); // bank pending drops at the old rates, so the new rank only counts going forward
  await allocGatherTalent(player.id, skillId, nodeId);
  return { ok: true };
}

/** Free refund of a single gathering talent (its points return to that skill's pool). */
export async function resetGatherTalent(
  player: RpgPlayer,
  skillId: string,
  nodeId: string,
): Promise<void> {
  await collectGather(player); // bank pending drops (still with this talent) before it's removed
  await resetGatherTalentNode(player.id, skillId, nodeId);
}
