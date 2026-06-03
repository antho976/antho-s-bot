import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Compact metric tile — label, big tabular value, optional icon. */
export function StatTile({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "bad";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "bad" ? "text-red-400" : "text-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}
