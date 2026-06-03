import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const selectBase =
  "w-full rounded-md border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(selectBase, className)} {...props} />;
}
