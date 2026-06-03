import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { addBackground, listBackgrounds } from "@/server/features/welcome/queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

const createSchema = z.object({
  url: z.string().url().max(500),
  kind: z.enum(["welcome", "goodbye", "both"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listBackgrounds(guildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const created = await addBackground(guildId(), parsed.data.url, parsed.data.kind);
  return NextResponse.json(created, { status: 201 });
}
