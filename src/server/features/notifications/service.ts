import { logger } from "@/server/core/logger";
import { track } from "@/server/core/analytics";
import { editChannelMessage, sendMessage } from "@/server/integrations/discord/send";
import { buildAlert, buildEndAlert } from "./domain/format";
import type { AlertInput, StreamSummary } from "./domain/types";
import {
  getChannel,
  getState,
  recordEvent,
  upsertState,
  type StreamChannel,
  type StreamState,
} from "./queries";

// EventSub retries/re-deliveries within this window are treated as the same "went live".
const DUPLICATE_LIVE_MS = 15 * 60_000;

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

  await recordEvent(channelId, input.type, input);
  await track(channel.guildId, `stream.${input.type}`, {
    platform: channel.platform,
    channelRef: channel.channelRef,
  });

  if (input.type === "live") return handleLive(channel, input);
  if (input.type === "end") return handleEnd(channel, input);
  return handleUpload(channel, input);
}

async function handleLive(channel: StreamChannel, input: AlertInput): Promise<HandleResult> {
  const state = await getState(channel.id);
  const isDuplicate =
    !input.test &&
    !!state?.isLive &&
    !!state.lastLiveAt &&
    Date.now() - state.lastLiveAt.getTime() < DUPLICATE_LIVE_MS;

  await upsertState(channel.id, {
    isLive: true,
    // on a duplicate/retry, only overwrite title/game when the event actually carries them
    ...(input.title || !isDuplicate ? { currentTitle: input.title ?? null } : {}),
    ...(input.game || !isDuplicate ? { currentGame: input.game ?? null } : {}),
    ...(isDuplicate
      ? {}
      : {
          // a fresh live session: reset the per-stream stats
          lastLiveAt: input.startedAt ? new Date(input.startedAt) : new Date(),
          currentViewers: input.viewers ?? null,
          peakViewers: input.viewers ?? null,
          viewerSum: input.viewers ?? 0,
          viewerSamples: input.viewers != null ? 1 : 0,
          lastStatsAt: new Date(),
          isTest: input.test ?? false,
          liveMessageId: null,
          liveMessageChannelId: null,
        }),
  });

  if (isDuplicate) return { sent: false, reason: "duplicate live event ignored" };
  if (!channel.alertOnLive) return { sent: false, reason: "alert type disabled for this channel" };
  if (!channel.discordChannelId) return { sent: false, reason: "no target Discord channel set" };

  const message = await sendMessage(channel.discordChannelId, buildAlert(channel, input));
  if (message) {
    // remember the announcement so the stats job can refresh it and the end summary can replace it
    await upsertState(channel.id, {
      liveMessageId: message.id,
      liveMessageChannelId: channel.discordChannelId,
    });
  }
  logSend(channel, "live", message !== null);
  return { sent: message !== null };
}

async function handleEnd(channel: StreamChannel, input: AlertInput): Promise<HandleResult> {
  const state = await getState(channel.id);
  const wasLive = !!state?.isLive;
  const summary = summarize(state, input, wasLive);

  await upsertState(channel.id, {
    isLive: false,
    lastEndedAt: new Date(),
    isTest: false,
    liveMessageId: null,
    liveMessageChannelId: null,
  });

  if (!wasLive && !input.test) return { sent: false, reason: "not live — duplicate end ignored" };

  // Replace the live announcement with the after-stream summary, even when end alerts are off.
  if (channel.useEmbed && state?.liveMessageId && state.liveMessageChannelId) {
    const { embeds, components } = buildEndAlert(channel, summary);
    await editChannelMessage(state.liveMessageChannelId, state.liveMessageId, {
      embeds,
      components,
    });
  }

  if (!channel.alertOnEnd) return { sent: false, reason: "alert type disabled for this channel" };
  if (!channel.discordChannelId) return { sent: false, reason: "no target Discord channel set" };

  const payload = channel.useEmbed ? buildEndAlert(channel, summary) : buildAlert(channel, input);
  const message = await sendMessage(channel.discordChannelId, payload);
  logSend(channel, "end", message !== null);
  return { sent: message !== null };
}

async function handleUpload(channel: StreamChannel, input: AlertInput): Promise<HandleResult> {
  await upsertState(channel.id, { lastVideoId: input.videoId ?? null });

  if (!channel.alertOnUpload) return { sent: false, reason: "alert type disabled for this channel" };
  if (!channel.discordChannelId) return { sent: false, reason: "no target Discord channel set" };

  const message = await sendMessage(channel.discordChannelId, buildAlert(channel, input));
  logSend(channel, "upload", message !== null);
  return { sent: message !== null };
}

/** Prefer stats the engine tracked itself; fall back to what the event supplied. */
function summarize(
  state: StreamState | null,
  input: AlertInput,
  wasLive: boolean,
): StreamSummary {
  const samples = wasLive ? (state?.viewerSamples ?? 0) : 0;
  const startedAt = wasLive ? state?.lastLiveAt?.getTime() : undefined;
  return {
    title: (wasLive ? state?.currentTitle : null) ?? input.title ?? null,
    game: (wasLive ? state?.currentGame : null) ?? input.game ?? null,
    durationMs: startedAt ? Date.now() - startedAt : input.durationMs,
    peakViewers: (samples > 0 ? (state?.peakViewers ?? undefined) : undefined) ?? input.peakViewers,
    avgViewers:
      samples > 0
        ? Math.round((state?.viewerSum ?? 0) / samples)
        : input.avgViewers,
  };
}

function logSend(channel: StreamChannel, type: string, sent: boolean): void {
  const name = channel.displayName ?? channel.channelRef;
  if (sent) {
    logger.info("notifications", `Sent ${type} alert for ${name}.`);
  } else {
    logger.warn(
      "notifications",
      `Could not send ${type} alert for ${channel.channelRef} (bot offline or channel unusable).`,
    );
  }
}
