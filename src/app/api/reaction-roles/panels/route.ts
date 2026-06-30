import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import {
  getPairsByMessage,
  listPanelsWithPairs,
} from "@/server/features/reaction-roles/queries";
import { createReactionRolePanel } from "@/server/features/reaction-roles/service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  channelId: z.string().min(1).max(40),
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

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await listPanelsWithPairs(await getCurrentGuildId()));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const panel = await createReactionRolePanel(
      await getCurrentGuildId(),
      parsed.data.channelId,
      parsed.data.title,
      parsed.data.mode,
      parsed.data.pairs,
    );
    const pairs = await getPairsByMessage(panel.messageId);
    return NextResponse.json({ ...panel, pairs }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
