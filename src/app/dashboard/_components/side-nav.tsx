"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, activeCategoryKey } from "./nav-config";

export function SideNav() {
  const pathname = usePathname();
  const cat = NAV.find((c) => c.key === activeCategoryKey(pathname)) ?? NAV[0];

  return (
    <nav className="flex flex-col gap-4 px-3 py-4">
      {cat.groups.map((group) => (
        <div key={group.title}>
          <div className={`px-2 text-[11px] font-semibold uppercase tracking-wide ${group.color}`}>
            {group.title}
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                    isActive ? "bg-indigo-600/90 text-white" : "text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  <span className="w-4 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
