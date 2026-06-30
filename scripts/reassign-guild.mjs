// One-time data migration: move every guild-scoped row from one guild id to another.
//
// When the bot ran single-guild, rows were written under whatever DISCORD_GUILD_ID was set to —
// or under the literal "default" bucket if it was never set. Going multi-guild, the primary
// guild's existing data must live under that guild's REAL id. Run this once if your data is under
// "default" (or the wrong id) before adding the second guild.
//
// Usage:
//   node scripts/reassign-guild.mjs <fromGuildId> <toGuildId>
//   node scripts/reassign-guild.mjs default 123456789012345678
//
// It auto-discovers every table with a `guild_id` column, so it stays correct as features grow.
// Make a backup first (copy the .db file, or use the dashboard export).

import "dotenv/config";
import { createClient } from "@libsql/client";

const [from, to] = process.argv.slice(2);
if (!from || !to) {
  console.error("Usage: node scripts/reassign-guild.mjs <fromGuildId> <toGuildId>");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "file:./data/bot.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const client = createClient(authToken ? { url, authToken } : { url });

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
);

let total = 0;
for (const row of tables.rows) {
  const table = String(row.name);
  const info = await client.execute(`PRAGMA table_info("${table}")`);
  const hasGuild = info.rows.some((c) => c.name === "guild_id");
  if (!hasGuild) continue;

  const res = await client.execute({
    sql: `UPDATE "${table}" SET guild_id = ? WHERE guild_id = ?`,
    args: [to, from],
  });
  if (res.rowsAffected > 0) {
    console.log(`  ${table}: ${res.rowsAffected} row(s)`);
    total += res.rowsAffected;
  }
}

console.log(`Done — moved ${total} row(s) from "${from}" to "${to}".`);
await client.close();
