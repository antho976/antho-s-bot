import type { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import { track } from "@/server/core/analytics";
import { DEFAULT_CLASS } from "./config";
import { parseId } from "./domain/custom-id";
import { createPlayer, getPlayer } from "./queries";
import { runAdventure, withRegen } from "./service";
import { renderAdventureResult, renderCombat } from "./views/combat";
import { renderHub } from "./views/hub";
import { renderPlaceholder, renderWelcome } from "./views/scaffold";
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

  // Character creation: the welcome screen's Start button.
  if (route.view === "create") {
    const existing = await getPlayer(guildId, interaction.user.id);
    const player = existing ?? (await createPlayer(guildId, interaction.user.id, DEFAULT_CLASS));
    if (!existing) await track(guildId, "rpg_character_created", { classId: DEFAULT_CLASS });
    return { kind: "update", screen: renderHub(player, interaction.user) };
  }

  const player = await getPlayer(guildId, interaction.user.id);
  if (!player) return { kind: "update", screen: renderWelcome(interaction.user) };
  const fresh = await withRegen(player);

  switch (route.view) {
    case "hub":
      return { kind: "update", screen: renderHub(fresh, interaction.user) };
    case "combat": {
      if (route.action === "go") {
        const outcome = await runAdventure(fresh);
        if (!outcome.ok) {
          return { kind: "update", screen: renderCombat(fresh, interaction.user, Date.now()) };
        }
        await track(guildId, "rpg_adventure", {
          level: outcome.player.level,
          gotKey: outcome.rewards.keys > 0,
          leveled: outcome.leveledTo != null,
        });
        return {
          kind: "update",
          screen: renderAdventureResult(
            outcome.player,
            interaction.user,
            outcome.mob,
            outcome.rewards,
            outcome.leveledTo,
          ),
        };
      }
      return { kind: "update", screen: renderCombat(fresh, interaction.user, Date.now()) };
    }
    case "inventory":
    case "guild":
    case "shop":
    case "quests":
    case "options":
      return {
        kind: "update",
        screen: renderPlaceholder(route.ownerId, route.view, interaction.user),
      };
    default:
      return { kind: "update", screen: renderHub(fresh, interaction.user) };
  }
}
