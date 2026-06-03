import { logger } from "@/server/core/logger";
import { track } from "@/server/core/analytics";
import { sendToChannel } from "@/server/integrations/discord/send";
import { buildAlert } from "./domain/format";
import type { AlertInput, StreamEventType } from "./domain/types";
import { getChannel, recordEvent, upsertState, type StreamChannel } from "./queries";

const SHOULD_ALERT: Record<StreamEventType, (c: StreamChannel) => boolean> = {
  live: (c) => c.alertOnLive,
  end: (c) => c.alertOnEnd,
  upload: (c) => c.alertOnUpload,
};

export interface HandleResult {
  sent: boolean;
  reason?: string;
}

/**
 * The heart of the engine: update state, record + track the event, and (if enabled) post the
 * alert. Used by the real Twitch/YouTube providers AND by the dashboard's fake-live test.
 */
export async function handleStreamEvent(
  channelId: number,
  input: AlertInput,
): Promise<HandleResult> {
  const channel = await getChannel(channelId);
  if (!channel) return { sent: false, reason: "channel not found" };
  if (!channel.enabled) return { sent: false, reason: "channel disabled" };

  // Update live/seen state by event type.
  if (input.type === "live") {
    await upsertState(channelId, {
      isLive: true,
      lastLiveAt: new Date(),
      currentTitle: input.title ?? null,
      currentGame: input.game ?? null,
    });
  } else if (input.type === "end") {
    await upsertState(channelId, { isLive: false, lastEndedAt: new Date() });
  } else if (input.type === "upload") {
    await upsertState(channelId, { lastVideoId: input.videoId ?? null });
  }

  await recordEvent(channelId, input.type, input);
  await track(channel.guildId, `stream.${input.type}`, {
    platform: channel.platform,
    channelRef: channel.channelRef,
  });

  if (!SHOULD_ALERT[input.type](channel)) {
    return { sent: false, reason: "alert type disabled for this channel" };
  }
  if (!channel.discordChannelId) {
    return { sent: false, reason: "no target Discord channel set" };
  }

  const payload = buildAlert(channel, input);
  const sent = await sendToChannel(channel.discordChannelId, payload);
  if (sent) {
    logger.info(
      "notifications",
      `Sent ${input.type} alert for ${channel.displayName ?? channel.channelRef}.`,
    );
  } else {
    logger.warn(
      "notifications",
      `Could not send ${input.type} alert for ${channel.channelRef} (bot offline or channel unusable).`,
    );
  }
  return { sent };
}
