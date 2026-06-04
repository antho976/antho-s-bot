import type {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

/** What every view renders. Both `interaction.reply()` and `interaction.update()` accept this. */
export type RpgScreen = {
  embeds: EmbedBuilder[];
  components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[];
  files?: AttachmentBuilder[]; // e.g. the skill-tree canvas image
};
