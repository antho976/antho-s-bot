"use client";

import { useState } from "react";
import type { BlocklistEntry } from "@/server/features/automod/queries";
import { Button } from "@/app/dashboard/_components/ui/button";

const inputCls =
  "rounded-md border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

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
      <h2 className="text-lg font-semibold text-text">Scam domain blocklist</h2>
      <p className="mt-1 text-sm text-muted">
        Any message linking to these domains (or their subdomains) is treated as a scam.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-muted">Domain</span>
          <input
            className={inputCls}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="discord-nitro.gift"
          />
        </label>
        <label className="grow text-sm">
          <span className="block text-muted">Note (optional)</span>
          <input className={`${inputCls} w-full`} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <Button onClick={add} disabled={busy || !domain.trim()}>
          Add
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-faint">No blocked domains yet.</p>}
        {items.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm"
          >
            <span className="truncate">
              <span className="text-text">{b.domain}</span>
              {b.note && <span className="ml-2 text-xs text-faint">{b.note}</span>}
            </span>
            <Button variant="danger" size="sm" onClick={() => remove(b.id)} disabled={busy}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
