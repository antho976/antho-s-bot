import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getAccent, setAccent } from "@/server/core/settings";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a #rrggbb hex color"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ accent: await getAccent() });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const accent = parsed.data.accent.toLowerCase();
  await setAccent(accent);
  return NextResponse.json({ accent });
}
