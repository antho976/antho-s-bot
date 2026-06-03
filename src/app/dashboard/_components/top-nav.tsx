"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV, activeCategoryKey } from "./nav-config";
import { useNavSearch } from "./nav-search";

const base = "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition";

export function TopNav() {
  const pathname = usePathname();
  const active = activeCategoryKey(pathname);
  const { query, setQuery } = useNavSearch();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-1 px-3 py-2">
      <div className="flex items-center gap-1 overflow-x-auto">
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
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-40 rounded-md border border-border-strong bg-surface-0 py-1.5 pl-8 pr-3 text-sm text-text outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/40 sm:w-52"
          />
        </div>
        <Link
          href="/dashboard/settings"
          title="Appearance settings"
          aria-label="Settings"
          className="rounded-md p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
