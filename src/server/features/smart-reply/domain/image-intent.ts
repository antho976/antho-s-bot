// Pure helpers for the image-generation path. Two stages, deliberately split:
//   1. detectImageRequest() — a CHEAP keyword gate on the triggering message. It only decides
//      whether to *offer* the model the image option; it's intentionally loose (better to enable
//      and let the model decline than to miss a real request).
//   2. splitImagePrompt() — pulls the model's own `IMAGE: <prompt>` line back out of its reply.
//      The model is the precise decider: gate fired but no IMAGE line ⇒ it chose not to draw.

// Verbs/nouns that signal "make me a picture". Matched as whole words, case-insensitive.
const IMAGE_TERMS = [
  "picture",
  "photo",
  "image",
  "drawing",
  "draw",
  "sketch",
  "paint",
  "render",
  "generate",
  "wallpaper",
  "artwork",
  "selfie",
  "meme",
];

const TERMS_RE = new RegExp(`\\b(?:${IMAGE_TERMS.join("|")})\\b`, "i");

// A bare noun ("nice photo!") isn't a request — require an imperative/ask nearby so we don't fire
// on people merely talking about pictures. Loose on purpose; the model makes the final call.
const ASK_RE = /\b(?:make|create|draw|generate|show|give|send|paint|sketch|render|can you|could you|please|wanna|want|need|let'?s see|how about)\b/i;

/** Cheap gate: does this message look like a request to generate an image? */
export function detectImageRequest(raw: string): boolean {
  const text = (raw ?? "").trim();
  if (!text) return false;
  return TERMS_RE.test(text) && ASK_RE.test(text);
}

export interface SplitReply {
  caption: string; // the conversational text to post alongside the image (may be empty)
  imagePrompt: string | null; // the model's image prompt, or null if it emitted no IMAGE line
}

// Match a line like `IMAGE: a cat in sunglasses`, tolerating markdown bold/quoting the model adds.
const IMAGE_LINE_RE = /^[\s>*_`]*image[\s*_`]*:[\s*_`]*(.+?)[\s*_`]*$/im;

/** Separate the model's `IMAGE: …` prompt from the chat text that precedes it. */
export function splitImagePrompt(reply: string): SplitReply {
  const match = IMAGE_LINE_RE.exec(reply);
  if (!match) return { caption: reply.trim(), imagePrompt: null };

  const caption = reply.slice(0, match.index).trim();
  const imagePrompt = stripWrappers(match[1] ?? "");
  return { caption, imagePrompt: imagePrompt || null };
}

/** Drop surrounding quotes/backticks the model sometimes wraps the prompt in. */
function stripWrappers(s: string): string {
  return s.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
}
