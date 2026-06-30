import { NextResponse } from "next/server";
import { youtubeProvider } from "@/server/integrations/youtube/provider";
import { getChannelsByRef } from "@/server/features/notifications/queries";
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

  // Fan out to every guild watching this channel.
  for (const ev of youtubeProvider.parse(raw, req.headers)) {
    const channels = await getChannelsByRef("youtube", ev.channelRef);
    for (const channel of channels) await handleStreamEvent(channel.id, ev.input);
  }
  return new NextResponse(null, { status: 204 });
}
