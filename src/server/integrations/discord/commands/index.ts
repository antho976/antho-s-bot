import type { BotCommand } from "./types";
import { ping } from "./ping";
import { ticket } from "./ticket";

// Static command list. Feature commands are added here as features land.
export const commands: BotCommand[] = [ping, ticket];

export const commandMap = new Map<string, BotCommand>(
  commands.map((c) => [c.data.name, c]),
);
