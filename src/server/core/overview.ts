import { listChannels } from "@/server/features/notifications/queries";
import { listSchedule } from "@/server/features/notifications/schedule-queries";
import { listTickets, getConfig as supportConfig } from "@/server/features/support/queries";
import { listGiveaways } from "@/server/features/giveaways/queries";
import { listPolls } from "@/server/features/polls/queries";
import { listSubmissions } from "@/server/features/pets/queries";
import { getConfig as welcomeConfig } from "@/server/features/welcome/queries";
import { getConfig as levelingConfig } from "@/server/features/leveling/queries";
import { getConfig as starboardConfig } from "@/server/features/starboard/queries";
import { getConfig as automodConfig } from "@/server/features/automod/queries";
import { getConfig as honeypotConfig } from "@/server/features/honeypot/queries";
import { getConfig as memberLogsConfig } from "@/server/features/member-logs/queries";
import { getConfig as birthdayConfig } from "@/server/features/birthdays/queries";

export interface OverviewData {
  counts: {
    streamChannels: number;
    upcomingStreams: number;
    openTickets: number;
    activeGiveaways: number;
    activePolls: number;
    pendingPets: number;
  };
  /** Per-module on/off, keyed by module key (see overview-grid). */
  modules: Record<string, boolean>;
}

/** One round-trip snapshot of every module's state + the headline counts for the Overview hub. */
export async function getOverview(guildId: string): Promise<OverviewData> {
  const g = guildId;

  const [
    channels,
    schedule,
    tickets,
    giveaways,
    polls,
    pets,
    support,
    welcome,
    leveling,
    starboard,
    automod,
    honeypot,
    memberLogs,
    birthdays,
  ] = await Promise.all([
    listChannels(g),
    listSchedule(g),
    listTickets(g, "open"),
    listGiveaways(g),
    listPolls(g),
    listSubmissions(g, "pending"),
    supportConfig(g),
    welcomeConfig(g),
    levelingConfig(g),
    starboardConfig(g),
    automodConfig(g),
    honeypotConfig(g),
    memberLogsConfig(g),
    birthdayConfig(g),
  ]);

  return {
    counts: {
      streamChannels: channels.length,
      upcomingStreams: schedule.length,
      openTickets: tickets.length,
      activeGiveaways: giveaways.filter((x) => x.status === "active").length,
      activePolls: polls.filter((x) => x.status === "active").length,
      pendingPets: pets.length,
    },
    modules: {
      notifications: channels.length > 0,
      welcome: Boolean(welcome.welcomeEnabled || welcome.goodbyeEnabled),
      leveling: leveling.enabled,
      starboard: starboard.enabled,
      support: support.enabled,
      automod: automod.enabled,
      honeypot: honeypot.enabled,
      memberLogs: memberLogs.enabled,
      birthdays: birthdays.enabled,
    },
  };
}
