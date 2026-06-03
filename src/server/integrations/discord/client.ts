import { Client, GatewayIntentBits, Partials } from "discord.js";

/**
 * Holds the single discord.js client for the whole process and exposes read-only status.
 * Kept on globalThis so Next.js HMR in dev doesn't create a second gateway connection.
 */
interface BotState {
  client: Client | null;
  ready: boolean;
  startedAt: number | null;
}

const g = globalThis as unknown as { __botState?: BotState };
const state: BotState = g.__botState ?? {
  client: null,
  ready: false,
  startedAt: null,
};
g.__botState = state;

export function createBotClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // privileged — enable in Dev Portal
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // privileged — enable in Dev Portal
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildModeration, // ban/unban logs
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.GuildMember,
      Partials.User,
    ],
  });
}

export function setBotState(patch: Partial<BotState>): void {
  Object.assign(state, patch);
}

export function getClient(): Client | null {
  return state.client;
}

export interface BotStatus {
  ready: boolean;
  ping: number | null;
  guilds: number | null;
  startedAt: number | null;
}

export function getBotStatus(): BotStatus {
  const c = state.client;
  const live = Boolean(c && state.ready);
  return {
    ready: state.ready,
    ping: live ? Math.round(c!.ws.ping) : null,
    guilds: live ? c!.guilds.cache.size : null,
    startedAt: state.startedAt,
  };
}
