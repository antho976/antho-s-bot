import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getChannel } from "@/server/features/notifications/queries";
import { makeFakeInput } from "@/server/features/notifications/domain/fake";
import { handleStreamEvent } from "@/server/features/notifications/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  channelId: z.number().int(),
  type: z.enum(["live", "end", "upload"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const channel = await getChannel(parsed.data.channelId);
  if (!channel) return new NextResponse("Channel not found", { status: 404 });

  const input = makeFakeInput(channel, parsed.data.type);
  const result = await handleStreamEvent(channel.id, input);
  return NextResponse.json(result);
}
