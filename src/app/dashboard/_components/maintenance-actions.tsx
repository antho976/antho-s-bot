"use client";

import { useState } from "react";
import { useToast } from "./ui/toast";
import { useConfirm } from "./ui/confirm";

const ACTIONS = [
  { key: "reset-live", label: "Reset live state", desc: "Clear stuck 'is live' flags" },
  { key: "reset-schedule", label: "Reset schedule", desc: "Remove all upcoming streams" },
  { key: "reset-daily", label: "Reset daily stats", desc: "Zero today's counters" },
] as const;

export function MaintenanceActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const { success } = useToast();
  const confirm = useConfirm();

  async function run(action: string, label: string) {
    if (
      !(await confirm({
        title: "Run maintenance?",
        message: `${label} — this can't be undone.`,
        confirmLabel: "Run",
        danger: true,
      }))
    ) {
      return;
    }
    setBusy(action);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      success(data?.message ?? "Done.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-surface-1 p-5">
      <h2 className="text-sm font-semibold text-text">Maintenance</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            onClick={() => run(a.key, a.label)}
            disabled={busy !== null}
            className="rounded-lg border border-border bg-surface-0 p-3 text-left transition hover:border-border-strong active:scale-[0.98] disabled:opacity-50"
          >
            <div className="text-sm font-medium text-text">{a.label}</div>
            <div className="mt-0.5 text-xs text-faint">{a.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
