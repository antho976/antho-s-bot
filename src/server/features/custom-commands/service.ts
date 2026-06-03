import { EmbedBuilder, type Message, type MessageCreateOptions } from "discord.js";
import { track } from "@/server/core/analytics";
import { getByName, incrementUses, type CustomCommand } from "./queries";

const PREFIX = "!";

// Per-user-per-command cooldown (in-memory; resets on restart — fine for this).
const cooldowns = new Map<string, number>();

function parseList(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function buildPayload(cmd: CustomCommand): MessageCreateOptions {
  if (cmd.embed) {
    const embed = new EmbedBuilder().setColor(0x6366f1);
    if (cmd.responseText) embed.setDescription(cmd.responseText);
    if (cmd.imageUrl) embed.setImage(cmd.imageUrl);
    return { embeds: [embed] };
  }
  const content = [cmd.responseText, cmd.imageUrl].filter(Boolean).join("\n");
  return { content: content || "​" };
}

/** Resolve and run a `!name` custom command from a message. */
export async function handleCustomCommand(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const name = message.content.slice(PREFIX.length).split(/\s+/)[0]?.toLowerCase();
  if (!name) return;

  const cmd = await getByName(message.guildId, name);
  if (!cmd) return;

  // Channel / role gates.
  const channels = parseList(cmd.allowedChannels);
  if (channels.length && !channels.includes(message.channelId)) return;
  const roles = parseList(cmd.allowedRoles);
  if (roles.length) {
    const member = message.member;
    if (!member || !roles.some((r) => member.roles.cache.has(r))) return;
  }

  // Usage cap.
  if (cmd.maxUses > 0 && cmd.usesCount >= cmd.maxUses) return;

  // Cooldown.
  if (cmd.cooldownSec > 0) {
    const k = `${cmd.id}:${message.author.id}`;
    const nowMs = Date.now();
    if (nowMs < (cooldowns.get(k) ?? 0)) return;
    cooldowns.set(k, nowMs + cmd.cooldownSec * 1000);
  }

  const sent = await message.channel.send(buildPayload(cmd)).catch(() => null);
  await incrementUses(cmd.id);
  await track(message.guildId, "customcmd.use", { name });

  if (sent && cmd.autoDeleteSec > 0) {
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, cmd.autoDeleteSec * 1000);
  }
}
