import { EventEmitter } from "node:events";
import { lt } from "drizzle-orm";
import { db } from "@/server/db";
import { logs } from "@/server/db/schema";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  meta?: unknown;
  ts: number; // epoch ms (UTC)
}

const RING_SIZE = 500;

interface LogState {
  bus: EventEmitter;
  ring: LogEntry[];
}

// One bus + ring buffer per process, surviving HMR. The SSE route subscribes to the bus;
// the ring gives instant history on page load without a DB round-trip.
const g = globalThis as unknown as { __logState?: LogState };
const state: LogState = g.__logState ?? { bus: new EventEmitter(), ring: [] };
state.bus.setMaxListeners(0);
g.__logState = state;

function safeStringify(v: unknown): string | null {
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

async function persist(entry: LogEntry): Promise<void> {
  try {
    await db.insert(logs).values({
      level: entry.level,
      source: entry.source,
      message: entry.message,
      metaJson: entry.meta === undefined ? null : safeStringify(entry.meta),
    });
  } catch {
    // Logging must never throw out of the caller.
  }
}

export function log(
  level: LogLevel,
  source: string,
  message: string,
  meta?: unknown,
): void {
  const entry: LogEntry = { level, source, message, meta, ts: Date.now() };

  state.ring.push(entry);
  if (state.ring.length > RING_SIZE) {
    state.ring.splice(0, state.ring.length - RING_SIZE);
  }
  state.bus.emit("log", entry);

  const line = `[${level}] ${source}: ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.log(line);

  void persist(entry);
}

export const logger = {
  debug: (source: string, message: string, meta?: unknown) =>
    log("debug", source, message, meta),
  info: (source: string, message: string, meta?: unknown) =>
    log("info", source, message, meta),
  warn: (source: string, message: string, meta?: unknown) =>
    log("warn", source, message, meta),
  error: (source: string, message: string, meta?: unknown) =>
    log("error", source, message, meta),
};

/** Last `limit` log entries from the in-memory ring (newest last). */
export function recentLogs(limit = 100): LogEntry[] {
  return state.ring.slice(-limit);
}

/** Subscribe to live log entries; returns an unsubscribe function. */
export function subscribeLogs(listener: (entry: LogEntry) => void): () => void {
  state.bus.on("log", listener);
  return () => {
    state.bus.off("log", listener);
  };
}

/** Delete log rows older than `retentionDays` (called on boot; later, by the scheduler). */
export async function pruneOldLogs(retentionDays: number): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  await db.delete(logs).where(lt(logs.createdAt, cutoff));
}
