import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { getConfig, saveConfig } from "@/server/features/automod/queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";
const b = z.boolean().optional();

const patchSchema = z.object({
  enabled: b,
  deleteMessage: b,
  timeoutUser: b,
  timeoutMinutes: z.number().int().min(1).max(40_320).optional(), // Discord cap: 28 days
  logChannelId: z.string().max(40).nullable().optional(),
  checkBlocklist: b,
  checkTyposquats: b,
  checkScamPhrases: b,
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await getConfig(guildId()));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(await saveConfig(guildId(), parsed.data));
}
