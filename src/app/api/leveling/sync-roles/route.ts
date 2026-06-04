import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { syncLevelsFromRoles } from "@/server/features/leveling/role-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const result = await syncLevelsFromRoles(env.DISCORD_GUILD_ID ?? "default");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
