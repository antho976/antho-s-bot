import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import {
  createScheduleEntry,
  listSchedule,
} from "@/server/features/notifications/schedule-queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

const createSchema = z.object({
  channelId: z.number().int().optional(),
  title: z.string().max(140).optional(),
  startsAt: z.number().int(), // epoch ms
  remind1h: z.boolean().optional(),
  remind10m: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listSchedule(guildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const entry = await createScheduleEntry({
    guildId: guildId(),
    channelId: d.channelId,
    title: d.title,
    startsAt: new Date(d.startsAt),
    remind1h: d.remind1h ?? true,
    remind10m: d.remind10m ?? true,
  });
  return NextResponse.json(entry, { status: 201 });
}
