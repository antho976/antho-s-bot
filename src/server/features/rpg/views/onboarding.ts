import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type User } from "discord.js";
import { CLASSES, INTRO_LORE, RPG } from "../config";
import { buildId } from "../domain/custom-id";
import type { RpgScreen } from "./types";

const CLASS_STYLE: Record<string, ButtonStyle> = {
  warrior: ButtonStyle.Danger,
  mage: ButtonStyle.Primary,
  archer: ButtonStyle.Success,
};

/** First screen a new player sees: the world's lore + a button into class selection. */
export function renderIntro(user: User): RpgScreen {
  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("⚔️  A Saga Begins")
    .setDescription(`${INTRO_LORE}\n\nChoose the path you'll walk.`);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildId(user.id, "classes"))
      .setLabel("Begin your journey")
      .setEmoji("✨")
      .setStyle(ButtonStyle.Success),
  );

  return { embeds: [embed], components: [row] };
}

/** Class selection: each starter class with its lore + stats, one button to pick it. */
export function renderClassSelect(user: User): RpgScreen {
  const classes = Object.values(CLASSES);

  const embed = new EmbedBuilder()
    .setColor(RPG.embedColor)
    .setTitle("🌿  Choose your class")
    .setDescription(
      classes
        .map((c) => `${c.emoji} **${c.name}**  ·  HP ${c.baseHp} · ATK ${c.atkBase}\n${c.blurb}`)
        .join("\n\n"),
    )
    .setFooter({ text: "More paths branch from these later." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...classes.map((c) =>
      new ButtonBuilder()
        .setCustomId(buildId(user.id, "create", c.id))
        .setLabel(c.name)
        .setEmoji(c.emoji)
        .setStyle(CLASS_STYLE[c.id] ?? ButtonStyle.Primary),
    ),
  );

  return { embeds: [embed], components: [row] };
}
