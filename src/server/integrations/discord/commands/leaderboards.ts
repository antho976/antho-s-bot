import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureGuild } from "./guard";
import {
  leaderboard,
  topByMessages,
  topByVoice,
} from "@/server/features/leveling/queries";

const DAY_MS = 86_400_000;

function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function board<T>(rows: T[], line: (r: T, i: number) => string): string {
  return rows.length ? rows.map(line).join("\n") : "_No data yet._";
}

export const leaderboards: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboards")
    .setDescription("Server leaderboards: XP, voice, messages and time in the server"),
  execute: async (interaction) => {
    const guildId = await ensureGuild(interaction);
    if (!guildId) return;

    const [xpRows, voiceRows, msgRows] = await Promise.all([
      leaderboard(guildId, 10),
      topByVoice(guildId, 10),
      topByMessages(guildId, 10),
    ]);

    // Oldest members (most time in the server) from the gateway cache — no extra API calls.
    const now = Date.now();
    const oldest = interaction.guild
      ? [...interaction.guild.members.cache.values()]
          .filter((m) => !m.user.bot && m.joinedTimestamp)
          .sort((a, b) => a.joinedTimestamp! - b.joinedTimestamp!)
          .slice(0, 10)
      : [];

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 ${interaction.guild?.name ?? "Server"} leaderboards`)
      .addFields(
        {
          name: "⭐ XP",
          value: board(
            xpRows,
            (r, i) => `**${i + 1}.** <@${r.userId}> — level ${r.level} · ${r.xp.toLocaleString()} XP`,
          ),
        },
        {
          name: "🎙️ Voice time",
          value: board(voiceRows, (r, i) => `**${i + 1}.** <@${r.userId}> — ${fmtMinutes(r.voiceMinutes)}`),
        },
        {
          name: "💬 Messages",
          value: board(
            msgRows,
            (r, i) => `**${i + 1}.** <@${r.userId}> — ${r.messages.toLocaleString()} messages`,
          ),
        },
        {
          name: "📅 Time in server",
          value: board(
            oldest,
            (m, i) => `**${i + 1}.** <@${m.id}> — ${Math.floor((now - m.joinedTimestamp!) / DAY_MS)} days`,
          ),
        },
      );

    // Render @mentions as names without pinging anyone.
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
