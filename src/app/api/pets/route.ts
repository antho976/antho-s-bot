import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { listSubmissions } from "@/server/features/pets/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const s = new URL(req.url).searchParams.get("status");
  const status = s === "pending" || s === "approved" || s === "denied" ? s : undefined;
  return NextResponse.json(await listSubmissions(guildId, status));
}
