import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/env";
import { renderCard } from "@/server/features/welcome/domain/render";
import { getConfig, pickBackground } from "@/server/features/welcome/queries";

export const dynamic = "force-dynamic";

const schema = z.object({ kind: z.enum(["welcome", "goodbye"]) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse("Bad request", { status: 400 });

  const guildId = env.DISCORD_GUILD_ID ?? "default";
  const config = await getConfig(guildId);
  const background = await pickBackground(guildId, parsed.data.kind, config.randomBackground);

  const buffer = await renderCard({
    title: parsed.data.kind === "welcome" ? "Welcome!" : "Goodbye",
    username: session.user.name ?? "NewMember",
    subtitle: "Your Server",
    avatarUrl: session.user.image ?? "https://cdn.discordapp.com/embed/avatars/0.png",
    backgroundUrl: background,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
