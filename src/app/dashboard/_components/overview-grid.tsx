import Link from "next/link";
import {
  Bell,
  CalendarClock,
  LifeBuoy,
  Gift,
  Vote,
  PawPrint,
  Hand,
  Star,
  Sparkles,
  Shield,
  Crosshair,
  ClipboardList,
  Cake,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "./ui/badge";
import type { OverviewData } from "@/server/core/overview";

const COUNTS: { key: keyof OverviewData["counts"]; label: string; icon: LucideIcon; href: string }[] = [
  { key: "streamChannels", label: "Streams watched", icon: Bell, href: "/dashboard/notifications" },
  { key: "upcomingStreams", label: "Upcoming", icon: CalendarClock, href: "/dashboard/notifications" },
  { key: "openTickets", label: "Open tickets", icon: LifeBuoy, href: "/dashboard/support" },
  { key: "activeGiveaways", label: "Giveaways", icon: Gift, href: "/dashboard/giveaways" },
  { key: "activePolls", label: "Active polls", icon: Vote, href: "/dashboard/polls" },
  { key: "pendingPets", label: "Pets pending", icon: PawPrint, href: "/dashboard/pets" },
];

const MODULES: { key: string; label: string; icon: LucideIcon; href: string }[] = [
  { key: "notifications", label: "Stream Alerts", icon: Bell, href: "/dashboard/notifications" },
  { key: "welcome", label: "Welcome", icon: Hand, href: "/dashboard/welcome" },
  { key: "leveling", label: "Leveling", icon: Star, href: "/dashboard/leveling" },
  { key: "starboard", label: "Highlights", icon: Sparkles, href: "/dashboard/starboard" },
  { key: "support", label: "Support", icon: LifeBuoy, href: "/dashboard/support" },
  { key: "automod", label: "Auto-Mod", icon: Shield, href: "/dashboard/automod" },
  { key: "honeypot", label: "Honeypot", icon: Crosshair, href: "/dashboard/honeypot" },
  { key: "memberLogs", label: "Member Logs", icon: ClipboardList, href: "/dashboard/member-logs" },
  { key: "birthdays", label: "Birthdays", icon: Cake, href: "/dashboard/birthdays" },
];

export function OverviewGrid({ data }: { data: OverviewData }) {
  return (
    <>
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">At a glance</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COUNTS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                href={c.href}
                className="group rounded-xl border border-border bg-surface-1 p-4 transition hover:border-border-strong"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-faint">{c.label}</span>
                  <Icon className="h-4 w-4 text-faint transition group-hover:text-accent" />
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-text">
                  {data.counts[c.key]}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">Modules</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const on = data.modules[m.key];
            return (
              <Link
                key={m.key}
                href={m.href}
                className="group flex items-center justify-between rounded-xl border border-border bg-surface-1 p-4 transition hover:border-border-strong"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={cn("h-5 w-5", on ? "text-accent" : "text-faint")} />
                  <span className="text-sm font-medium text-text">{m.label}</span>
                </span>
                <Badge tone={on ? "success" : "neutral"}>{on ? "On" : "Off"}</Badge>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
