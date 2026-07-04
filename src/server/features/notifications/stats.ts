import { logger } from "@/server/core/logger";
import { editChannelMessage } from "@/server/integrations/discord/send";
import { getStreamByLogin, helixConfigured } from "@/server/integrations/twitch/helix";
import { platformChannelUrl } from "./config";
import { buildAlert } from "./domain/format";
import { fakeThumbnail } from "./domain/fake";
import type { AlertInput } from "./domain/types";
import { listLiveStates, upsertState, type StreamChannel, type StreamState } from "./queries";

const TEST_EXPIRE_MS = 4 * 60 * 60_000;

interface FreshStats {
  viewers: number;
  title?: string;
  game?: string;
  thumbnailUrl?: string;
}

/** Pull the current viewer count: simulated for fake tests, Helix for real Twitch streams. */
async function fetchStats(channel: StreamChannel, state: StreamState): Promise<FreshStats | null> {
  const name = channel.displayName || channel.channelRef;
  if (state.isTest) {
    // gentle random walk with slight upward drift so peak/avg look believable
    const base = state.currentViewers ?? 40;
    const viewers = Math.max(1, Math.round(base * (0.93 + Math.random() * 0.18)) + 2);
    return { viewers, thumbnailUrl: fakeThumbnail(channel.platform, name) };
  }
  if (channel.platform !== "twitch" || !helixConfigured()) return null;
  const stream = await getStreamByLogin(channel.channelRef);
  if (!stream) return null; // offline (EventSub owns the end event) or an API hiccup
  return {
    viewers: stream.viewerCount,
    title: stream.title,
    game: stream.gameName,
    // cache-buster so Discord refetches the preview instead of showing the first frame forever
    thumbnailUrl: `${stream.thumbnailUrl}?t=${Math.floor(Date.now() / 60_000)}`,
  };
}

/**
 * Scheduler tick: for every live channel whose refresh interval has elapsed, sample the viewer
 * count (feeding the peak/avg summary) and edit the live announcement embed in place.
 */
export async function updateLiveStats(): Promise<void> {
  const live = await listLiveStates();
  const now = Date.now();

  for (const { channel, state } of live) {
    if (!channel.enabled) continue;

    // A fake-live test nobody ended would simulate viewers forever — expire it quietly.
    if (state.isTest && state.lastLiveAt && now - state.lastLiveAt.getTime() > TEST_EXPIRE_MS) {
      await upsertState(channel.id, { isLive: false, isTest: false });
      continue;
    }
    const intervalMs = Math.max(1, channel.statsIntervalMin) * 60_000;
    // 5s slack so a tick landing just shy of the interval doesn't push updates a minute late
    if (state.lastStatsAt && now - state.lastStatsAt.getTime() < intervalMs - 5_000) continue;

    try {
      const fresh = await fetchStats(channel, state);
      if (!fresh) continue;

      await upsertState(channel.id, {
        currentViewers: fresh.viewers,
        peakViewers: Math.max(state.peakViewers ?? 0, fresh.viewers),
        viewerSum: (state.viewerSum ?? 0) + fresh.viewers,
        viewerSamples: (state.viewerSamples ?? 0) + 1,
        lastStatsAt: new Date(),
        ...(fresh.title ? { currentTitle: fresh.title } : {}),
        ...(fresh.game ? { currentGame: fresh.game } : {}),
      });

      if (!channel.useEmbed || !state.liveMessageId || !state.liveMessageChannelId) continue;

      const input: AlertInput = {
        type: "live",
        title: fresh.title ?? state.currentTitle ?? undefined,
        game: fresh.game ?? state.currentGame ?? undefined,
        url: platformChannelUrl(channel.platform, channel.channelRef),
        thumbnailUrl: fresh.thumbnailUrl,
        viewers: fresh.viewers,
        startedAt: state.lastLiveAt?.getTime(),
        test: state.isTest,
      };
      const { embeds, components } = buildAlert(channel, input);
      await editChannelMessage(state.liveMessageChannelId, state.liveMessageId, {
        embeds,
        components,
      });
    } catch (err) {
      logger.error("notifications", `Stats update failed for ${channel.channelRef}`, err);
    }
  }
}
