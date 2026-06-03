import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

/** Applies any pending migrations from /drizzle on boot. */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
