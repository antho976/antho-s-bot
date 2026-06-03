import {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ThreadAutoArchiveDuration,
  type ChatInputCommandInteraction,
} from "discord.js";
import { track } from "@/server/core/analytics";
import { logger } from "@/server/core/logger";
import { classify, PRIORITY_COLOR } from "./domain/classify";
import {
  closeTicket,
  createTicket,
  getConfig,
  getTicketByThread,
  nextTicketNumber,
} from "./queries";

async function ephemeral(interaction: ChatInputCommandInteraction, content: string) {
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export async function openTicket(
  interaction: ChatInputCommandInteraction,
  subject: string,
): Promise<void> {
  if (!interaction.inGuild()) return ephemeral(interaction, "Use this in a server.");

  const guildId = interaction.guildId;
  const config = await getConfig(guildId);
  if (!config.enabled) return ephemeral(interaction, "Support tickets are not enabled.");

  const targetChannelId = config.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(targetChannelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return ephemeral(interaction, "The support channel isn't a usable text channel.");
  }

  const { priority, category } = classify(subject);
  const number = await nextTicketNumber(guildId);

  let threadId: string;
  try {
    const thread = await channel.threads.create({
      name: `ticket-${number}-${interaction.user.username}`.slice(0, 90),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      type: ChannelType.PrivateThread,
      reason: `Support ticket #${number}`,
    });
    threadId = thread.id;
    await thread.members.add(interaction.user.id).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(PRIORITY_COLOR[priority])
      .setTitle(`Ticket #${number} · ${category}`)
      .setDescription(subject)
      .addFields(
        { name: "Priority", value: priority, inline: true },
        { name: "Opened by", value: `<@${interaction.user.id}>`, inline: true },
      )
      .setTimestamp(new Date());
    const staffPing = config.staffRoleId ? `<@&${config.staffRoleId}> ` : "";
    await thread.send({
      content: `${staffPing}New ticket from <@${interaction.user.id}>`,
      embeds: [embed],
      allowedMentions: {
        roles: config.staffRoleId ? [config.staffRoleId] : [],
        users: [interaction.user.id],
      },
    });
  } catch (err) {
    logger.error("support", "Failed to create ticket thread", err);
    return ephemeral(interaction, "Couldn't create the ticket thread — check my permissions.");
  }

  await createTicket({
    guildId,
    number,
    userId: interaction.user.id,
    subject,
    category,
    priority,
    threadId,
  });
  await track(guildId, "support.open", { priority, category });
  await ephemeral(interaction, `🎫 Ticket created: <#${threadId}>`);
}

export async function closeTicketCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inGuild()) return;

  const ticket = await getTicketByThread(interaction.channelId);
  if (!ticket) return ephemeral(interaction, "Run this inside a ticket thread.");
  if (ticket.status === "closed") return ephemeral(interaction, "This ticket is already closed.");

  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers);
  if (ticket.userId !== interaction.user.id && !isStaff) {
    return ephemeral(interaction, "Only the opener or staff can close this ticket.");
  }

  await closeTicket(ticket.id, interaction.user.id);
  await track(interaction.guildId, "support.close", { priority: ticket.priority });
  await interaction.reply({ content: `🔒 Ticket #${ticket.number} closed.` });

  const channel = interaction.channel;
  if (channel?.isThread()) {
    await channel.setLocked(true).catch(() => {});
    await channel.setArchived(true).catch(() => {});
  }
}
