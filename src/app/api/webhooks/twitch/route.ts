import { NextResponse } from "next/server";
import { logger } from "@/server/core/logger";
import { twitchProvider } from "@/server/integrations/twitch/provider";
import { getStreamByLogin, helixConfigured } from "@/server/integrations/twitch/helix";
import { getChannelsByRef } from "@/server/features/notifications/queries";
import { handleStreamEvent } from "@/server/features/notifications/service";
import type { AlertInput } from "@/server/features/notifications/domain/types";

// Inbound Twitch EventSub callback. Inert until subscriptions are registered, but the
// verification handshake + dispatch path are ready.
export const dynamic = "force-dynamic";

/** stream.online carries no title/game/viewers — pull them from Helix when we can. */
async function enrichLive(channelRef: string, input: AlertInput): Promise<AlertInput> {
  if (input.type !== "live" || !helixConfigured()) return input;
  const stream = await getStreamByLogin(channelRef);
  if (!stream) return input;
  return {
    ...input,
    title: stream.title,
    game: stream.gameName,
    viewers: stream.viewerCount,
    startedAt: stream.startedAt,
    thumbnailUrl: stream.thumbnailUrl,
  };
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!twitchProvider.verify(req.headers, raw)) {
    return new NextResponse("invalid signature", { status: 403 });
  }

  const type = req.headers.get("twitch-eventsub-message-type");
  if (type === "webhook_callback_verification") {
    const challenge = (JSON.parse(raw) as { challenge?: string }).challenge ?? "";
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Fan out to every guild watching this streamer (a channel can be watched by multiple servers).
  for (const ev of twitchProvider.parse(raw, req.headers)) {
    const input = await enrichLive(ev.channelRef, ev.input);
    const channels = await getChannelsByRef("twitch", ev.channelRef);
    for (const channel of channels) await handleStreamEvent(channel.id, input);
  }

  logger.debug("twitch", `EventSub message handled (${type ?? "notification"}).`);
  return new NextResponse(null, { status: 204 });
}
