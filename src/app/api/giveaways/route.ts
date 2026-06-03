import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { listGiveaways } from "@/server/features/giveaways/queries";
import { createGiveawayInChannel } from "@/server/features/giveaways/service";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

const createSchema = z.object({
  channelId: z.string().min(1).max(40),
  prize: z.string().min(1).max(200),
  winnersCount: z.number().int().min(1).max(50),
  durationMin: z.number().int().min(1).max(43_200), // up to 30 days
  pingRoleId: z.string().max(40).nullable().optional(),
  minLevel: z.number().int().min(0).max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listGiveaways(guildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const giveaway = await createGiveawayInChannel({
      guildId: guildId(),
      channelId: parsed.data.channelId,
      prize: parsed.data.prize,
      winnersCount: parsed.data.winnersCount,
      durationMin: parsed.data.durationMin,
      pingRoleId: parsed.data.pingRoleId ?? null,
      minLevel: parsed.data.minLevel ?? 0,
      createdBy: session.user.discordId ?? null,
    });
    return NextResponse.json(giveaway, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
