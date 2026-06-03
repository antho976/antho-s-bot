import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { getRpgConfig, saveRpgConfig } from "@/server/features/rpg/queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  channelId: z.string().max(40).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await getRpgConfig(guildId()));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(await saveRpgConfig(guildId(), parsed.data));
}
