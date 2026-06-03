import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Base surface — a bordered panel. Consumers add their own padding/spacing. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface-1", className)} {...props} />;
}
