import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { atLeast } from "@/server/core/permissions";
import { getCurrentGuildId } from "@/server/core/current-guild";
import { sendEmbed } from "@/server/features/embeds/service";

export const dynamic = "force-dynamic";

const fieldSchema = z.object({
  name: z.string().max(256),
  value: z.string().max(1024),
  inline: z.boolean(),
});

const schema = z.object({
  channelId: z.string().min(1).max(40),
  content: z.string().max(2000),
  author: z.string().max(256),
  authorIcon: z.string().max(2048),
  title: z.string().max(256),
  url: z.string().max(2048),
  description: z.string().max(4096),
  color: z.string().max(9),
  fields: z.array(fieldSchema).max(25),
  imageUrl: z.string().max(2048),
  thumbnailUrl: z.string().max(2048),
  footer: z.string().max(2048),
  footerIcon: z.string().max(2048),
  timestamp: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (!atLeast(session.user.accessLevel ?? "viewer", "mod")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const guildId = await getCurrentGuildId();
  const { channelId, ...embed } = parsed.data;
  const result = await sendEmbed(guildId, channelId, embed);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
