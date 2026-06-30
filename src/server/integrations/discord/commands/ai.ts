import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "./types";
import { ensureAdmin, reply } from "./guard";
import { hasOpenRouterKey } from "@/server/integrations/openrouter/client";
import {
  addMemory,
  getConfig,
  listMemory,
  parseChannels,
  removeMemory,
  saveConfig,
  type SmartReplyConfigPatch,
} from "@/server/features/smart-reply/queries";

export const ai: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Configure the AI chat bot (persona, memory, reply behaviour)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("status").setDescription("Show the current AI settings"))
    .addSubcommand((s) =>
      s
        .setName("toggle")
        .setDescription("Turn AI replies on or off")
        .addBooleanOption((o) =>
          o.setName("enabled").setDescription("On or off").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("persona")
        .setDescription("Set who the bot is")
        .addStringOption((o) =>
          o
            .setName("name")
            .setDescription("The bot's name / character")
            .setRequired(true)
            .setMaxLength(80),
        )
        .addStringOption((o) =>
          o
            .setName("about")
            .setDescription("Personality & how it should act")
            .setRequired(true)
            .setMaxLength(1500),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("settings")
        .setDescription("Tune reply behaviour (all optional)")
        .addIntegerOption((o) =>
          o
            .setName("chance")
            .setDescription("% chance to reply to a normal message (0-100)")
            .setMinValue(0)
            .setMaxValue(100),
        )
        .addIntegerOption((o) =>
          o
            .setName("cooldown")
            .setDescription("Seconds between random replies in a channel")
            .setMinValue(0)
            .setMaxValue(3600),
        )
        .addIntegerOption((o) =>
          o
            .setName("context")
            .setDescription("How many recent messages to read (1-50)")
            .setMinValue(1)
            .setMaxValue(50),
        )
        .addIntegerOption((o) =>
          o
            .setName("maxchars")
            .setDescription("Max reply length in characters")
            .setMinValue(50)
            .setMaxValue(2000),
        )
        .addIntegerOption((o) =>
          o
            .setName("minlength")
            .setDescription("Ignore messages shorter than this (filter)")
            .setMinValue(0)
            .setMaxValue(100),
        )
        .addIntegerOption((o) =>
          o
            .setName("dailycap")
            .setDescription("Max replies per day (0 = unlimited)")
            .setMinValue(0)
            .setMaxValue(100000),
        )
        .addStringOption((o) =>
          o
            .setName("model")
            .setDescription("OpenRouter model id (e.g. meta-llama/llama-3.3-70b-instruct:free)")
            .setMaxLength(120),
        )
        .addBooleanOption((o) =>
          o.setName("replyonmention").setDescription("Always reply when @mentioned"),
        )
        .addBooleanOption((o) =>
          o.setName("ignorebots").setDescription("Ignore other bots' messages"),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("channels")
        .setDescription("Limit which channels the AI talks in")
        .addStringOption((o) =>
          o
            .setName("action")
            .setDescription("What to do")
            .setRequired(true)
            .addChoices(
              { name: "add", value: "add" },
              { name: "remove", value: "remove" },
              { name: "clear (allow all channels)", value: "clear" },
            ),
        )
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel to add/remove")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("math")
        .setDescription("Let the AI render math equations as images when asked (free)")
        .addBooleanOption((o) =>
          o.setName("enabled").setDescription("Turn math rendering on or off"),
        )
        .addIntegerOption((o) =>
          o
            .setName("dailycap")
            .setDescription("Max rendered equations per day (0 = unlimited)")
            .setMinValue(0)
            .setMaxValue(10000),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("memory")
        .setDescription("Facts the bot remembers")
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Add a memory")
            .addStringOption((o) =>
              o
                .setName("text")
                .setDescription("Something the bot should know / remember")
                .setRequired(true)
                .setMaxLength(500),
            ),
        )
        .addSubcommand((s) => s.setName("list").setDescription("List memories"))
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Delete a memory by id")
            .addIntegerOption((o) =>
              o
                .setName("id")
                .setDescription("Memory id from /ai memory list")
                .setRequired(true),
            ),
        ),
    ),
  feature: "ai",
  execute: async (interaction) => {
    const guildId = await ensureAdmin(interaction);
    if (!guildId) return;

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // ---- memory group ----
    if (group === "memory") {
      if (sub === "add") {
        const text = interaction.options.getString("text", true);
        const m = await addMemory(guildId, text);
        await reply(interaction, `🧠 Added memory **#${m.id}**.`);
        return;
      }
      if (sub === "list") {
        const rows = await listMemory(guildId);
        if (rows.length === 0) {
          await reply(interaction, "No memories yet. Add one with `/ai memory add`.");
          return;
        }
        const body = rows.map((r) => `**#${r.id}** — ${r.content}`).join("\n").slice(0, 1900);
        await reply(interaction, `🧠 **Memories**\n${body}`);
        return;
      }
      if (sub === "remove") {
        const id = interaction.options.getInteger("id", true);
        const ok = await removeMemory(guildId, id);
        await reply(interaction, ok ? `🗑️ Removed memory **#${id}**.` : `No memory **#${id}** found.`);
        return;
      }
    }

    // ---- top-level subcommands ----
    if (sub === "status") {
      const c = await getConfig(guildId);
      const mem = await listMemory(guildId);
      const channels = parseChannels(c.allowedChannelsJson);
      const keyNote = hasOpenRouterKey()
        ? ""
        : "\n⚠️ `OPENROUTER_API_KEY` isn't set — replies stay off until it is.";
      await reply(
        interaction,
        [
          `**AI chat — ${c.enabled ? "🟢 on" : "🔴 off"}**`,
          `• Name: **${c.botName}**`,
          `• Model: \`${c.model}\``,
          `• Reply chance: **${c.replyChance}%** · cooldown **${c.cooldownSeconds}s**`,
          `• Context: **${c.contextMessages}** msgs · max reply **${c.maxReplyChars}** chars`,
          `• Filter: ignore < **${c.minMessageLength}** chars · daily cap **${c.dailyCap === 0 ? "∞" : c.dailyCap}**`,
          `• Reply on @mention: **${c.replyOnMention ? "yes" : "no"}** · ignore bots: **${c.ignoreBots ? "yes" : "no"}**`,
          `• Math images: **${c.imagesEnabled ? "🟢 on" : "🔴 off"}** · daily cap **${c.imageDailyCap === 0 ? "∞" : c.imageDailyCap}**`,
          `• Channels: ${channels.length ? channels.map((id) => `<#${id}>`).join(", ") : "all"}`,
          `• Memories: **${mem.length}**`,
          c.persona ? `• Persona: ${c.persona.slice(0, 300)}` : "• Persona: _(none set)_",
        ].join("\n") + keyNote,
      );
      return;
    }

    if (sub === "toggle") {
      const enabled = interaction.options.getBoolean("enabled", true);
      await saveConfig(guildId, { enabled });
      const note =
        enabled && !hasOpenRouterKey()
          ? " — but set `OPENROUTER_API_KEY` first, replies stay off until you do."
          : "";
      await reply(interaction, `AI replies **${enabled ? "enabled" : "disabled"}**.${note}`);
      return;
    }

    if (sub === "persona") {
      const name = interaction.options.getString("name", true);
      const about = interaction.options.getString("about", true);
      await saveConfig(guildId, { botName: name, persona: about });
      await reply(interaction, `🎭 Persona set — the bot is now **${name}**.`);
      return;
    }

    if (sub === "settings") {
      const patch: SmartReplyConfigPatch = {};
      const chance = interaction.options.getInteger("chance");
      if (chance !== null) patch.replyChance = chance;
      const cooldown = interaction.options.getInteger("cooldown");
      if (cooldown !== null) patch.cooldownSeconds = cooldown;
      const context = interaction.options.getInteger("context");
      if (context !== null) patch.contextMessages = context;
      const maxchars = interaction.options.getInteger("maxchars");
      if (maxchars !== null) patch.maxReplyChars = maxchars;
      const minlength = interaction.options.getInteger("minlength");
      if (minlength !== null) patch.minMessageLength = minlength;
      const dailycap = interaction.options.getInteger("dailycap");
      if (dailycap !== null) patch.dailyCap = dailycap;
      const model = interaction.options.getString("model");
      if (model) patch.model = model;
      const rom = interaction.options.getBoolean("replyonmention");
      if (rom !== null) patch.replyOnMention = rom;
      const ib = interaction.options.getBoolean("ignorebots");
      if (ib !== null) patch.ignoreBots = ib;

      if (Object.keys(patch).length === 0) {
        await reply(interaction, "Nothing to change — pass at least one option.");
        return;
      }
      await saveConfig(guildId, patch);
      await reply(interaction, `✅ Updated: ${Object.keys(patch).join(", ")}.`);
      return;
    }

    if (sub === "channels") {
      const action = interaction.options.getString("action", true);
      if (action === "clear") {
        await saveConfig(guildId, { allowedChannelsJson: null });
        await reply(interaction, "🗨️ AI can now talk in **all** channels.");
        return;
      }
      const channel = interaction.options.getChannel("channel");
      if (!channel) {
        await reply(interaction, "Pick a channel for add/remove.");
        return;
      }
      const current = parseChannels((await getConfig(guildId)).allowedChannelsJson);
      let next = current;
      if (action === "add") {
        if (!current.includes(channel.id)) next = [...current, channel.id];
      } else if (action === "remove") {
        next = current.filter((id) => id !== channel.id);
      }
      await saveConfig(guildId, {
        allowedChannelsJson: next.length ? JSON.stringify(next) : null,
      });
      await reply(
        interaction,
        `🗨️ Allowed channels: ${next.length ? next.map((id) => `<#${id}>`).join(", ") : "all"}.`,
      );
      return;
    }

    if (sub === "math") {
      const patch: SmartReplyConfigPatch = {};
      const enabled = interaction.options.getBoolean("enabled");
      if (enabled !== null) patch.imagesEnabled = enabled;
      const dailycap = interaction.options.getInteger("dailycap");
      if (dailycap !== null) patch.imageDailyCap = dailycap;

      if (Object.keys(patch).length === 0) {
        await reply(interaction, "Nothing to change — pass `enabled` and/or `dailycap`.");
        return;
      }
      const c = await saveConfig(guildId, patch);
      const note =
        c.imagesEnabled && !c.enabled
          ? " — note: AI replies are off, so turn those on too (`/ai toggle`)."
          : "";
      await reply(
        interaction,
        `🧮 Math rendering **${c.imagesEnabled ? "on" : "off"}** · daily cap **${c.imageDailyCap === 0 ? "∞" : c.imageDailyCap}**.${note}`,
      );
      return;
    }
  },
};
