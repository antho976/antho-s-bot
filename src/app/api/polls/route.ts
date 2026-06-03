import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { listPolls } from "@/server/features/polls/queries";
import { createPollInChannel } from "@/server/features/polls/service";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

const createSchema = z.object({
  channelId: z.string().min(1).max(40),
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  multi: z.boolean().optional(),
  durationMin: z.number().int().min(0).max(43_200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listPolls(guildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const poll = await createPollInChannel({
      guildId: guildId(),
      channelId: parsed.data.channelId,
      question: parsed.data.question,
      options: parsed.data.options,
      multi: parsed.data.multi ?? false,
      durationMin: parsed.data.durationMin ?? 0,
      createdBy: session.user.discordId ?? null,
    });
    return NextResponse.json(poll, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
