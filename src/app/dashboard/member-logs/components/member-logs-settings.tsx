"use client";

import { useState } from "react";
import type { MemberLogConfig } from "@/server/features/member-logs/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

const TOGGLES: { key: keyof MemberLogConfig; label: string }[] = [
  { key: "logJoins", label: "Joins" },
  { key: "logLeaves", label: "Leaves" },
  { key: "logBans", label: "Bans" },
  { key: "logUnbans", label: "Unbans" },
  { key: "logNicknames", label: "Nickname changes" },
  { key: "logRoles", label: "Role changes" },
  { key: "logMessageEdits", label: "Message edits" },
  { key: "logMessageDeletes", label: "Message deletes" },
  { key: "logVoice", label: "Voice activity" },
];

export function MemberLogsSettings({ initial }: { initial: MemberLogConfig }) {
  const [c, setC] = useState<MemberLogConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof MemberLogConfig>(k: K, v: MemberLogConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/member-logs/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelId: c.channelId || null,
          logJoins: c.logJoins,
          logLeaves: c.logLeaves,
          logBans: c.logBans,
          logUnbans: c.logUnbans,
          logNicknames: c.logNicknames,
          logRoles: c.logRoles,
          logMessageEdits: c.logMessageEdits,
          logMessageDeletes: c.logMessageDeletes,
          logVoice: c.logVoice,
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
      <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={c.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Member logging enabled
        </label>

        <label className="block text-sm">
          <span className="text-neutral-400">Log channel ID</span>
          <input
            className={inputCls}
            value={c.channelId ?? ""}
            onChange={(e) => set("channelId", e.target.value || null)}
            placeholder="right-click channel → Copy ID"
          />
        </label>

        <div>
          <div className="mb-2 text-sm text-neutral-400">Events to log</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {TOGGLES.map((t) => (
              <label key={t.key} className="inline-flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={Boolean(c[t.key])}
                  onChange={(e) => set(t.key, e.target.checked as MemberLogConfig[typeof t.key])}
                  className="h-4 w-4 accent-indigo-600"
                />
                {t.label}
              </label>
            ))}
          </div>
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
