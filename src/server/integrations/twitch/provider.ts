import crypto from "node:crypto";
import { env } from "@/env";
import { logger } from "@/server/core/logger";
import type {
  ParsedEvent,
  StreamProvider,
} from "@/server/features/notifications/domain/provider";

/**
 * Twitch EventSub provider. The signature-verification + challenge handshake are ready; the
 * subscribe() and parse() bodies are filled in when TWITCH_* credentials are added (Phase 1).
 */
export const twitchProvider: StreamProvider = {
  platform: "twitch",

  async subscribe(channelRef, callbackUrl) {
    if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
      logger.warn("twitch", `Skip subscribe(${channelRef}) — no Twitch credentials yet.`);
      return;
    }
    // TODO (creds): app access token → resolve user id for channelRef → POST EventSub
    // subscriptions (stream.online / stream.offline) to callbackUrl with TWITCH_EVENTSUB_SECRET.
    void callbackUrl;
  },

  verify(headers, rawBody) {
    const secret = env.TWITCH_EVENTSUB_SECRET;
    if (!secret) return false;
    const id = headers.get("twitch-eventsub-message-id") ?? "";
    const ts = headers.get("twitch-eventsub-message-timestamp") ?? "";
    const sig = headers.get("twitch-eventsub-message-signature") ?? "";
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(id + ts + rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  },

  parse(): ParsedEvent[] {
    // TODO (creds): map stream.online → {type:"live"}, stream.offline → {type:"end"}.
    return [];
  },
};
