import { env } from "@/env";
import { logger } from "@/server/core/logger";

/**
 * Minimal OpenRouter chat client. OpenRouter speaks the OpenAI-compatible Chat Completions
 * shape, so this is a single POST — no SDK. Used by the smart-reply feature.
 * Returns the reply text, or null on any failure (caller treats generation as best-effort).
 */
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** True when an OpenRouter key is configured; the feature stays inert without it. */
export function hasOpenRouterKey(): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  if (!env.OPENROUTER_API_KEY) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Optional but recommended by OpenRouter — identifies the app in their dashboard.
        "HTTP-Referer": env.PUBLIC_BASE_URL,
        "X-Title": "antho's bot",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 300,
        temperature: opts.temperature ?? 0.8,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn("openrouter", `Chat completion failed (${res.status})`, body.slice(0, 300));
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    logger.warn("openrouter", "Chat completion error", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
