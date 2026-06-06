import { logger } from "@/server/core/logger";

// A tiny FIFO queue that runs reply jobs one at a time. A burst of pings would otherwise fire
// concurrent OpenRouter calls — tripping free-tier rate limits and letting replies land out of
// order. Serializing them keeps the bot calm: one generation in flight, answered in order.
//
// Process-global for now (the bot is single-guild today). If it grows multi-guild and one busy
// server starts starving others, this is the seam to swap for a per-guild queue.

type Job = () => Promise<void>;

const MAX_PENDING = 10; // drop beyond this so we never reply to long-stale messages

const queue: Job[] = [];
let running = false;

/** Enqueue a reply job. Returns false if the queue is full (job dropped). */
export function enqueueReply(job: Job): boolean {
  if (queue.length >= MAX_PENDING) return false;
  queue.push(job);
  void drain();
  return true;
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await job();
      } catch (err) {
        logger.warn("smart-reply", "Queued reply job failed", err);
      }
    }
  } finally {
    running = false;
  }
}

/** Jobs currently waiting to run (diagnostics). */
export function queueDepth(): number {
  return queue.length;
}
