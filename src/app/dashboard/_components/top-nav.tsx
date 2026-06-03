"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, activeCategoryKey } from "./nav-config";

export function TopNav() {
  const pathname = usePathname();
  const active = activeCategoryKey(pathname);

  return (
    <header className="flex items-center gap-1 overflow-x-auto border-b border-neutral-800 bg-neutral-900 px-3 py-2">
      <span className="mr-3 shrink-0 px-2 text-sm font-semibold text-neutral-200">antho&apos;s bot</span>
      {NAV.map((cat) => {
        const isActive = cat.key === active;
        const firstHref = cat.groups[0]?.items[0]?.href;
        const base =
          "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition";

        if (cat.soon || !firstHref) {
          return (
            <span
              key={cat.key}
              title="Coming soon"
              className={`${base} cursor-not-allowed text-neutral-600`}
            >
              <span>{cat.icon}</span>
              {cat.label}
              <span className="ml-1 rounded bg-neutral-800 px-1 text-[10px] text-neutral-500">soon</span>
            </span>
          );
        }
        return (
          <Link
            key={cat.key}
            href={firstHref}
            className={`${base} ${
              isActive ? "bg-indigo-600 text-white" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </Link>
        );
      })}
    </header>
  );
}
