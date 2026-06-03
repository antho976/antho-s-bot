import { EmbedBuilder } from "discord.js";
import { track } from "@/server/core/analytics";
import { sendToChannel } from "@/server/integrations/discord/send";
import { getConfig, recordEvent, type MemberLogConfig } from "./queries";

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

export interface LogInput {
  type: string;
  title: string;
  summary: string;
  description?: string;
  userId?: string;
  fields?: { name: string; value: string }[];
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
  if (input.description) embed.setDescription(input.description.slice(0, 4000));
  if (input.fields?.length) {
    embed.addFields(
      input.fields.map((f) => ({ name: f.name, value: f.value.slice(0, 1024) || "—" })),
    );
  }
  if (input.userId) embed.setFooter({ text: `ID: ${input.userId}` });

  await sendToChannel(config.channelId, { embeds: [embed] });
  await track(guildId, `memberlog.${input.type}`, { userId: input.userId });
}
