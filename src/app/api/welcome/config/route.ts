import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { getConfig, saveConfig } from "@/server/features/welcome/queries";

export const dynamic = "force-dynamic";

const guildId = () => env.DISCORD_GUILD_ID ?? "default";
const mode = z.enum(["text", "image", "both"]);

const patchSchema = z.object({
  welcomeEnabled: z.boolean().optional(),
  welcomeChannelId: z.string().max(40).nullable().optional(),
  welcomeMode: mode.optional(),
  welcomeMessage: z.string().max(1000).optional(),
  goodbyeEnabled: z.boolean().optional(),
  goodbyeChannelId: z.string().max(40).nullable().optional(),
  goodbyeMode: mode.optional(),
  goodbyeMessage: z.string().max(1000).optional(),
  randomBackground: z.boolean().optional(),
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
