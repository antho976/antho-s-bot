import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import { getConfig, saveConfig } from "@/server/features/member-logs/queries";

export const dynamic = "force-dynamic";

const b = z.boolean().optional();

const patchSchema = z.object({
  enabled: b,
  channelId: z.string().max(40).nullable().optional(),
  logJoins: b,
  logLeaves: b,
  logBans: b,
  logUnbans: b,
  logNicknames: b,
  logRoles: b,
  logMessageEdits: b,
  logMessageDeletes: b,
  logVoice: b,
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await getConfig(await getCurrentGuildId()));
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json(await saveConfig(await getCurrentGuildId(), parsed.data));
}
