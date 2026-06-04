// In-process latency sampling for RPG button clicks. The bot records each click; the dashboard
// reads the rolling average from the SAME process (monolith — no network between them). Kept on
// globalThis so dev HMR doesn't wipe the samples.

export type ClickSample = {
  gateway: number; // Discord created the interaction → bot received it (clock-based, approximate)
  processing: number; // bot logic + DB, monotonic
  discord: number; // interaction.update/reply round-trip, monotonic
};

interface Store {
  samples: ClickSample[];
  max: number;
}

const g = globalThis as unknown as { __rpgClickMetrics?: Store };
const store: Store = g.__rpgClickMetrics ?? { samples: [], max: 100 };
g.__rpgClickMetrics = store;

export function recordClick(s: ClickSample): void {
  store.samples.push(s);
  if (store.samples.length > store.max) store.samples.shift();
}

export type RpgLatency = {
  count: number;
  avgGateway: number;
  avgProcessing: number;
  avgDiscord: number;
  avgTotal: number; // processing + discord (server-measured, accurate)
};

export function getLatency(): RpgLatency {
  const n = store.samples.length;
  if (!n) return { count: 0, avgGateway: 0, avgProcessing: 0, avgDiscord: 0, avgTotal: 0 };

  let gateway = 0;
  let processing = 0;
  let discord = 0;
  for (const s of store.samples) {
    gateway += s.gateway;
    processing += s.processing;
    discord += s.discord;
  }
  const avg = (x: number) => Math.round((x / n) * 10) / 10;
  return {
    count: n,
    avgGateway: avg(gateway),
    avgProcessing: avg(processing),
    avgDiscord: avg(discord),
    avgTotal: avg(processing + discord),
  };
}
