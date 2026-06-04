/** What each command does and who may run it — the single source for /commands and /help. */
export interface CommandInfo {
  name: string;
  summary: string;
  admin: boolean; // true → needs Manage Server
}

export const COMMAND_CATALOG: CommandInfo[] = [
  { name: "rpg", summary: "Open your adventure hub", admin: false },
  { name: "rank", summary: "See your level, XP and rank", admin: false },
  { name: "leaderboards", summary: "Top members by XP, voice, messages and time in the server", admin: false },
  { name: "commands", summary: "List every command and who can use it", admin: false },
  { name: "help", summary: "What this bot does and how to get started", admin: false },
  { name: "suggest", summary: "Send a suggestion to the server staff", admin: false },
  { name: "ticket", summary: "Open or close a support ticket", admin: false },
  { name: "addxp", summary: "Add or remove a member's XP", admin: true },
  { name: "poll", summary: "Post a reaction poll", admin: true },
  { name: "giveaway", summary: "Start a giveaway", admin: true },
  { name: "polllist", summary: "List recent polls", admin: true },
  { name: "giveawaylist", summary: "List recent giveaways", admin: true },
];
