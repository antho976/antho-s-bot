"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/leveling", label: "Leveling" },
  { href: "/dashboard/welcome", label: "Welcome" },
  { href: "/dashboard/member-logs", label: "Member Logs" },
  { href: "/dashboard/automod", label: "Auto-mod" },
  { href: "/dashboard/health", label: "Bot Health" },
  { href: "/dashboard/logs", label: "Logs" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition ${
              active
                ? "bg-indigo-600 text-white"
                : "text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
