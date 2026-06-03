"use client";

import { useState } from "react";
import type { ScheduleEntry } from "@/server/features/notifications/schedule-queries";
import type { StreamChannel } from "@/server/features/notifications/queries";

const inputCls =
  "rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

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
        <h2 className="text-lg font-semibold">Upcoming streams</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Add
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-400">
        Set a date/time and we&apos;ll post a reminder 1 hour and 10 minutes before (to the
        chosen channel&apos;s Discord channel).
      </p>

      {adding && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-indigo-900/60 bg-neutral-900 p-4">
          <label className="text-sm">
            <span className="block text-neutral-400">Channel</span>
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
            <span className="block text-neutral-400">Title</span>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stream title" />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Starts at</span>
            <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-neutral-300">
            <input type="checkbox" checked={r1h} onChange={(e) => setR1h(e.target.checked)} className="h-4 w-4 accent-indigo-600" /> 1h
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-neutral-300">
            <input type="checkbox" checked={r10m} onChange={(e) => setR10m(e.target.checked)} className="h-4 w-4 accent-indigo-600" /> 10m
          </label>
          <div className="flex gap-2">
            <button onClick={add} disabled={busy || !when} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">Add</button>
            <button onClick={() => setAdding(false)} className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-neutral-500">No upcoming streams scheduled.</p>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm"
          >
            <div>
              <span className="font-medium">{e.title || "Stream"}</span>
              <span className="ml-2 text-neutral-400">{new Date(e.startsAt).toLocaleString()}</span>
              <span className="ml-2 text-xs text-neutral-500">
                {channelLabel(e.channelId)}
                {(e.remind1h || e.remind10m) &&
                  ` · remind ${[e.remind1h && "1h", e.remind10m && "10m"].filter(Boolean).join(" + ")}`}
              </span>
            </div>
            <button
              onClick={() => remove(e.id)}
              disabled={busy}
              className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
