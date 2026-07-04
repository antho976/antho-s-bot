import crypto from "node:crypto";
import { env } from "@/env";
import { logger } from "@/server/core/logger";
import type {
  ParsedEvent,
  StreamProvider,
} from "@/server/features/notifications/domain/provider";

interface EventSubBody {
  subscription?: { type?: string };
  event?: {
    broadcaster_user_login?: string;
    started_at?: string;
  };
}

/**
 * Twitch EventSub provider. Signature verification + event parsing are live; subscribe() is
 * filled in when EventSub subscription management lands (needs TWITCH_* credentials).
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

  parse(rawBody, headers): ParsedEvent[] {
    if (headers.get("twitch-eventsub-message-type") !== "notification") return [];

    let body: EventSubBody;
    try {
      body = JSON.parse(rawBody) as EventSubBody;
    } catch {
      return [];
    }
    const login = body.event?.broadcaster_user_login;
    if (!login) return [];
    const url = `https://twitch.tv/${login}`;

    const type = body.subscription?.type;
    if (type === "stream.online") {
      const startedAt = body.event?.started_at ? Date.parse(body.event.started_at) : NaN;
      return [
        {
          channelRef: login,
          input: {
            type: "live",
            url,
            startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
          },
        },
      ];
    }
    if (type === "stream.offline") {
      return [{ channelRef: login, input: { type: "end", url } }];
    }
    return [];
  },
};
