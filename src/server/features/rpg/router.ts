import type { ButtonInteraction, StringSelectMenuInteraction, User } from "discord.js";
import { DEV_TOOLS } from "@/env";
import { track } from "@/server/core/analytics";
import { CLASSES, DEFAULT_CLASS, DIFFICULTY_MAP } from "./config";
import { parseId, type RpgRoute } from "./domain/custom-id";
import {
  createPlayer,
  deletePlayer,
  getAllocatedNodeIds,
  getGatheringXp,
  getPlayer,
  listInventory,
  respecSkills,
  type RpgPlayer,
} from "./queries";
import { allocateSkill, runAdventure, withRegen } from "./service";
import { applyDevCheat } from "./dev";
import {
  allocGatherTalentPoint,
  buyTool,
  collectGather,
  gatheringLevels,
  previewGather,
  resetGatherTalent,
  startFarmXp,
  startGather,
  stopGather,
  talentRanksFor,
} from "./gather";
import { gatherLevel } from "./domain/gather";
import { GATHER_SKILLS } from "./gather-config";
import {
  renderGather,
  renderGatherGuide,
  renderGatherTalents,
  renderGatherTools,
  renderSkillAreas,
} from "./views/gather";
import { renderAdventureResult, renderCombat } from "./views/combat";
import { renderInventory } from "./views/inventory";
import { renderHub } from "./views/hub";
import { renderIntro, renderClassSelect } from "./views/onboarding";
import { renderDeleteConfirm, renderOptions } from "./views/options";
import { renderPlaceholder } from "./views/scaffold";
import { renderSkills, renderActiveSkills } from "./views/skills";
import type { RpgScreen } from "./views/types";

type RpgComponent = ButtonInteraction | StringSelectMenuInteraction;

/** What the router decided to do. The events layer performs the IO (and times it). */
export type RpgResponse =
  | { kind: "update"; screen: RpgScreen }
  | { kind: "reply"; content: string };

/**
 * The hub/spoke core: parse the route, enforce the owner check, and return what to render — but
 * do NOT touch Discord here. The events layer applies the result so it can time the round-trip
 * separately from this (DB-only) work. Navigation is stateless; game state is read fresh.
 */
export async function handleRpgComponent(interaction: RpgComponent): Promise<RpgResponse | null> {
  const route = parseId(interaction.customId);
  if (!route || !interaction.inGuild()) return null;

  // Owner check — the board is public, but only its owner may drive it.
  if (interaction.user.id !== route.ownerId) {
    return {
      kind: "reply",
      content: `That's <@${route.ownerId}>'s adventure — run \`/rpg\` to start your own.`,
    };
  }

  const guildId = interaction.guildId;

  // Onboarding: the class-select buttons create the character with the chosen class.
  if (route.view === "create") {
    const existing = await getPlayer(guildId, interaction.user.id);
    const classId = route.action && CLASSES[route.action] ? route.action : DEFAULT_CLASS;
    const player = existing ?? (await createPlayer(guildId, interaction.user.id, classId));
    if (!existing) void track(guildId, "rpg_character_created", { classId });
    return { kind: "update", screen: renderHub(player, interaction.user) };
  }

  const player = await getPlayer(guildId, interaction.user.id);
  if (!player) {
    // No character yet → intro lore, then class selection.
    if (route.view === "classes") {
      return { kind: "update", screen: renderClassSelect(interaction.user) };
    }
    return { kind: "update", screen: renderIntro(interaction.user) };
  }
  const fresh = await withRegen(player);

  switch (route.view) {
    case "hub":
      return { kind: "update", screen: renderHub(fresh, interaction.user) };
    case "combat": {
      if (route.action === "go") {
        const difficulty = route.args ? DIFFICULTY_MAP[route.args] : undefined;
        // Unknown or still-locked difficulty (stale/forged click) → just re-show the menu.
        if (!difficulty || fresh.level < difficulty.minLevel) {
          return { kind: "update", screen: renderCombat(fresh, interaction.user, Date.now()) };
        }
        const outcome = await runAdventure(fresh, difficulty);
        if (!outcome.ok) {
          return { kind: "update", screen: renderCombat(fresh, interaction.user, Date.now()) };
        }
        void track(guildId, "rpg_adventure", {
          difficulty: difficulty.id,
          defeated: outcome.report.defeated,
          gotKey: outcome.report.keys > 0,
          leveled: outcome.report.leveledTo != null,
        });
        return { kind: "update", screen: renderAdventureResult(outcome.report, interaction.user) };
      }
      return { kind: "update", screen: renderCombat(fresh, interaction.user, Date.now()) };
    }
    case "skills": {
      if (route.action === "actives") {
        const nodeIds = await getAllocatedNodeIds(fresh.id);
        const selected = interaction.isStringSelectMenu() ? interaction.values[0] : undefined;
        return { kind: "update", screen: renderActiveSkills(fresh, interaction.user, nodeIds, selected) };
      }
      if (route.action === "alloc" && interaction.isStringSelectMenu()) {
        await allocateSkill(fresh, interaction.values[0]);
      } else if (route.action === "respec") {
        await respecSkills(fresh.id);
      }
      const nodeIds = await getAllocatedNodeIds(fresh.id);
      return { kind: "update", screen: renderSkills(fresh, interaction.user, nodeIds) };
    }
    case "options": {
      if (route.action === "delete") {
        return { kind: "update", screen: renderDeleteConfirm(interaction.user) };
      }
      if (route.action === "confirm") {
        await deletePlayer(fresh.id);
        void track(guildId, "rpg_character_deleted", {});
        return { kind: "update", screen: renderIntro(interaction.user) };
      }
      return { kind: "update", screen: renderOptions(interaction.user, fresh) };
    }
    case "dev": {
      // Dev cheats — test bot only. The flag guard means a forged id is inert in production.
      if (DEV_TOOLS && route.action) await applyDevCheat(fresh, route.action);
      const updated = (await getPlayer(guildId, interaction.user.id)) ?? fresh;
      return { kind: "update", screen: renderOptions(interaction.user, updated) };
    }
    case "gather":
      return handleGather(interaction, route, fresh, guildId);
    case "inventory": {
      const rows = await listInventory(fresh.id);
      return { kind: "update", screen: renderInventory(interaction.user, rows) };
    }
    case "guild":
    case "quests":
      return {
        kind: "update",
        screen: renderPlaceholder(route.ownerId, route.view, interaction.user),
      };
    default:
      return { kind: "update", screen: renderHub(fresh, interaction.user) };
  }
}

