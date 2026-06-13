import { logger } from "@/server/core/logger";

/**
 * CodeCogs LaTeX → PNG. A plain GET whose response body IS the rendered equation, with no API
 * key, no account, and no per-IP queue/rate-limit (it's a stateless typesetter, unlike the
 * image-generation services). Inline `\dpi{}` controls resolution and `\bg{white}` gives a solid
 * background that reads on both Discord themes. Returns the PNG bytes, or null on any failure.
 */
const BASE = "https://latex.codecogs.com/png.image?";

export interface CodecogsOptions {
  dpi?: number;
  timeoutMs?: number;
}

export async function renderWithCodecogs(
  latex: string,
  opts: CodecogsOptions = {},
): Promise<Buffer | null> {
  // Directives must sit in front of the expression, then the whole thing is URL-encoded.
  const directives = `\\dpi{${opts.dpi ?? 300}}\\bg{white} `;
  const url = BASE + encodeURIComponent(directives + latex);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn("codecogs", `Math render failed (${res.status})`, body.slice(0, 200));
      return null;
    }
    // CodeCogs returns an HTML/text error (still 200) for invalid LaTeX — guard on the type.
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      logger.warn("codecogs", `Unexpected content-type "${type}" (invalid LaTeX?)`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn("codecogs", "Math render error", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
