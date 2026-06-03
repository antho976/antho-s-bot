import { NextResponse } from "next/server";
import { env } from "@/env";
import { logger } from "@/server/core/logger";
import { twitchProvider } from "@/server/integrations/twitch/provider";
import { getChannelByRef } from "@/server/features/notifications/queries";
import { handleStreamEvent } from "@/server/features/notifications/service";

// Inbound Twitch EventSub callback. Inert until subscriptions are registered, but the
// verification handshake + dispatch path are ready.
export const dynamic = "force-dynamic";

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

  const guildId = env.DISCORD_GUILD_ID ?? "default";
  for (const ev of twitchProvider.parse(raw, req.headers)) {
    const channel = await getChannelByRef(guildId, "twitch", ev.channelRef);
    if (channel) await handleStreamEvent(channel.id, ev.input);
  }

  logger.debug("twitch", `EventSub message handled (${type ?? "notification"}).`);
  return new NextResponse(null, { status: 204 });
}
