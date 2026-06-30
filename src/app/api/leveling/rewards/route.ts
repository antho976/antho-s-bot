import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import { addReward, listRewards } from "@/server/features/leveling/queries";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  level: z.number().int().min(1).max(1000),
  roleId: z.string().min(1).max(40),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listRewards(await getCurrentGuildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const guildId = await getCurrentGuildId();
  await addReward(guildId, parsed.data.level, parsed.data.roleId);
  return NextResponse.json(await listRewards(guildId), { status: 201 });
}
