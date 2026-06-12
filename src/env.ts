import { z } from "zod";

/**
 * Typed, validated environment access. Server-only — never import from a client component.
 * Most fields are optional so `next build` succeeds before secrets are filled in; the code
 * that needs a given secret checks for it at the point of use (e.g. the bot won't start
 * without DISCORD_TOKEN).
 */
const schema = z.object({
  DATABASE_URL: z.string().default("file:./data/bot.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  DISCORD_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),

  AUTH_SECRET: z.string().optional(),
  PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),

  // Notification providers — optional; filled in when wiring real Twitch/YouTube (Phase 1 creds).
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),
  TWITCH_EVENTSUB_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),

  // Smart-reply (AI chat) — OpenRouter key. Optional; the feature stays off until it's set.
  OPENROUTER_API_KEY: z.string().optional(),
  // Image generation (Pollinations) needs no key; an optional token unlocks higher rate limits.
  POLLINATIONS_TOKEN: z.string().optional(),

  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(14),

  // Dev tooling — set "true" ONLY on the local test bot. Unlocks RPG cheat buttons and removes
  // the adventure cooldown. Never set this on production.
  DEV_TOOLS: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = typeof env;

/** True only on the dev/test bot (DEV_TOOLS=true in its .env). Gates dev-only features off prod. */
export const DEV_TOOLS = env.DEV_TOOLS === "true";
