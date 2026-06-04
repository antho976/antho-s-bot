import { EmbedBuilder, type Guild } from "discord.js";
import { track } from "@/server/core/analytics";
import { logger } from "@/server/core/logger";
import { sendToChannel } from "@/server/integrations/discord/send";
import {
  getConfig,
  recordEvent,
  seedRoleSnapshots,
  type MemberLogConfig,
} from "./queries";

type ToggleKey = keyof MemberLogConfig;

const TYPE_TOGGLE: Record<string, ToggleKey> = {
  join: "logJoins",
  leave: "logLeaves",
  ban: "logBans",
  unban: "logUnbans",
  nickname: "logNicknames",
  roles: "logRoles",
  msg_edit: "logMessageEdits",
  msg_delete: "logMessageDeletes",
  voice: "logVoice",
};

const TYPE_COLOR: Record<string, number> = {
  join: 0x22c55e,
  leave: 0xf59e0b,
  ban: 0xef4444,
  unban: 0x3b82f6,
  nickname: 0xa855f7,
  roles: 0xa855f7,
  msg_edit: 0xeab308,
  msg_delete: 0xef4444,
  voice: 0x64748b,
};

export interface LogField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface LogInput {
  type: string;
  title: string;
  summary: string;
  description?: string;
  userId?: string;
  url?: string; // clickable title (e.g. a jump-to-message link)
  author?: { name: string; iconURL?: string }; // avatar + name header
  thumbnail?: string;
  fields?: LogField[];
}

/** Check the relevant toggle, record the event, and post an embed to the log channel. */
export async function logEvent(guildId: string, input: LogInput): Promise<void> {
  const config = await getConfig(guildId);
  if (!config.enabled || !config.channelId) return;

  const toggle = TYPE_TOGGLE[input.type];
  if (toggle && config[toggle] === false) return;

  await recordEvent(guildId, input.type, input.userId ?? null, input.summary, input.fields);

  const embed = new EmbedBuilder()
    .setColor(TYPE_COLOR[input.type] ?? 0x64748b)
    .setTitle(input.title)
    .setTimestamp(new Date());
  if (input.url) embed.setURL(input.url);
  if (input.author) embed.setAuthor(input.author);
  if (input.thumbnail) embed.setThumbnail(input.thumbnail);
  if (input.description) embed.setDescription(input.description.slice(0, 4000));
  if (input.fields?.length) {
    embed.addFields(
      input.fields.map((f) => ({
        name: f.name,
        value: f.value.slice(0, 1024) || "—",
        inline: f.inline ?? false,
      })),
    );
  }
  if (input.userId) embed.setFooter({ text: `ID: ${input.userId}` });

  await sendToChannel(config.channelId, { embeds: [embed] });
  await track(guildId, `memberlog.${input.type}`, { userId: input.userId });
}

/**
 * Snapshot every member's current roles so roles-updated logs can diff against real prior state.
 * One gateway member fetch per guild (no per-member REST calls); runs on startup and is cheap to
 * repeat. Best-effort — never throws into the boot sequence.
 */
export async function seedGuildRoleSnapshots(guild: Guild): Promise<void> {
  try {
    const members = await guild.members.fetch();
    const entries = members.map((m) => ({
      userId: m.id,
      roleIds: [...m.roles.cache.keys()].filter((id) => id !== guild.id),
    }));
    await seedRoleSnapshots(guild.id, entries);
    logger.info(
      "member-logs",
      `Seeded role snapshots for ${entries.length} member(s) in ${guild.name}.`,
    );
  } catch (err) {
    logger.warn("member-logs", `Could not seed role snapshots for guild ${guild.id}`, err);
  }
}
