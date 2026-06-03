import { env } from "@/env";
import { logger } from "@/server/core/logger";
import type {
  ParsedEvent,
  StreamProvider,
} from "@/server/features/notifications/domain/provider";

/**
 * YouTube via PubSubHubbub. The GET challenge handshake is handled in the route; subscribe()
 * and parse() are filled in once we wire real subscriptions (Phase 1 creds).
 */
export const youtubeProvider: StreamProvider = {
  platform: "youtube",

  async subscribe(channelRef, callbackUrl) {
    if (!env.YOUTUBE_API_KEY) {
      logger.warn("youtube", `Skip subscribe(${channelRef}) — no YouTube API key yet.`);
    }
    // TODO (creds): POST hub.mode=subscribe to https://pubsubhubbub.appspot.com/subscribe with
    // hub.topic = https://www.youtube.com/xml/feeds/videos.xml?channel_id=<channelRef>
    // and hub.callback = callbackUrl.
    void channelRef;
    void callbackUrl;
  },

  verify(): boolean {
    // PubSubHubbub authenticates via the GET challenge (handled in the route), not signatures.
    // An optional hub.secret HMAC can be added here later.
    return true;
  },

  parse(): ParsedEvent[] {
    // TODO (creds): parse the Atom XML → videoId → {type:"upload"}.
    return [];
  },
};
