"use client";

import { useState } from "react";

const ACTIONS = [
  { key: "reset-live", label: "Reset live state", desc: "Clear stuck 'is live' flags" },
  { key: "reset-schedule", label: "Reset schedule", desc: "Remove all upcoming streams" },
  { key: "reset-daily", label: "Reset daily stats", desc: "Zero today's counters" },
] as const;

export function MaintenanceActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(action: string) {
    if (!window.confirm(`Run "${action}"? This can't be undone.`)) return;
    setBusy(action);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setMsg(data?.message ?? "Done.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-sm font-semibold text-neutral-200">Maintenance</h2>
      {msg && <div className="mt-2 text-sm text-emerald-400">{msg}</div>}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            onClick={() => run(a.key)}
            disabled={busy !== null}
            className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-left transition hover:border-neutral-600 disabled:opacity-50"
          >
            <div className="text-sm font-medium text-neutral-100">{a.label}</div>
            <div className="mt-0.5 text-xs text-neutral-500">{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
