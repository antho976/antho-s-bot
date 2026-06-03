"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV, activeCategoryKey } from "./nav-config";

const base = "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition";

export function TopNav() {
  const pathname = usePathname();
  const active = activeCategoryKey(pathname);

  return (
    <header className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface-1 px-3 py-2">
      <span className="mr-3 shrink-0 px-2 text-sm font-semibold text-text">antho&apos;s bot</span>
      {NAV.map((cat) => {
        const Icon = cat.icon;
        const firstHref = cat.groups[0]?.items[0]?.href;

        if (cat.soon || !firstHref) {
          return (
            <span
              key={cat.key}
              title="Coming soon"
              className={cn(base, "cursor-not-allowed text-faint")}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
              <span className="ml-1 rounded bg-surface-2 px-1 text-[10px] text-faint">soon</span>
            </span>
          );
        }
        return (
          <Link
            key={cat.key}
            href={firstHref}
            className={cn(
              base,
              cat.key === active
                ? "bg-accent text-accent-contrast"
                : "text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon className="h-4 w-4" />
            {cat.label}
          </Link>
        );
      })}
    </header>
  );
}
