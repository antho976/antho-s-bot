export type Priority = "urgent" | "high" | "medium" | "low";

const URGENT: RegExp[] = [
  /hack/i,
  /compromis/i,
  /\bscam/i,
  /steal/i,
  /urgent/i,
  /emergency/i,
  /can'?t (log|sign) ?in/i,
];

const HIGH: RegExp[] = [
  /\bban\b/i,
  /appeal/i,
  /payment/i,
  /billing/i,
  /charge/i,
  /refund/i,
  /broken/i,
  /not work/i,
];

const CATEGORIES: { name: string; re: RegExp }[] = [
  { name: "Billing", re: /(payment|billing|charge|refund|invoice|subscription)/i },
  { name: "Bug", re: /(bug|error|broken|crash|not work|glitch)/i },
  { name: "Report", re: /(report|abuse|harass|scam|spam|raid)/i },
  { name: "Account", re: /(account|login|sign ?in|password|\bban\b|appeal)/i },
  { name: "Question", re: /(how|what|where|why|question|help)/i },
];

/** Keyword-based triage (AI classification is a later upgrade). */
export function classify(text: string): { priority: Priority; category: string } {
  const priority: Priority = URGENT.some((r) => r.test(text))
    ? "urgent"
    : HIGH.some((r) => r.test(text))
      ? "high"
      : "medium";
  const category = CATEGORIES.find((c) => c.re.test(text))?.name ?? "General";
  return { priority, category };
}

export const PRIORITY_COLOR: Record<Priority, number> = {
  urgent: 0xef4444,
  high: 0xf59e0b,
  medium: 0x3b82f6,
  low: 0x64748b,
};
