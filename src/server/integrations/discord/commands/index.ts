import type { BotCommand } from "./types";
import { rpg } from "./rpg";
import { rank } from "./rank";
import { leaderboards } from "./leaderboards";
import { commandList } from "./command-list";
import { help } from "./help";
import { suggest } from "./suggest";
import { ticket } from "./ticket";
import { addxp } from "./addxp";
import { poll } from "./poll";
import { giveaway } from "./giveaway";
import { polllist } from "./polllist";
import { giveawaylist } from "./giveawaylist";
import { ai } from "./ai";

// Static command list. Order here is the order they register with Discord.
export const commands: BotCommand[] = [
  rpg,
  rank,
  leaderboards,
  commandList,
  help,
  suggest,
  ticket,
  addxp,
  poll,
  giveaway,
  polllist,
  giveawaylist,
  ai,
];

export const commandMap = new Map<string, BotCommand>(
  commands.map((c) => [c.data.name, c]),
);
