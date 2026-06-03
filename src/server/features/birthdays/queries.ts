import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { birthdayConfig, birthdays } from "@/server/db/schema";

export type BirthdayConfig = typeof birthdayConfig.$inferSelect;
export type Birthday = typeof birthdays.$inferSelect;

export function defaultConfig(guildId: string): BirthdayConfig {
  return { guildId, enabled: false, channelId: null, roleId: null, lastRunDay: null, updatedAt: null };
}

export async function getConfig(guildId: string): Promise<BirthdayConfig> {
  const rows = await db
    .select()
    .from(birthdayConfig)
    .where(eq(birthdayConfig.guildId, guildId))
    .limit(1);
  return rows[0] ?? defaultConfig(guildId);
}

export async function saveConfig(
  guildId: string,
  patch: Partial<typeof birthdayConfig.$inferInsert>,
): Promise<BirthdayConfig> {
  const rows = await db
    .insert(birthdayConfig)
    .values({ guildId, ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: birthdayConfig.guildId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return rows[0];
}

export function listEnabledConfigs() {
  return db.select().from(birthdayConfig).where(eq(birthdayConfig.enabled, true));
}

export async function markRun(guildId: string, day: string): Promise<void> {
  await db.update(birthdayConfig).set({ lastRunDay: day }).where(eq(birthdayConfig.guildId, guildId));
}

export async function setBirthday(
  guildId: string,
  userId: string,
  month: number,
  day: number,
): Promise<void> {
  await db
    .insert(birthdays)
    .values({ guildId, userId, month, day })
    .onConflictDoUpdate({
      target: [birthdays.guildId, birthdays.userId],
      set: { month, day },
    });
}

export async function removeBirthday(guildId: string, userId: string): Promise<void> {
  await db.delete(birthdays).where(and(eq(birthdays.guildId, guildId), eq(birthdays.userId, userId)));
}

export function getBirthdaysOn(guildId: string, month: number, day: number) {
  return db
    .select()
    .from(birthdays)
    .where(and(eq(birthdays.guildId, guildId), eq(birthdays.month, month), eq(birthdays.day, day)));
}

export function listBirthdays(guildId: string) {
  return db.select().from(birthdays).where(eq(birthdays.guildId, guildId));
}
