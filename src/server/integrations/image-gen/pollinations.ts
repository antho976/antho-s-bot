import { env } from "@/env";
import { logger } from "@/server/core/logger";

/**
 * Pollinations.ai text-to-image. It's a plain GET — the prompt goes in the URL path and the
 * response body IS the image — so there's no SDK. Anonymous use is allowed but throttled hard
 * per-IP (a shared host quickly hits a "queue full" HTTP 402); a free Seed-tier token from
 * auth.pollinations.ai, set as POLLINATIONS_TOKEN, lifts that by tying limits to the account.
 * Returns the image bytes, or null on any failure (caller treats generation as best-effort).
 */
const BASE = "https://image.pollinations.ai/prompt/";

export interface PollinationsOptions {
  width?: number;
  height?: number;
  model?: string; // pollinations model: "flux" (default), "turbo", …
  seed?: number; // vary to avoid their per-prompt cache
  timeoutMs?: number;
}

export async function generateWithPollinations(
  prompt: string,
  opts: PollinationsOptions = {},
): Promise<Buffer | null> {
  const params = new URLSearchParams({
    width: String(opts.width ?? 1024),
    height: String(opts.height ?? 1024),
    model: opts.model ?? "flux",
    seed: String(opts.seed ?? Math.floor(Math.random() * 1_000_000)),
    nologo: "true",
    // Identify the app; registered referrers get higher limits than a raw anonymous IP.
    referrer: env.PUBLIC_BASE_URL,
  });

  const url = `${BASE}${encodeURIComponent(prompt)}?${params.toString()}`;

  // Backend auth is a Bearer token (their documented method); without it we fall back to the
  // throttled anonymous IP tier.
  const headers: Record<string, string> = {};
  if (env.POLLINATIONS_TOKEN) headers.Authorization = `Bearer ${env.POLLINATIONS_TOKEN}`;

  const controller = new AbortController();
  // Image gen is slow — generous timeout vs the chat client's 20s.
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const hint =
        res.status === 402 && !env.POLLINATIONS_TOKEN
          ? " — anonymous rate limit; set POLLINATIONS_TOKEN (free at auth.pollinations.ai)"
          : "";
      logger.warn("pollinations", `Image request failed (${res.status})${hint}`, body.slice(0, 200));
      return null;
    }
    // Guard against an HTML error page slipping through with a 200.
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      logger.warn("pollinations", `Unexpected content-type "${type}"`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn("pollinations", "Image request error", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
