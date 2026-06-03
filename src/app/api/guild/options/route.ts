import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { getGuildOptions } from "@/server/integrations/discord/guild-options";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await getGuildOptions(env.DISCORD_GUILD_ID ?? "default"));
}
