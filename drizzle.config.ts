import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// libsql/Turso dialect: works with a local `file:` URL now and a remote Turso URL later
// with no code change (see planning/02-hosting-cost.md, planning/07 seam 12).
export default defineConfig({
  dialect: "turso",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/bot.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
