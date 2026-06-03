"use client";

import { useState } from "react";
import type { WelcomeBackground } from "@/server/features/welcome/queries";
import { Button } from "@/app/dashboard/_components/ui/button";

const inputCls =
  "rounded-md border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

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
      <h2 className="text-lg font-semibold text-text">Backgrounds</h2>
      <p className="mt-1 text-sm text-muted">
        Add image URLs for the artwork. With &quot;random background&quot; on, one is picked each time.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grow text-sm">
          <span className="block text-muted">Image URL</span>
          <input
            className={`${inputCls} w-full`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/background.png"
          />
        </label>
        <label className="text-sm">
          <span className="block text-muted">Use for</span>
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="both">Both</option>
            <option value="welcome">Welcome</option>
            <option value="goodbye">Goodbye</option>
          </select>
        </label>
        <Button onClick={add} disabled={busy || !url.trim()}>
          Add
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-faint">No backgrounds yet.</p>}
        {items.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm"
          >
            <span className="truncate text-muted">{b.url}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-faint">{b.kind}</span>
              <Button variant="danger" size="sm" onClick={() => remove(b.id)} disabled={busy}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
