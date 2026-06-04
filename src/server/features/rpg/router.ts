import type { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { track } from "@/server/core/analytics";
import { CLASSES, DEFAULT_CLASS, DIFFICULTY_MAP } from "./config";
import { parseId } from "./domain/custom-id";
import { createPlayer, deletePlayer, getPlayer } from "./queries";
import { runAdventure, withRegen } from "./service";
import { renderAdventureResult, renderCombat } from "./views/combat";
import { renderHub } from "./views/hub";
import { renderIntro, renderClassSelect } from "./views/onboarding";
import { renderDeleteConfirm, renderOptions } from "./views/options";
import { renderPlaceholder } from "./views/scaffold";
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
    case "options": {
      if (route.action === "delete") {
        return { kind: "update", screen: renderDeleteConfirm(interaction.user) };
      }
      if (route.action === "confirm") {
        await deletePlayer(fresh.id);
        void track(guildId, "rpg_character_deleted", {});
        return { kind: "update", screen: renderIntro(interaction.user) };
      }
      return { kind: "update", screen: renderOptions(interaction.user) };
    }
    case "inventory":
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
