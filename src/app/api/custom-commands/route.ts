import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import { createCommand, listCommands } from "@/server/features/custom-commands/queries";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/i),
  responseText: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  embed: z.boolean().optional(),
  autoDeleteSec: z.number().int().min(0).max(3600).optional(),
  maxUses: z.number().int().min(0).max(1_000_000).optional(),
  cooldownSec: z.number().int().min(0).max(86_400).optional(),
  allowedRoles: z.array(z.string()).optional(),
  allowedChannels: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listCommands(await getCurrentGuildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const created = await createCommand({
      guildId: await getCurrentGuildId(),
      name: d.name.toLowerCase(),
      responseText: d.responseText ?? "",
      imageUrl: d.imageUrl ?? null,
      embed: d.embed ?? false,
      autoDeleteSec: d.autoDeleteSec ?? 0,
      maxUses: d.maxUses ?? 0,
      cooldownSec: d.cooldownSec ?? 0,
      allowedRoles: d.allowedRoles?.length ? JSON.stringify(d.allowedRoles) : null,
      allowedChannels: d.allowedChannels?.length ? JSON.stringify(d.allowedChannels) : null,
      createdBy: session.user.discordId ?? null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A command with that name already exists." }, { status: 409 });
  }
}
