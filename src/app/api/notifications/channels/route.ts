import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import {
  createChannel,
  listChannels,
} from "@/server/features/notifications/queries";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  platform: z.enum(["twitch", "youtube"]),
  channelRef: z.string().min(1).max(120),
  displayName: z.string().max(120).optional(),
  discordChannelId: z.string().max(40).optional(),
  messageTemplate: z.string().max(500).optional(),
  useEmbed: z.boolean().optional(),
  pingRoleId: z.string().max(40).optional(),
  alertOnLive: z.boolean().optional(),
  alertOnEnd: z.boolean().optional(),
  alertOnUpload: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listChannels(await getCurrentGuildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const channel = await createChannel({ ...parsed.data, guildId: await getCurrentGuildId() });
  return NextResponse.json(channel, { status: 201 });
}
