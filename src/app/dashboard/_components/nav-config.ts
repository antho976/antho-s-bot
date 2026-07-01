import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  HeartPulse,
  ScrollText,
  Users,
  Bell,
  Hand,
  Star,
  Gift,
  Vote,
  Cake,
  PawPrint,
  Shield,
  Crosshair,
  ClipboardList,
  LifeBuoy,
  SmilePlus,
  Sparkles,
  MessageSquareText,
  Megaphone,
  BarChart3,
  LineChart,
  Settings,
  SlidersHorizontal,
  Palette,
  Bot,
  Gamepad2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  color: string; // tailwind text color for the section header
  items: NavItem[];
}

export interface NavCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  groups: NavGroup[];
}

/** Top-level categories (top bar) → grouped sub-nav (sidebar). */
export const NAV: NavCategory[] = [
  {
    key: "core",
    label: "Core",
    icon: LayoutDashboard,
    groups: [
      {
        title: "Monitoring",
        color: "text-indigo-400",
        items: [
          { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/health", label: "Bot Health", icon: HeartPulse },
          { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
        ],
      },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: Users,
    groups: [
      {
        title: "Engagement",
        color: "text-amber-400",
        items: [
          { href: "/dashboard/notifications", label: "Stream Alerts", icon: Bell },
          { href: "/dashboard/welcome", label: "Welcome", icon: Hand },
          { href: "/dashboard/leveling", label: "Leveling", icon: Star },
        ],
      },
      {
        title: "Events",
        color: "text-pink-400",
        items: [
          { href: "/dashboard/giveaways", label: "Giveaways", icon: Gift },
          { href: "/dashboard/polls", label: "Polls", icon: Vote },
          { href: "/dashboard/birthdays", label: "Birthdays", icon: Cake },
        ],
      },
      {
        title: "Pets",
        color: "text-emerald-400",
        items: [{ href: "/dashboard/pets", label: "Pets", icon: PawPrint }],
      },
      {
        title: "Moderation",
        color: "text-red-400",
        items: [
          { href: "/dashboard/automod", label: "Auto-Mod", icon: Shield },
          { href: "/dashboard/honeypot", label: "Honeypot", icon: Crosshair },
          { href: "/dashboard/member-logs", label: "Member Logs", icon: ClipboardList },
          { href: "/dashboard/support", label: "Support & Feedback", icon: LifeBuoy },
          { href: "/dashboard/reaction-roles", label: "Reaction Roles", icon: SmilePlus },
          { href: "/dashboard/starboard", label: "Highlights", icon: Sparkles },
        ],
      },
      {
        title: "Content",
        color: "text-sky-400",
        items: [
          { href: "/dashboard/custom-commands", label: "Tags / Commands", icon: MessageSquareText },
          { href: "/dashboard/embed", label: "Embed Creator", icon: Megaphone },
        ],
      },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BarChart3,
    groups: [
      {
        title: "Insights",
        color: "text-indigo-400",
        items: [{ href: "/dashboard/analytics", label: "Analytics", icon: LineChart }],
      },
    ],
  },
  {
    key: "config",
    label: "Config",
    icon: Settings,
    groups: [
      {
        title: "Management",
        color: "text-muted",
        items: [
          { href: "/dashboard/general", label: "General", icon: SlidersHorizontal },
          { href: "/dashboard/settings", label: "Appearance", icon: Palette },
        ],
      },
    ],
  },
  // Deferred-by-design (matches the roadmap): shown but not yet available.
  { key: "smartbot", label: "SmartBot", icon: Bot, soon: true, groups: [] },
  {
    key: "rpg",
    label: "RPG",
    icon: Gamepad2,
    groups: [
      {
        title: "Game",
        color: "text-violet-400",
        items: [{ href: "/dashboard/rpg", label: "Settings", icon: Gamepad2 }],
      },
    ],
  },
];

/** Which top category owns the current path (defaults to core). */
export function activeCategoryKey(pathname: string): string {
  for (const cat of NAV) {
    for (const group of cat.groups) {
      if (group.items.some((it) => it.href === pathname)) return cat.key;
    }
  }
  return "core";
}
