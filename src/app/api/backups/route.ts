import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createBackup, listBackups } from "@/server/features/backups/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(listBackups());
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  try {
    await createBackup();
    return NextResponse.json(listBackups(), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
