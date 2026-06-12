import { generateWithPollinations } from "./pollinations";

/**
 * Provider-agnostic text-to-image entry point. Today only Pollinations is wired up (free, no
 * key), but the dispatch is the seam where Cloudflare Workers AI / Hugging Face / etc. drop in
 * later — config carries a `provider` discriminator so the call site never changes.
 */
export const IMAGE_PROVIDERS = ["pollinations"] as const;
export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

export interface GenerateImageOptions {
  provider?: string; // a row's stored value; unknown falls back to the default
  width?: number;
  height?: number;
}

const DEFAULT_PROVIDER: ImageProvider = "pollinations";

/** Generate an image from a prompt. Returns the PNG/JPEG bytes, or null on any failure. */
export async function generateImage(
  prompt: string,
  opts: GenerateImageOptions = {},
): Promise<Buffer | null> {
  const clean = prompt.trim();
  if (!clean) return null;

  switch (opts.provider) {
    case "pollinations":
    default:
      return generateWithPollinations(clean, { width: opts.width, height: opts.height });
  }
}

/**
 * Whether the configured provider can run right now. Pollinations needs nothing, so it's always
 * available; key-gated providers added later check their env here (mirrors hasOpenRouterKey()).
 */
export function hasImageProvider(provider: string = DEFAULT_PROVIDER): boolean {
  switch (provider) {
    case "pollinations":
      return true;
    default:
      return true;
  }
}
