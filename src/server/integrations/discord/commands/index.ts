import type { BotCommand } from "./types";
import { ping } from "./ping";
import { ticket } from "./ticket";
import { birthday } from "./birthday";
import { pet } from "./pet";
import { rpg } from "./rpg";

// Static command list. Feature commands are added here as features land.
export const commands: BotCommand[] = [ping, ticket, birthday, pet, rpg];

export const commandMap = new Map<string, BotCommand>(
  commands.map((c) => [c.data.name, c]),
);
