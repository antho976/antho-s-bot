import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import {
  deleteChannel,
  updateChannel,
} from "@/server/features/notifications/queries";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  channelRef: z.string().min(1).max(120).optional(),
  displayName: z.string().max(120).nullable().optional(),
  enabled: z.boolean().optional(),
  discordChannelId: z.string().max(40).nullable().optional(),
  messageTemplate: z.string().max(500).nullable().optional(),
  useEmbed: z.boolean().optional(),
  pingRoleId: z.string().max(40).nullable().optional(),
  alertOnLive: z.boolean().optional(),
  alertOnEnd: z.boolean().optional(),
  alertOnUpload: z.boolean().optional(),
  statsIntervalMin: z.number().int().min(1).max(120).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateChannel(id, parsed.data);
  if (!updated) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  await deleteChannel(id);
  return new NextResponse(null, { status: 204 });
}
