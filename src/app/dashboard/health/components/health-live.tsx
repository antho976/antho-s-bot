"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { HealthSnapshot } from "@/server/core/health";
import { formatBytes, formatUptime } from "@/lib/format";

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        ok ? "bg-emerald-500" : "bg-red-500"
      }`}
    />
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-400">{label}</span>
      <span className="text-neutral-100">{value}</span>
    </div>
  );
}

const API_LABEL: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  not_configured: "Not configured",
};

export function HealthLive({ initial }: { initial: HealthSnapshot }) {
  const [health, setHealth] = useState(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok && alive) setHealth((await res.json()) as HealthSnapshot);
      } catch {
        // ignore transient errors
      }
    };
    const id = setInterval(tick, 5_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Bot">
        <Row
          label="Status"
          value={
            <span className="inline-flex items-center gap-2">
              <Dot ok={health.discord.ready} />
              {health.discord.ready ? "Online" : "Offline"}
            </span>
          }
        />
        <Row label="Gateway ping" value={health.discord.ping != null ? `${health.discord.ping} ms` : "—"} />
        <Row label="Guilds" value={health.discord.guilds ?? "—"} />
      </Card>

      <Card title="Database">
        <Row
          label="Connection"
          value={
            <span className="inline-flex items-center gap-2">
              <Dot ok={health.db.ok} />
              {health.db.ok ? "OK" : "Down"}
            </span>
          }
        />
      </Card>

      <Card title="APIs">
        <Row label="Discord" value={API_LABEL[health.apis.discord]} />
        <Row label="Twitch" value={API_LABEL[health.apis.twitch]} />
        <Row label="YouTube" value={API_LABEL[health.apis.youtube]} />
      </Card>

      <Card title="Memory">
        <Row label="RSS" value={formatBytes(health.memory.rss)} />
        <Row label="Heap used" value={formatBytes(health.memory.heapUsed)} />
        <Row label="Heap total" value={formatBytes(health.memory.heapTotal)} />
      </Card>

      <Card title="Process">
        <Row label="Uptime" value={formatUptime(health.uptimeSec)} />
        <Row label="Node" value={health.runtime.node} />
        <Row label="Platform" value={health.runtime.platform} />
        <Row label="Env" value={health.runtime.env} />
      </Card>
    </div>
  );
}
