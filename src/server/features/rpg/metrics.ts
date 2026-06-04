// In-process latency sampling for RPG button clicks. The bot records each click; the dashboard
// reads the rolling average from the SAME process (monolith — no network between them). Kept on
// globalThis so dev HMR doesn't wipe the samples.
//
// Since we ack with deferUpdate() then editReply(), the click has two distinct moments:
//   - ack:     when deferUpdate resolves → the button's spinner clears (what the user *feels*)
//   - content: when editReply resolves   → the new screen lands (no spinner, behind a live UI)

export type ClickSample = {
  gateway: number; // Discord created the interaction → bot received it (clock-based, approximate)
  ack: number; // deferUpdate round-trip — spinner clears here
  processing: number; // bot logic + DB, after the ack (hidden from the user)
  content: number; // editReply round-trip — new screen lands here
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
  avgAck: number;
  avgProcessing: number;
  avgContent: number;
};

export function getLatency(): RpgLatency {
  const n = store.samples.length;
  if (!n) return { count: 0, avgGateway: 0, avgAck: 0, avgProcessing: 0, avgContent: 0 };

  let gateway = 0;
  let ack = 0;
  let processing = 0;
  let content = 0;
  for (const s of store.samples) {
    gateway += s.gateway;
    ack += s.ack;
    processing += s.processing;
    content += s.content;
  }
  const avg = (x: number) => Math.round((x / n) * 10) / 10;
  return {
    count: n,
    avgGateway: avg(gateway),
    avgAck: avg(ack),
    avgProcessing: avg(processing),
    avgContent: avg(content),
  };
}
