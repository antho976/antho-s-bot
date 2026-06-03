"use client";

import { useState } from "react";
import type { SupportConfig } from "@/server/features/support/queries";
import { ChannelSelect, RoleSelect } from "@/app/dashboard/_components/guild-select";

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
            <span className="block text-neutral-400">Tickets channel (threads are created here)</span>
            <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Staff role (pinged on new tickets)</span>
            <RoleSelect value={c.staffRoleId ?? ""} onChange={(v) => set("staffRoleId", v || null)} />
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
