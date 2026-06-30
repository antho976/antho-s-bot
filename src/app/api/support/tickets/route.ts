import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import { listTickets } from "@/server/features/support/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const guildId = await getCurrentGuildId();
  const statusParam = new URL(req.url).searchParams.get("status");
  const status = statusParam === "open" || statusParam === "closed" ? statusParam : undefined;
  return NextResponse.json(await listTickets(guildId, status));
}
