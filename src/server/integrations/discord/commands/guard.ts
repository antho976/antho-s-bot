import {
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";

/** Reply "only you can see this" — the default for confirmations and admin output. */
export function reply(interaction: ChatInputCommandInteraction, content: string) {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

/** Our bar for "admin" commands: the Manage Server permission. */
export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

/**
 * Gate a public command to in-guild use. Returns the guildId, or null after replying with the
 * reason (the caller should just `return`).
 */
export async function ensureGuild(
  interaction: ChatInputCommandInteraction,
): Promise<string | null> {
  if (!interaction.inGuild()) {
    await reply(interaction, "Use this in a server.");
    return null;
  }
  return interaction.guildId;
}

/** Gate an admin command: in a guild AND has Manage Server. Same null-on-reject contract. */
export async function ensureAdmin(
  interaction: ChatInputCommandInteraction,
): Promise<string | null> {
  if (!interaction.inGuild()) {
    await reply(interaction, "Use this in a server.");
    return null;
  }
  if (!isAdmin(interaction)) {
    await reply(interaction, "You need the **Manage Server** permission to use this.");
    return null;
  }
  return interaction.guildId;
}

/** Clip a string to `n` chars with an ellipsis — for list rows that must fit an embed. */
export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
