"use server";

import { cookies } from "next/headers";
import { isKnownGuild } from "@/server/core/guilds";
import { GUILD_COOKIE } from "@/server/core/current-guild";

/**
 * Set the dashboard's active guild. Validates against the configured guilds so a tampered cookie
 * can't scope the dashboard to an arbitrary server. The client refreshes after calling this.
 */
export async function selectGuild(id: string): Promise<void> {
  if (!isKnownGuild(id)) return;
  (await cookies()).set(GUILD_COOKIE, id, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
