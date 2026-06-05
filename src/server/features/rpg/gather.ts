// Gathering orchestration — composes the pure math (domain/gather) with config + persistence.
// One active idle session per player; drops are banked lazily on collect (no timers).
import {
  GATHER,
  GATHER_AREA_MAP,
  GATHER_SKILLS,
  GATHER_TALENTS,
  GATHER_TALENT_MAP,
  GATHER_TOOLS,
  RESOURCES,
  areaResource,
  ratingMult,
  toolAt,
  type GatherSkillId,
} from "./gather-config";
import { computeHarvest, gatherLevel, type Rates } from "./domain/gather";
import {
  addGatherXp,
  addItem,
  allocGatherTalent,
  deleteInventoryRows,
  getGatherTalents,
  getGatheringXp,
  listInventory,
  resetGatherTalents,
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
  skillId?: string;
  areaId?: string;
  resourceId?: string;
  units?: number;
  xp?: number;
  wasCapped?: boolean;
  rates?: Rates;
};

/** Compute (without persisting) what the current session has banked so far. */
export async function previewGather(player: RpgPlayer): Promise<GatherPreview> {
  const { gatherSkillId, gatherAreaId, gatherStartedAt } = player;
  if (!gatherSkillId || !gatherAreaId || !gatherStartedAt) return { active: false };
  const area = GATHER_AREA_MAP[gatherAreaId];
  const rating = area?.yields[gatherSkillId as GatherSkillId];
  const resourceId = areaResource(gatherAreaId, gatherSkillId);
  if (!area || !rating || !resourceId) return { active: false };

  const ranks = await talentRanksFor(player.id, gatherSkillId);
  const rates = ratesFor(player.toolTier, ranks);
  const elapsed = Date.now() - gatherStartedAt.getTime();
  const h = computeHarvest(elapsed, ratingMult(rating), RESOURCES[resourceId].xp, rates);
  return {
    active: true,
    skillId: gatherSkillId,
    areaId: area.id,
    resourceId,
    units: h.units,
    xp: h.xpGained,
    wasCapped: h.wasCapped,
    rates,
  };
}

export type CollectResult = { units: number; xp: number; resourceId: string } | null;

/** Bank the current session's drops + xp and reset the clock (keeps gathering). */
export async function collectGather(player: RpgPlayer): Promise<CollectResult> {
  const p = await previewGather(player);
  if (!p.active || !p.resourceId || !p.skillId) return null;
  if (p.units && p.units > 0) await addItem(player.id, p.resourceId, p.units);
  if (p.xp && p.xp > 0) await addGatherXp(player.id, p.skillId, p.xp);
  await updatePlayer(player.id, { gatherStartedAt: new Date() });
  return { units: p.units ?? 0, xp: p.xp ?? 0, resourceId: p.resourceId };
}

export type StartResult = { ok: boolean; reason?: string };

/** Begin gathering a skill in an area (banks any prior session first). Validates level + offering. */
export async function startGather(
  player: RpgPlayer,
  skillId: string,
  areaId: string,
): Promise<StartResult> {
  const area = GATHER_AREA_MAP[areaId];
  if (!area || !area.yields[skillId as GatherSkillId]) {
    return { ok: false, reason: "That spot doesn't offer that skill." };
  }
  const { total } = await gatheringLevels(player.id);
  if (total < area.reqLevel) {
    return { ok: false, reason: `${area.name} needs total gathering level ${area.reqLevel}.` };
  }
  await collectGather(player); // bank whatever the previous session earned
  await updatePlayer(player.id, {
    gatherSkillId: skillId,
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

export type SellResult = { gold: number; count: number };

/** Sell every resource in the inventory for gold (keeps non-resource items like keys). */
export async function sellResources(player: RpgPlayer): Promise<SellResult> {
  const inv = await listInventory(player.id);
  let gold = 0;
  let count = 0;
  const ids: number[] = [];
  for (const row of inv) {
    const res = RESOURCES[row.itemId];
    if (!res || row.instanceStatsJson) continue; // only plain resource stacks
    gold += res.value * row.qty;
    count += row.qty;
    ids.push(row.id);
  }
  if (ids.length === 0) return { gold: 0, count: 0 };
  await deleteInventoryRows(ids);
  await updatePlayer(player.id, { gold: player.gold + gold });
  return { gold, count };
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
  await allocGatherTalent(player.id, skillId, nodeId);
  return { ok: true };
}

/** Free respec of a skill's gathering talents. */
export async function respecGatherTalents(player: RpgPlayer, skillId: string): Promise<void> {
  await resetGatherTalents(player.id, skillId);
}
