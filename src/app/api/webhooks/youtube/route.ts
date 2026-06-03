import { NextResponse } from "next/server";
import { env } from "@/env";
import { youtubeProvider } from "@/server/integrations/youtube/provider";
import { getChannelByRef } from "@/server/features/notifications/queries";
import { handleStreamEvent } from "@/server/features/notifications/service";

// Inbound YouTube PubSubHubbub callback. GET handles the subscription challenge; POST handles
// upload notifications. Inert until subscriptions are registered.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const challenge = new URL(req.url).searchParams.get("hub.challenge");
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const guildId = env.DISCORD_GUILD_ID ?? "default";

  for (const ev of youtubeProvider.parse(raw, req.headers)) {
    const channel = await getChannelByRef(guildId, "youtube", ev.channelRef);
    if (channel) await handleStreamEvent(channel.id, ev.input);
  }
  return new NextResponse(null, { status: 204 });
}
