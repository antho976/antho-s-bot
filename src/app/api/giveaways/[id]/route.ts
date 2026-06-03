import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getGiveaway } from "@/server/features/giveaways/queries";
import { cancelGiveaway, endGiveaway } from "@/server/features/giveaways/service";

export const dynamic = "force-dynamic";

const schema = z.object({ action: z.enum(["end", "cancel"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse("Bad request", { status: 400 });

  if (parsed.data.action === "end") await endGiveaway(id);
  else await cancelGiveaway(id);

  return NextResponse.json(await getGiveaway(id));
}
