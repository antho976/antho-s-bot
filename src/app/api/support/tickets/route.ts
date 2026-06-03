import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { listTickets } from "@/server/features/support/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const statusParam = new URL(req.url).searchParams.get("status");
  const status = statusParam === "open" || statusParam === "closed" ? statusParam : undefined;
  return NextResponse.json(await listTickets(guildId, status));
}
