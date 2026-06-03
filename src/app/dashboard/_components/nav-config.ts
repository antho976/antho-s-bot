export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  color: string; // tailwind text color for the section header
  items: NavItem[];
}

export interface NavCategory {
  key: string;
  label: string;
  icon: string;
  soon?: boolean;
  groups: NavGroup[];
}

/** Top-level categories (top bar) → grouped sub-nav (sidebar). */
export const NAV: NavCategory[] = [
  {
    key: "core",
    label: "Core",
    icon: "🛰️",
    groups: [
      {
        title: "Monitoring",
        color: "text-indigo-400",
        items: [
          { href: "/dashboard", label: "Overview", icon: "🏠" },
          { href: "/dashboard/health", label: "Bot Health", icon: "💓" },
          { href: "/dashboard/logs", label: "Logs", icon: "📜" },
        ],
      },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: "👥",
    groups: [
      {
        title: "Engagement",
        color: "text-amber-400",
        items: [
          { href: "/dashboard/notifications", label: "Stream Alerts", icon: "🔔" },
          { href: "/dashboard/welcome", label: "Welcome", icon: "👋" },
          { href: "/dashboard/leveling", label: "Leveling", icon: "⭐" },
        ],
      },
      {
        title: "Events",
        color: "text-pink-400",
        items: [
          { href: "/dashboard/giveaways", label: "Giveaways", icon: "🎉" },
          { href: "/dashboard/polls", label: "Polls", icon: "📊" },
          { href: "/dashboard/birthdays", label: "Birthdays", icon: "🎂" },
        ],
      },
      {
        title: "Pets",
        color: "text-emerald-400",
        items: [{ href: "/dashboard/pets", label: "Pets", icon: "🐾" }],
      },
      {
        title: "Moderation",
        color: "text-red-400",
        items: [
          { href: "/dashboard/automod", label: "Auto-Mod", icon: "🛡️" },
          { href: "/dashboard/member-logs", label: "Member Logs", icon: "📋" },
          { href: "/dashboard/support", label: "Support & Feedback", icon: "🎫" },
          { href: "/dashboard/reaction-roles", label: "Reaction Roles", icon: "✅" },
          { href: "/dashboard/starboard", label: "Highlights", icon: "🌟" },
        ],
      },
      {
        title: "Content",
        color: "text-sky-400",
        items: [{ href: "/dashboard/custom-commands", label: "Tags / Commands", icon: "💬" }],
      },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: "📈",
    groups: [
      {
        title: "Insights",
        color: "text-indigo-400",
        items: [{ href: "/dashboard/analytics", label: "Analytics", icon: "📈" }],
      },
    ],
  },
  {
    key: "config",
    label: "Config",
    icon: "⚙️",
    groups: [
      {
        title: "Management",
        color: "text-neutral-400",
        items: [{ href: "/dashboard/general", label: "General", icon: "⚙️" }],
      },
    ],
  },
  // Deferred-by-design (matches the roadmap): shown but not yet available.
  { key: "smartbot", label: "SmartBot", icon: "🤖", soon: true, groups: [] },
  { key: "rpg", label: "RPG", icon: "🎮", soon: true, groups: [] },
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
