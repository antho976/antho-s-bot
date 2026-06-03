"use client";

import { useState } from "react";
import type { SupportConfig } from "@/server/features/support/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function SupportSettings({ initial }: { initial: SupportConfig }) {
  const [c, setC] = useState<SupportConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof SupportConfig>(k: K, v: SupportConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/support/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelId: c.channelId || null,
          staffRoleId: c.staffRoleId || null,
        }),
      });
      setMsg(res.ok ? "Saved." : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-4">
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
      <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={c.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Support tickets enabled
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block text-neutral-400">Tickets channel ID (threads are created here)</span>
            <input
              className={inputCls}
              value={c.channelId ?? ""}
              onChange={(e) => set("channelId", e.target.value || null)}
              placeholder="right-click channel → Copy ID"
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Staff role ID (pinged on new tickets)</span>
            <input
              className={inputCls}
              value={c.staffRoleId ?? ""}
              onChange={(e) => set("staffRoleId", e.target.value || null)}
              placeholder="right-click role → Copy ID"
            />
          </label>
        </div>

        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Save settings
        </button>
      </div>
    </section>
  );
}
