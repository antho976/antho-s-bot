import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getPairsByMessage } from "@/server/features/reaction-roles/queries";
import {
  deleteReactionRolePanel,
  editReactionRolePanel,
} from "@/server/features/reaction-roles/service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().max(200).optional(),
  mode: z.enum(["toggle", "unique", "verify"]),
  pairs: z
    .array(
      z.object({
        emoji: z.string().min(1).max(100),
        roleId: z.string().min(1).max(40),
        label: z.string().max(100).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const panel = await editReactionRolePanel(
      id,
      parsed.data.title,
      parsed.data.mode,
      parsed.data.pairs,
    );
    const pairs = await getPairsByMessage(panel.messageId);
    return NextResponse.json({ ...panel, pairs });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });
  await deleteReactionRolePanel(id);
  return new NextResponse(null, { status: 204 });
}
