import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { deleteScheduleEntry } from "@/server/features/notifications/schedule-queries";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new NextResponse("Bad id", { status: 400 });

  await deleteScheduleEntry(id);
  return new NextResponse(null, { status: 204 });
}
