import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getHealth } from "@/server/core/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await getHealth());
}
