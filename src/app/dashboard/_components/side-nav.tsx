"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Input } from "./ui/input";
import { NAV, activeCategoryKey, type NavItem } from "./nav-config";

const itemBase = "group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition";

export function SideNav() {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const cat = NAV.find((c) => c.key === activeCategoryKey(pathname)) ?? NAV[0];

  const allItems = NAV.flatMap((c) => c.groups.flatMap((g) => g.items));
  const results = query ? allItems.filter((it) => it.label.toLowerCase().includes(query)) : null;

  function itemClass(href: string) {
    return cn(
      itemBase,
      pathname === href
        ? "bg-accent text-accent-contrast"
        : "text-muted hover:bg-surface-2 hover:text-text",
    );
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} className={itemClass(item.href)}>
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-4 px-3 py-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />

      {results ? (
        <div className="flex flex-col gap-0.5">
          {results.length === 0 && <p className="px-2 text-sm text-faint">No matches.</p>}
          {results.map(renderItem)}
        </div>
      ) : (
        cat.groups.map((group) => (
          <div key={group.title}>
            <div className={cn("px-2 text-[11px] font-semibold uppercase tracking-wide", group.color)}>
              {group.title}
            </div>
            <div className="mt-1 flex flex-col gap-0.5">{group.items.map(renderItem)}</div>
          </div>
        ))
      )}
    </nav>
  );
}
