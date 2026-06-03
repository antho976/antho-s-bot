import { MessageFlags, type ButtonInteraction, type StringSelectMenuInteraction } from "discord.js";
import { track } from "@/server/core/analytics";
import { DEFAULT_CLASS } from "./config";
import { parseId } from "./domain/custom-id";
import { createPlayer, getPlayer } from "./queries";
import { withRegen } from "./service";
import { renderHub } from "./views/hub";
import { renderPlaceholder, renderWelcome } from "./views/scaffold";

type RpgComponent = ButtonInteraction | StringSelectMenuInteraction;

/**
 * The hub/spoke core: parse the route from the custom_id, enforce the owner check, then update
 * the same message in place. Navigation is stateless (route lives in the custom_id); game state
 * is read fresh from the DB — so a restart never corrupts an open board (planning/11).
 */
export async function handleRpgComponent(interaction: RpgComponent): Promise<void> {
  const route = parseId(interaction.customId);
  if (!route || !interaction.inGuild()) return;

  // Owner check — the board is public, but only its owner may drive it.
  if (interaction.user.id !== route.ownerId) {
    await interaction.reply({
      content: `That's <@${route.ownerId}>'s adventure — run \`/rpg\` to start your own.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId;

  // Character creation: the welcome screen's Start button.
  if (route.view === "create") {
    const existing = await getPlayer(guildId, interaction.user.id);
    const player = existing ?? (await createPlayer(guildId, interaction.user.id, DEFAULT_CLASS));
    if (!existing) await track(guildId, "rpg_character_created", { classId: DEFAULT_CLASS });
    await interaction.update(renderHub(player, interaction.user));
    return;
  }

  const player = await getPlayer(guildId, interaction.user.id);
  if (!player) {
    await interaction.update(renderWelcome(interaction.user));
    return;
  }
  const fresh = await withRegen(player);

  switch (route.view) {
    case "hub":
      await interaction.update(renderHub(fresh, interaction.user));
      return;
    case "combat":
    case "inventory":
    case "guild":
    case "shop":
    case "quests":
    case "options":
      await interaction.update(renderPlaceholder(route.ownerId, route.view, interaction.user));
      return;
    default:
      await interaction.update(renderHub(fresh, interaction.user));
  }
}
