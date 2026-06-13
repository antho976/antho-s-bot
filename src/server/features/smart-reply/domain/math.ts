// Pure helpers for the math-image path. Two stages, deliberately split:
//   1. detectMathRequest() — a CHEAP gate on the triggering message. It fires on a "make a
//      picture / show me"-style ask OR on obviously mathematical content, and only decides
//      whether to *offer* the model the option. Intentionally loose; the model is the precise
//      decider (it emits a MATH: line only when there's actually an equation worth rendering).
//   2. splitMathBlock() — pulls the model's `MATH: <latex>` line back out of its reply.

// "Show it as an image" nouns/verbs (kept specific — broad words like "make/show" would gate on
// half of all chat).
const REQUEST_RE = /\b(?:picture|image|photo|draw|sketch|render|graph|plot)\b/i;
// Words that signal the topic is math.
const MATH_WORD_RE =
  /\b(?:math|maths|equation|formula|solve|simplify|integral|integrate|derivative|differentiate|factor|expand|quadratic|polynomial|matrix|fraction|calculus|algebra|sqrt|squared|cubed|theorem)\b/i;
// Bare mathematical notation: "3x+2=8", exponents, common symbols, fractions.
const MATH_SYM_RE = /\d\s*[+\-*/^=]\s*[\d(a-z]|[√∫∑∏πθ≤≥≠±]|\^\s*\d|\b\d+\s*\/\s*\d+\b/i;

/** Cheap gate: does this message look like a request to show some math? */
export function detectMathRequest(raw: string): boolean {
  const text = (raw ?? "").trim();
  if (!text) return false;
  return MATH_WORD_RE.test(text) || MATH_SYM_RE.test(text) || REQUEST_RE.test(text);
}

export interface SplitMath {
  caption: string; // conversational text to post alongside the equation (may be empty)
  latex: string | null; // the model's LaTeX, or null if it emitted no MATH line
}

// Match a line like `MATH: x = \frac{...}`, tolerating markdown bold/quoting the model adds.
const MATH_LINE_RE = /^[\s>*_`]*math[\s*_`]*:[\s*_`]*(.+?)[\s*_`]*$/im;

/** Separate the model's `MATH: …` LaTeX from the chat text that precedes it. */
export function splitMathBlock(reply: string): SplitMath {
  const match = MATH_LINE_RE.exec(reply);
  if (!match) return { caption: reply.trim(), latex: null };

  const caption = reply.slice(0, match.index).trim();
  const latex = stripMathWrappers(match[1] ?? "");
  return { caption, latex: latex || null };
}

/** Drop delimiters the model wraps LaTeX in: $…$, $$…$$, \[ \], \( \), backticks. */
function stripMathWrappers(s: string): string {
  return s
    .trim()
    .replace(/^\\[[(]\s*|\s*\\[\])]$/g, "") // \[ \] and \( \)
    .replace(/^\$+|\$+$/g, "") // $ and $$
    .replace(/^`+|`+$/g, "") // backticks
    .trim();
}
