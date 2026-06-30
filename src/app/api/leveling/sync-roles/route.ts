import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getCurrentGuildId } from "@/server/core/current-guild";
import { syncLevelsFromRoles } from "@/server/features/leveling/role-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const result = await syncLevelsFromRoles(await getCurrentGuildId());
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
