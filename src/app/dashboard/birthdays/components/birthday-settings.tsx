"use client";

import { useState } from "react";
import type { BirthdayConfig } from "@/server/features/birthdays/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function BirthdaySettings({ initial }: { initial: BirthdayConfig }) {
  const [c, setC] = useState<BirthdayConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof BirthdayConfig>(k: K, v: BirthdayConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/birthdays/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelId: c.channelId || null,
          roleId: c.roleId || null,
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
          Birthday announcements enabled
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block text-neutral-400">Announce channel ID</span>
            <input
              className={inputCls}
              value={c.channelId ?? ""}
              onChange={(e) => set("channelId", e.target.value || null)}
              placeholder="right-click channel → Copy ID"
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Birthday role ID (optional, for the day)</span>
            <input
              className={inputCls}
              value={c.roleId ?? ""}
              onChange={(e) => set("roleId", e.target.value || null)}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">Members set theirs with <code>/birthday set</code>.</p>
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
