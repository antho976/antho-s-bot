import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { listRewards } from "@/server/features/leveling/queries";
import { syncRewardsFromRoles } from "@/server/features/leveling/reward-sync";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

/** Scan server roles named like "Lv 75" and add them as level rewards. Returns the fresh list. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const result = await syncRewardsFromRoles(guildId());
  const rewards = await listRewards(guildId());
  return NextResponse.json({ ...result, rewards }, { status: result.ok ? 200 : 502 });
}
