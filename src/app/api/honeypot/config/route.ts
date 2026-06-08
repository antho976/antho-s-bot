import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { getConfig, saveConfig } from "@/server/features/honeypot/queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";
const id = z.string().max(40);
const ids = z.array(id).max(50);

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  channelIds: ids.optional(),
  muteMode: z.enum(["role", "timeout"]).optional(),
  muteRoleId: id.nullable().optional(),
  timeoutMinutes: z.number().int().min(1).max(40_320).optional(), // Discord cap: 28 days
  purgeLookbackMinutes: z.number().int().min(0).max(20_160).optional(), // bulkDelete limit: 14 days
  pingTargetType: z.enum(["user", "role", "none"]).optional(),
  pingTargetId: id.nullable().optional(),
  alertChannelId: id.nullable().optional(),
  exemptRoleIds: ids.optional(),
  alsoBan: z.boolean().optional(),
  dmUser: z.boolean().optional(),
  dmMessage: z.string().max(1000).nullable().optional(),
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
