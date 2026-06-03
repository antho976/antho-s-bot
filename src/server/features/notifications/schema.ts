import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Notification engine tables. Identity + alert settings are merged into one row per watched
// channel (a 1:1 relationship; planning/03 sketched them separate — merged here for a simpler
// single-guild UI). `platform` is the discriminator so new platforms are rows, not new code.
const now = () => new Date();
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

export const streamChannels = sqliteTable(
  "stream_channels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    platform: text("platform").notNull(), // 'twitch' | 'youtube'
    channelRef: text("channel_ref").notNull(), // twitch login / youtube channel id
    displayName: text("display_name"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),

    // alert settings
    discordChannelId: text("discord_channel_id"),
    messageTemplate: text("message_template"),
    useEmbed: integer("use_embed", { mode: "boolean" }).notNull().default(true),
    pingRoleId: text("ping_role_id"),
    alertOnLive: integer("alert_on_live", { mode: "boolean" }).notNull().default(true),
    alertOnEnd: integer("alert_on_end", { mode: "boolean" }).notNull().default(false),
    alertOnUpload: integer("alert_on_upload", { mode: "boolean" }).notNull().default(true),

    createdAt: ts("created_at").$defaultFn(now),
    updatedAt: ts("updated_at").$defaultFn(now),
  },
  (t) => [uniqueIndex("stream_channels_unique").on(t.guildId, t.platform, t.channelRef)],
);

/** Current live/seen state per channel (one row per stream channel). */
export const streamState = sqliteTable("stream_state", {
  channelId: integer("channel_id").primaryKey(),
  isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
  lastLiveAt: ts("last_live_at"),
  lastEndedAt: ts("last_ended_at"),
  lastVideoId: text("last_video_id"),
  currentTitle: text("current_title"),
  currentGame: text("current_game"),
  updatedAt: ts("updated_at").$defaultFn(now),
});

/** History of fired events (live/end/upload) — also powers analytics + debugging. */
export const streamEvents = sqliteTable(
  "stream_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    channelId: integer("channel_id").notNull(),
    type: text("type").notNull(), // 'live' | 'end' | 'upload'
    payloadJson: text("payload_json"),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [
    index("stream_events_channel").on(t.channelId),
    index("stream_events_created").on(t.createdAt),
  ],
);

/** Ad-hoc upcoming streams → drive 1h / 10min reminders (sent flags prevent double-firing). */
export const streamSchedule = sqliteTable(
  "stream_schedule",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    guildId: text("guild_id").notNull(),
    channelId: integer("channel_id"), // optional link to a stream channel
    title: text("title"),
    startsAt: ts("starts_at").notNull(),
    remind1h: integer("remind_1h", { mode: "boolean" }).notNull().default(true),
    remind10m: integer("remind_10m", { mode: "boolean" }).notNull().default(true),
    remind1hSent: integer("remind_1h_sent", { mode: "boolean" }).notNull().default(false),
    remind10mSent: integer("remind_10m_sent", { mode: "boolean" }).notNull().default(false),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: ts("created_at").$defaultFn(now),
  },
  (t) => [index("stream_schedule_starts").on(t.startsAt)],
);
