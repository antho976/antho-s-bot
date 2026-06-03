"use client";

import { useState } from "react";
import type { ScheduleEntry } from "@/server/features/notifications/schedule-queries";
import type { StreamChannel } from "@/server/features/notifications/queries";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";

const inputCls =
  "rounded-md border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

export function ScheduleManager({
  initial,
  channels,
}: {
  initial: ScheduleEntry[];
  channels: StreamChannel[];
}) {
  const [entries, setEntries] = useState<ScheduleEntry[]>(initial);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const [channelId, setChannelId] = useState<string>(channels[0] ? String(channels[0].id) : "");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [r1h, setR1h] = useState(true);
  const [r10m, setR10m] = useState(true);

  function channelLabel(id: number | null) {
    if (!id) return "no channel";
    const c = channels.find((x) => x.id === id);
    return c ? c.displayName || c.channelRef : `#${id}`;
  }

  async function add() {
    if (!when) return;
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId ? Number(channelId) : undefined,
          title: title.trim() || undefined,
          startsAt: new Date(when).getTime(),
          remind1h: r1h,
          remind10m: r10m,
        }),
      });
      if (!res.ok) return;
      const created = (await res.json()) as ScheduleEntry;
      setEntries((e) =>
        [...e, created].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      );
      setAdding(false);
      setTitle("");
      setWhen("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/schedule/${id}`, { method: "DELETE" });
      if (res.ok) setEntries((e) => e.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Upcoming streams</h2>
        {!adding && <Button onClick={() => setAdding(true)}>+ Add</Button>}
      </div>
      <p className="mt-1 text-sm text-muted">
        Set a date/time and we&apos;ll post a reminder 1 hour and 10 minutes before (to the chosen
        channel&apos;s Discord channel).
      </p>

      {adding && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-1 p-4">
          <label className="text-sm">
            <span className="block text-muted">Channel</span>
            <select className={inputCls} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              <option value="">— none —</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName || c.channelRef}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-muted">Title</span>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Stream title"
            />
          </label>
          <label className="text-sm">
            <span className="block text-muted">Starts at</span>
            <input
              type="datetime-local"
              className={inputCls}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </label>
          <Toggle checked={r1h} onChange={setR1h} label="1h" />
          <Toggle checked={r10m} onChange={setR10m} label="10m" />
          <div className="flex gap-2">
            <Button onClick={add} disabled={busy || !when}>
              Add
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-faint">No upcoming streams scheduled.</p>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-text">{e.title || "Stream"}</span>
              <span className="ml-2 text-muted">{new Date(e.startsAt).toLocaleString()}</span>
              <span className="ml-2 text-xs text-faint">
                {channelLabel(e.channelId)}
                {(e.remind1h || e.remind10m) &&
                  ` · remind ${[e.remind1h && "1h", e.remind10m && "10m"].filter(Boolean).join(" + ")}`}
              </span>
            </div>
            <Button variant="danger" size="sm" onClick={() => remove(e.id)} disabled={busy}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
