import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/** A slash command. `data` builds the registration payload; `execute` handles the interaction. */
export interface BotCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  /**
   * Feature key for per-guild gating. When set, the command is only registered to (and only runs
   * in) guilds where this feature is enabled — see `server/core/guilds` `isFeatureEnabled`.
   * Omit for always-on commands.
   */
  feature?: string;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
