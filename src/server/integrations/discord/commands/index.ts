import type { BotCommand } from "./types";
import { ping } from "./ping";

// Static list for Phase 0. When the feature registry lands (Phase 1), feature modules
// contribute their own commands here.
export const commands: BotCommand[] = [ping];

export const commandMap = new Map<string, BotCommand>(
  commands.map((c) => [c.data.name, c]),
);
