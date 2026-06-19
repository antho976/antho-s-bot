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
import {
  allocateSkill,
  fightRound,
  fleeEncounter,
  startAdventure,
  withCharges,
  withRegen,
  type AdventureReport,
  type Encounter,
} from "./service";
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
import { renderAdventure, renderAdventureResult, renderCombatHome, renderEncounter } from "./views/combat";
import { renderInventory } from "./views/inventory";
import {
  blacksmithLevel,
  craftWeapon,
  equipWeapon,
  equippedWeapon,
  getWeapon,
  listWeapons,
  materialCounts,
  unequipWeapon,
  upgradeWeapon,
  upgradeWeaponMax,
} from "./blacksmith";
import {
  renderBlacksmith,
  renderCraft,
  renderWeaponDetail,
  renderWeapons,
} from "./views/blacksmith";
import {
  actInDungeon,
  countKeys,
  dungeonActives,
  enterDungeon,
  fleeDungeon,
  getActiveRun,
} from "./dungeon";
import { dungeonDef } from "./dungeon-config";
import type { DungeonAction } from "./domain/dungeon";
import {
  renderDungeonCombat,
  renderDungeonList,
  renderDungeonResult,
} from "./views/dungeon";
import { renderHub, renderPlayer } from "./views/hub";
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
    case "player":
      return { kind: "update", screen: renderPlayer(fresh, interaction.user) };
    case "combat": {
      const trackResult = (report: AdventureReport) =>
        void track(guildId, "rpg_adventure", {
          difficulty: report.difficulty.id,
          defeated: report.defeated,
          gotKey: report.keys > 0,
          leveled: report.leveledTo != null,
          packSize: report.packSize,
        });

      if (route.action === "fight") {
        const out = await fightRound(fresh);
        if (out?.kind === "encounter") {
          return { kind: "update", screen: renderEncounter(out.player, interaction.user, out.encounter) };
        }
        if (out?.kind === "result") {
          trackResult(out.report);
          return { kind: "update", screen: renderAdventureResult(out.report, interaction.user) };
        }
      } else if (route.action === "flee") {
        const out = await fleeEncounter(fresh);
        if (out?.kind === "result") {
          return { kind: "update", screen: renderAdventureResult(out.report, interaction.user) };
        }
      } else if (route.action === "go" && !fresh.adventureEncounterJson) {
        const difficulty = route.args ? DIFFICULTY_MAP[route.args] : undefined;
        // Unknown or still-locked difficulty (stale/forged click) → fall through to the menu.
        if (difficulty && fresh.level >= difficulty.minLevel) {
          const out = await startAdventure(fresh, difficulty);
          if (out.kind === "no_charge") {
            const { player: p, charges } = await withCharges(fresh);
            return { kind: "update", screen: renderAdventure(p, interaction.user, charges, "Out of charges — rest up.") };
          }
          if (out.kind === "encounter") {
            return { kind: "update", screen: renderEncounter(out.player, interaction.user, out.encounter) };
          }
          trackResult(out.report);
          return { kind: "update", screen: renderAdventureResult(out.report, interaction.user) };
        }
      }

      // A live pack fight always takes priority — resume it.
      if (fresh.adventureEncounterJson) {
        const enc = JSON.parse(fresh.adventureEncounterJson) as Encounter;
        return { kind: "update", screen: renderEncounter(fresh, interaction.user, enc) };
      }
      // Bare "combat" → the Combat home; any adventure action → the Adventure picker.
      if (!route.action) {
        const { player: cp, charges } = await withCharges(fresh);
        const keys = await countKeys(fresh.id);
        return { kind: "update", screen: renderCombatHome(cp, interaction.user, charges, keys) };
      }
      const { player: cp, charges } = await withCharges(fresh);
      return { kind: "update", screen: renderAdventure(cp, interaction.user, charges) };
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
    case "smith":
      return handleSmith(interaction, route, fresh, guildId);
    case "dungeon":
      return handleDungeon(interaction, route, fresh, guildId);
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

/** Blacksmith sub-router: forge weapons, enhance them, and equip them. */
async function handleSmith(
  interaction: RpgComponent,
  route: RpgRoute,
  player: RpgPlayer,
  guildId: string,
): Promise<RpgResponse> {
  const user = interaction.user;
  const action = route.action;

  if (action === "craft") {
    const level = await blacksmithLevel(player.id);
    return { kind: "update", screen: renderCraft(user, player, level, await materialCounts(player.id)) };
  }
  if (action === "weapons") {
    return { kind: "update", screen: renderWeapons(user, await listWeapons(player)) };
  }
  if (action === "weapon" && interaction.isStringSelectMenu()) {
    const weapon = await getWeapon(player, Number(interaction.values[0]));
    return weapon
      ? { kind: "update", screen: renderWeaponDetail(user, weapon, player) }
      : { kind: "update", screen: renderWeapons(user, await listWeapons(player), "Weapon not found.") };
  }

  if (action === "make" && interaction.isStringSelectMenu()) {
    const r = await craftWeapon(player, interaction.values[0]);
    const level = await blacksmithLevel(player.id);
    const counts = await materialCounts(player.id);
    const notice = r.ok ? `Forged ${r.weaponName}!` : r.reason;
    return { kind: "update", screen: renderCraft(user, player, level, counts, notice) };
  }
  if (action === "upgrade" && route.args) {
    const r = await upgradeWeapon(player, Number(route.args));
    const p2 = (await getPlayer(guildId, user.id)) ?? player;
    const weapon = await getWeapon(p2, Number(route.args));
    if (!weapon) return { kind: "update", screen: renderWeapons(user, await listWeapons(p2), r.reason) };
    return { kind: "update", screen: renderWeaponDetail(user, weapon, p2, r.ok ? "Enhanced!" : r.reason) };
  }
  if (action === "upgrademax" && route.args) {
    const r = await upgradeWeaponMax(player, Number(route.args));
    const p2 = (await getPlayer(guildId, user.id)) ?? player;
    const weapon = await getWeapon(p2, Number(route.args));
    if (!weapon) return { kind: "update", screen: renderWeapons(user, await listWeapons(p2), r.reason) };
    const notice = r.ok
      ? `Enhanced ×${r.applied} for ${r.spentGold.toLocaleString()} gold.`
      : r.reason;
    return { kind: "update", screen: renderWeaponDetail(user, weapon, p2, notice) };
  }
  if ((action === "equip" || action === "unequip") && route.args) {
    if (action === "equip") await equipWeapon(player, Number(route.args));
    else await unequipWeapon(player);
    const p2 = (await getPlayer(guildId, user.id)) ?? player;
    const weapon = await getWeapon(p2, Number(route.args));
    if (!weapon) return { kind: "update", screen: renderWeapons(user, await listWeapons(p2)) };
    return {
      kind: "update",
      screen: renderWeaponDetail(user, weapon, p2, action === "equip" ? "Equipped." : "Unequipped."),
    };
  }

  const level = await blacksmithLevel(player.id);
  const equipped = await equippedWeapon(player);
  return { kind: "update", screen: renderBlacksmith(user, player, level, equipped) };
}

/**
 * Dungeon sub-router: active, turn-based delves. Each click resolves one round (or enters/leaves a
 * run). If a run is in progress, the entry view resumes its combat board instead of the picker.
 */
async function handleDungeon(
  interaction: RpgComponent,
  route: RpgRoute,
  player: RpgPlayer,
  guildId: string,
): Promise<RpgResponse> {
  const user = interaction.user;
  const action = route.action;
  const dungeonName = (id: string) => dungeonDef(id)?.name ?? "the dungeon";
  // The actives this player can cast in the fight = the active nodes they've allocated in their tree.
  const actives = dungeonActives(player.classId, await getAllocatedNodeIds(player.id));

  // Entry / resume — a live run takes you straight back to the fight.
  if (!action || action === "list") {
    const run = await getActiveRun(player);
    return run && run.status === "active"
      ? { kind: "update", screen: renderDungeonCombat(user, run, actives) }
      : { kind: "update", screen: renderDungeonList(user, player, await countKeys(player.id)) };
  }

  if (action === "enter") {
    const id = interaction.isStringSelectMenu() ? interaction.values[0] : route.args;
    if (id) {
      const r = await enterDungeon(player, id);
      if (!r.ok) {
        return { kind: "update", screen: renderDungeonList(user, player, await countKeys(player.id), r.reason) };
      }
      void track(guildId, "rpg_dungeon_enter", { dungeonId: id });
    }
    const run = await getActiveRun(player);
    return run
      ? { kind: "update", screen: renderDungeonCombat(user, run, actives) }
      : { kind: "update", screen: renderDungeonList(user, player, await countKeys(player.id)) };
  }

  if (action === "flee") {
    const res = await fleeDungeon(player);
    if (!res) return { kind: "update", screen: renderDungeonList(user, player, await countKeys(player.id)) };
    void track(guildId, "rpg_dungeon_end", { outcome: "fled", dungeonId: res.run.dungeonId });
    return { kind: "update", screen: renderDungeonResult(user, res.summary, dungeonName(res.run.dungeonId)) };
  }

  // Combat actions → one round each.
  let act: DungeonAction | null = null;
  if (action === "attack") act = { type: "attack" };
  else if (action === "guard") act = { type: "guard" };
  else if (action === "advance") act = { type: "advance" };
  else if (action === "coat") {
    const el = interaction.isStringSelectMenu() ? interaction.values[0] : route.args;
    if (el) act = { type: "coat", element: el };
  } else if (action === "ability" && route.args) {
    act = { type: "ability", id: route.args };
  }

  // No valid action (stale click) → re-show whatever's current.
  if (!act) {
    const run = await getActiveRun(player);
    return run && run.status === "active"
      ? { kind: "update", screen: renderDungeonCombat(user, run, actives) }
      : { kind: "update", screen: renderDungeonList(user, player, await countKeys(player.id)) };
  }

  const outcome = await actInDungeon(player, act);
  if (!outcome) {
    return { kind: "update", screen: renderDungeonList(user, player, await countKeys(player.id)) };
  }
  if (outcome.kind === "result") {
    void track(guildId, "rpg_dungeon_end", {
      outcome: outcome.summary.outcome,
      dungeonId: outcome.run.dungeonId,
      room: outcome.run.roomIndex + 1,
    });
    return { kind: "update", screen: renderDungeonResult(user, outcome.summary, dungeonName(outcome.run.dungeonId)) };
  }
  return { kind: "update", screen: renderDungeonCombat(user, outcome.run, actives) };
}