/** Gathering sub-router — kept out of the main switch so handleRpgComponent stays readable. */
async function handleGather(
  interaction: RpgComponent,
  route: RpgRoute,
  player: RpgPlayer,
  guildId: string,
): Promise<RpgResponse> {
  const user = interaction.user;
  const action = route.action;

  // Non-mutating sub-screens.
  if (action === "skill" && interaction.isStringSelectMenu()) {
    const levels = await gatheringLevels(player.id);
    return { kind: "update", screen: renderSkillAreas(user, interaction.values[0], levels) };
  }
  if (action === "guide") {
    return { kind: "update", screen: renderGatherGuide(user) };
  }
  if (action === "tools") {
    const { total } = await gatheringLevels(player.id);
    return { kind: "update", screen: renderGatherTools(user, player, total) };
  }
  if (action === "talents") {
    return { kind: "update", screen: await gatherTalentsScreen(user, player, route.args ?? GATHER_SKILLS[0].id) };
  }
  if (action === "talentpick" && interaction.isStringSelectMenu()) {
    return { kind: "update", screen: await gatherTalentsScreen(user, player, interaction.values[0]) };
  }

  // Mutations that stay on a sub-screen.
  if (action === "buytool" && route.args) {
    const r = await buyTool(player, Number(route.args));
    const p2 = (await getPlayer(guildId, user.id)) ?? player;
    const { total } = await gatheringLevels(p2.id);
    return {
      kind: "update",
      screen: renderGatherTools(user, p2, total, r.ok ? "Tool acquired!" : r.reason),
    };
  }
  if (action === "talent" && route.args && interaction.isStringSelectMenu()) {
    const r = await allocGatherTalentPoint(player, route.args, interaction.values[0]);
    return {
      kind: "update",
      screen: await gatherTalentsScreen(user, player, route.args, r.ok ? undefined : r.reason),
    };
  }
  if (action === "resettalent" && route.args && interaction.isStringSelectMenu()) {
    await resetGatherTalent(player, route.args, interaction.values[0]);
    return {
      kind: "update",
      screen: await gatherTalentsScreen(user, player, route.args, "Talent reset — points refunded."),
    };
  }

  // Mutations that return to the hub.
  let notice: string | undefined;
  if (action === "start") {
    const areaId = interaction.isStringSelectMenu() ? interaction.values[0] : route.args;
    if (areaId) {
      const r = await startGather(player, areaId);
      if (!r.ok) notice = r.reason;
    }
  } else if (action === "farm") {
    const r = await startFarmXp(player);
    notice = r.ok ? `Farming XP at ${r.areaName}. Gathering every skill there.` : r.reason;
  } else if (action === "collect") {
    const r = await collectGather(player);
    notice =
      r && (r.totalUnits || r.xp)
        ? `Collected ${r.totalUnits.toLocaleString()} drops (+${r.xp.toLocaleString()} xp).`
        : "Nothing banked yet.";
  } else if (action === "stop") {
    const r = await stopGather(player);
    notice = r
      ? `Stopped — banked ${r.totalUnits.toLocaleString()} drops (+${r.xp.toLocaleString()} xp).`
      : "Stopped gathering.";
  }

  const p2 = (await getPlayer(guildId, user.id)) ?? player;
  const levels = await gatheringLevels(p2.id);
  const preview = await previewGather(p2);
  return { kind: "update", screen: renderGather(user, p2, levels, preview, notice) };
}

async function gatherTalentsScreen(
  user: User,
  player: RpgPlayer,
  skillId: string,
  notice?: string,
): Promise<RpgScreen> {
  const xp = await getGatheringXp(player.id);
  const level = gatherLevel(xp[skillId] ?? 0);
  const ranks = await talentRanksFor(player.id, skillId);
  return renderGatherTalents(user, skillId, level, ranks, notice);
}
