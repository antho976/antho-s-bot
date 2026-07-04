import { env } from "@/env";
import { logger } from "@/server/core/logger";

/** Live-stream snapshot from the Helix /streams endpoint. */
export interface HelixStream {
  title: string;
  gameName: string;
  viewerCount: number;
  startedAt: number; // epoch ms
  thumbnailUrl: string; // sized to 1280x720
}

interface TokenState {
  value: string;
  expiresAt: number;
}

// App access token cached per process (survives HMR like the other singletons).
const g = globalThis as unknown as { __twitchToken?: TokenState | null };

export function helixConfigured(): boolean {
  return Boolean(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET);
}

async function appToken(): Promise<string | null> {
  const cached = g.__twitchToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID!,
      client_secret: env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    logger.warn("twitch", `App token request failed (${res.status}).`);
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  g.__twitchToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

/**
 * Current stream for a Twitch login, or null when offline (or Helix is unavailable).
 * Requires TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET.
 */
export async function getStreamByLogin(login: string): Promise<HelixStream | null> {
  if (!helixConfigured()) return null;
  try {
    const token = await appToken();
    if (!token) return null;

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`,
      {
        headers: {
          "Client-Id": env.TWITCH_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (res.status === 401) g.__twitchToken = null; // token revoked — refresh next call
    if (!res.ok) {
      logger.warn("twitch", `Helix streams request failed for ${login} (${res.status}).`);
      return null;
    }
    const body = (await res.json()) as {
      data: Array<{
        title: string;
        game_name: string;
        viewer_count: number;
        started_at: string;
        thumbnail_url: string;
      }>;
    };
    const stream = body.data[0];
    if (!stream) return null;
    return {
      title: stream.title,
      gameName: stream.game_name,
      viewerCount: stream.viewer_count,
      startedAt: Date.parse(stream.started_at) || Date.now(),
      thumbnailUrl: stream.thumbnail_url
        .replace("{width}", "1280")
        .replace("{height}", "720"),
    };
  } catch (err) {
    logger.warn("twitch", `Helix streams lookup failed for ${login}.`, err);
    return null;
  }
}
