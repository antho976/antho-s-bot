// Strip chain-of-thought that reasoning models emit inline in their reply. Many free OpenRouter
// models (DeepSeek-R1 distills, QwQ, etc.) wrap their thinking in <think>...</think> before the
// real answer — we only want the final answer in chat. Pure + testable.

const THINK_BLOCK = /<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi; // complete blocks
const THINK_OPEN_TO_END = /<think(?:ing)?>[\s\S]*$/i; // truncated: opened, never closed
const THINK_START_TO_CLOSE = /^[\s\S]*?<\/think(?:ing)?>/i; // orphan close at the start

export function stripReasoning(text: string): string {
  return text
    .replace(THINK_BLOCK, "")
    .replace(THINK_OPEN_TO_END, "")
    .replace(THINK_START_TO_CLOSE, "")
    .trim();
}

// Models lean hard on em-dashes (—) — a giveaway that reads as "AI" in casual chat. Swap the
// fancy dash characters (em, en, figure, horizontal bar) for a plain hyphen that a person would
// actually type, collapsing the surrounding spaces so " — " becomes " - " not "  -  ".
const FANCY_DASH = /\s*[‒–—―]\s*/g;

export function normalizeDashes(text: string): string {
  return text.replace(FANCY_DASH, " - ");
}

/** Full post-processing for a model reply before it hits Discord. */
export function cleanReply(text: string): string {
  return normalizeDashes(stripReasoning(text));
}
