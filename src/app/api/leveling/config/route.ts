import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { getConfig, saveConfig } from "@/server/features/leveling/queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  xpMsgMin: z.number().int().min(0).max(1000).optional(),
  xpMsgMax: z.number().int().min(0).max(1000).optional(),
  msgCooldownSec: z.number().int().min(0).max(86_400).optional(),
  xpPerVoiceMin: z.number().int().min(0).max(1000).optional(),
  xpPerReaction: z.number().int().min(0).max(1000).optional(),
  curveType: z.enum(["multiplier", "custom"]).optional(),
  curveBase: z.number().int().min(1).max(100_000).optional(),
  curveFactor: z.number().min(1).max(5).optional(),
  announce: z.boolean().optional(),
  announceChannelId: z.string().max(40).nullable().optional(),
  announcePing: z.boolean().optional(),
  announceMinLevel: z.number().int().min(0).max(1000).optional(),
  levelUpMessage: z.string().max(500).nullable().optional(),
  stackRoleRewards: z.boolean().optional(),
  voiceRequireActive: z.boolean().optional(),
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
