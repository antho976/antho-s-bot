import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { runMaintenance } from "@/server/core/maintenance";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["reset-live", "reset-schedule", "reset-daily"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await runMaintenance(
    parsed.data.action,
    env.DISCORD_GUILD_ID ?? "default",
    session.user.discordId ?? "unknown",
  );
  return NextResponse.json(result);
}
