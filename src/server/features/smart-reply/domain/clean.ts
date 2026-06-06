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
