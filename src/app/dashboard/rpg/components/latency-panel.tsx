"use client";

import { useEffect, useState } from "react";
import type { RpgLatency } from "@/server/features/rpg/metrics";
import { Card } from "@/app/dashboard/_components/ui/card";

function Row({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted">
        {label}
        {hint && <span className="ml-1 text-xs text-faint">{hint}</span>}
      </span>
      <span className="tabular-nums text-text">{value}</span>
    </div>
  );
}

/** Live average latency per RPG button click, polled from the same process the bot runs in. */
export function LatencyPanel({ initial }: { initial: RpgLatency }) {
  const [m, setM] = useState<RpgLatency>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/rpg/metrics", { cache: "no-store" });
        if (res.ok && alive) setM((await res.json()) as RpgLatency);
      } catch {
        // ignore transient errors
      }
    };
    const id = setInterval(tick, 3_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const ms = (n: number) => `${n} ms`;

  return (
    <Card className="mt-6 space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text">Button latency</h2>
        <span className="text-xs text-faint">
          last {m.count} click{m.count === 1 ? "" : "s"}
        </span>
      </div>

      {m.count === 0 ? (
        <p className="text-sm text-muted">
          No clicks yet — open <code className="text-text">/rpg</code> in Discord and press some
          buttons. This updates live.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-text">{m.avgAck}</span>
            <span className="text-sm text-muted">ms to acknowledge (spinner clears)</span>
          </div>

          <div className="space-y-2 border-t border-border pt-3 text-sm">
            <Row label="Content update" hint="screen lands, no spinner" value={ms(m.avgContent)} />
            <Row label="Processing" hint="bot + DB" value={ms(m.avgProcessing)} />
            <Row label="Gateway" hint="Discord → bot, approx" value={ms(m.avgGateway)} />
          </div>

          <p className="text-xs text-faint">
            We ack with deferUpdate, so the button stops spinning at the time above — no loading
            state. The new screen fills in right after (content update), behind a live UI. Same
            Discord round-trip as before; it&apos;s just hidden now instead of shown as a spinner.
          </p>
        </>
      )}
    </Card>
  );
}
