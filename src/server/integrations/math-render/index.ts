import { renderWithCodecogs } from "./codecogs";

/**
 * Provider-agnostic LaTeX → image entry point. Today only CodeCogs is wired up (free, keyless),
 * but the dispatch is the seam where a self-hosted MathJax/KaTeX renderer could drop in later if
 * we want zero external dependency — the call site never changes.
 */
export const MATH_PROVIDERS = ["codecogs"] as const;
export type MathProvider = (typeof MATH_PROVIDERS)[number];

/** Render a LaTeX expression to PNG bytes. Returns null on any failure (caller is best-effort). */
export async function renderMath(latex: string): Promise<Buffer | null> {
  const clean = latex.trim();
  if (!clean) return null;
  return renderWithCodecogs(clean);
}

/** Whether math rendering can run. CodeCogs needs nothing, so it's always available. */
export function hasMathProvider(): boolean {
  return true;
}
