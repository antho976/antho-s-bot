"use client";

import { useState } from "react";
import type { WelcomeBackground } from "@/server/features/welcome/queries";

const inputCls =
  "rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function BackgroundsManager({ initial }: { initial: WelcomeBackground[] }) {
  const [items, setItems] = useState<WelcomeBackground[]>(initial);
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("both");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/welcome/backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), kind }),
      });
      if (res.ok) {
        const created = (await res.json()) as WelcomeBackground;
        setItems((i) => [...i, created]);
        setUrl("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/welcome/backgrounds/${id}`, { method: "DELETE" });
      if (res.ok) setItems((i) => i.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Backgrounds</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Add image URLs for the artwork. With &quot;random background&quot; on, one is picked each time.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grow text-sm">
          <span className="block text-neutral-400">Image URL</span>
          <input
            className={`${inputCls} w-full`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/background.png"
          />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Use for</span>
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="both">Both</option>
            <option value="welcome">Welcome</option>
            <option value="goodbye">Goodbye</option>
          </select>
        </label>
        <button
          onClick={add}
          disabled={busy || !url.trim()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-neutral-500">No backgrounds yet.</p>}
        {items.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm"
          >
            <span className="truncate text-neutral-300">{b.url}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-neutral-500">{b.kind}</span>
              <button
                onClick={() => remove(b.id)}
                disabled={busy}
                className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
