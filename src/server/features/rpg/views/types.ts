import type {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from "discord.js";

/** What every view renders. Both `interaction.reply()` and `interaction.update()` accept this. */
export type RpgScreen = {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
  files?: AttachmentBuilder[]; // e.g. the transparent spacer that sets the card width
};
