import { logger } from "./logger";

type TickHandler = () => Promise<void> | void;

interface SchedulerState {
  handlers: Map<string, TickHandler>;
  timer: ReturnType<typeof setInterval> | null;
}

// One scheduler per process, surviving HMR. Handlers are keyed by name so reloading a module
// replaces its handler instead of stacking duplicates.
const g = globalThis as unknown as { __scheduler?: SchedulerState };
const state: SchedulerState = g.__scheduler ?? { handlers: new Map(), timer: null };
g.__scheduler = state;

const TICK_MS = 60_000; // once a minute — fine for stream reminders

/** Register (or replace) a named handler to run every tick. */
export function onTick(name: string, handler: TickHandler): void {
  state.handlers.set(name, handler);
}

async function runTick(): Promise<void> {
  for (const [name, handler] of state.handlers) {
    try {
      await handler();
    } catch (err) {
      logger.error("scheduler", `Tick handler "${name}" failed`, err);
    }
  }
}

/** Start the interval loop (idempotent). */
export function startScheduler(): void {
  if (state.timer) return;
  state.timer = setInterval(runTick, TICK_MS);
  logger.info("scheduler", `Started — ticking every ${TICK_MS / 1000}s.`);
}
