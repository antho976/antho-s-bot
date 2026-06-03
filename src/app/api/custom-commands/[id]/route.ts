import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { deleteCommand, updateCommand } from "@/server/features/custom-commands/queries";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  responseText: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  embed: z.boolean().optional(),
  autoDeleteSec: z.number().int().min(0).max(3600).optional(),
  maxUses: z.number().int().min(0).max(1_000_000).optional(),
  cooldownSec: z.number().int().min(0).max(86_400).optional(),
  allowedRoles: z.array(z.string()).optional(),
  allowedChannels: z.array(z.string()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const updated = await updateCommand(id, {
    ...(d.responseText !== undefined && { responseText: d.responseText }),
    ...(d.imageUrl !== undefined && { imageUrl: d.imageUrl }),
    ...(d.embed !== undefined && { embed: d.embed }),
    ...(d.autoDeleteSec !== undefined && { autoDeleteSec: d.autoDeleteSec }),
    ...(d.maxUses !== undefined && { maxUses: d.maxUses }),
    ...(d.cooldownSec !== undefined && { cooldownSec: d.cooldownSec }),
    ...(d.allowedRoles !== undefined && {
      allowedRoles: d.allowedRoles.length ? JSON.stringify(d.allowedRoles) : null,
    }),
    ...(d.allowedChannels !== undefined && {
      allowedChannels: d.allowedChannels.length ? JSON.stringify(d.allowedChannels) : null,
    }),
  });
  if (!updated) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });
  await deleteCommand(id);
  return new NextResponse(null, { status: 204 });
}
