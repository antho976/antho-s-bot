"use client";

import { useState } from "react";
import type { BlocklistEntry } from "@/server/features/automod/queries";

const inputCls =
  "rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function BlocklistManager({ initial }: { initial: BlocklistEntry[] }) {
  const [items, setItems] = useState<BlocklistEntry[]>(initial);
  const [domain, setDomain] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!domain.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/automod/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), note: note.trim() || undefined }),
      });
      if (res.ok) {
        const created = (await res.json()) as BlocklistEntry;
        setItems((i) => [...i, created]);
        setDomain("");
        setNote("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/automod/blocklist/${id}`, { method: "DELETE" });
      if (res.ok) setItems((i) => i.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Scam domain blocklist</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Any message linking to these domains (or their subdomains) is treated as a scam.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-neutral-400">Domain</span>
          <input
            className={inputCls}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="discord-nitro.gift"
          />
        </label>
        <label className="grow text-sm">
          <span className="block text-neutral-400">Note (optional)</span>
          <input className={`${inputCls} w-full`} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          onClick={add}
          disabled={busy || !domain.trim()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-neutral-500">No blocked domains yet.</p>}
        {items.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm"
          >
            <span className="truncate">
              <span className="text-neutral-100">{b.domain}</span>
              {b.note && <span className="ml-2 text-xs text-neutral-500">{b.note}</span>}
            </span>
            <button
              onClick={() => remove(b.id)}
              disabled={busy}
              className="shrink-0 rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
