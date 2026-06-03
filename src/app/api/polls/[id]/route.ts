import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getPoll } from "@/server/features/polls/queries";
import { endPoll } from "@/server/features/polls/service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });
  await endPoll(id);
  return NextResponse.json(await getPoll(id));
}
