"use client";

import { useState } from "react";
import type { StarboardConfig } from "@/server/features/starboard/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function StarboardSettings({ initial }: { initial: StarboardConfig }) {
  const [c, setC] = useState<StarboardConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof StarboardConfig>(k: K, v: StarboardConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/starboard/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          emoji: c.emoji,
          threshold: c.threshold,
          channelId: c.channelId || null,
          selfStar: c.selfStar,
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
          Highlights enabled
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="block text-neutral-400">Emoji</span>
            <input className={inputCls} value={c.emoji} onChange={(e) => set("emoji", e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Stars needed</span>
            <input
              type="number"
              className={inputCls}
              value={c.threshold}
              onChange={(e) => set("threshold", Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Highlights channel</span>
            <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={c.selfStar}
            onChange={(e) => set("selfStar", e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Count the author&apos;s own star
        </label>

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
