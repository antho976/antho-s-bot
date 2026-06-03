import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { reviewSubmission } from "@/server/features/pets/service";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["approved", "denied"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse("Bad request", { status: 400 });

  const updated = await reviewSubmission(id, parsed.data.status, session.user.discordId ?? "unknown");
  if (!updated) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(updated);
}
