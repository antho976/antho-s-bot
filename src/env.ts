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

  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
