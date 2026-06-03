"use client";

import { useState } from "react";
import type { Poll } from "@/server/features/polls/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

function optionCount(json: string): number {
  try {
    return (JSON.parse(json) as string[]).length;
  } catch {
    return 0;
  }
}

export function PollsManager({ initial }: { initial: Poll[] }) {
  const [items, setItems] = useState<Poll[]>(initial);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [channelId, setChannelId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [durationMin, setDurationMin] = useState(0);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  }

  async function create() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!channelId.trim() || !question.trim() || opts.length < 2) {
      flash("Need a channel, a question, and 2+ options.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim(),
          question: question.trim(),
          options: opts,
          multi,
          durationMin: Number(durationMin) || 0,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash(typeof data?.error === "string" ? data.error : "Could not create.");
        return;
      }
      setItems((i) => [data as Poll, ...i]);
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
      flash("Poll posted.");
    } finally {
      setBusy(false);
    }
  }

  async function end(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/polls/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setItems((i) => i.map((x) => (x.id === id ? (data as Poll) : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {toast && (
        <div className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm">{toast}</div>
      )}

      {creating ? (
        <div className="space-y-3 rounded-xl border border-indigo-900/60 bg-neutral-900 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block text-neutral-400">Question</span>
              <input className={inputCls} value={question} onChange={(e) => setQuestion(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Channel ID</span>
              <input className={inputCls} value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-neutral-400">Options (2–10)</div>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={inputCls}
                  value={o}
                  onChange={(e) => setOptions((os) => os.map((x, idx) => (idx === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions((os) => os.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded-md border border-neutral-700 px-2 text-neutral-400 hover:bg-neutral-800"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                onClick={() => setOptions((os) => [...os, ""])}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                + Add option
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              Multiple choice
            </label>
            <label className="text-sm">
              <span className="text-neutral-400">Duration (min, 0 = manual)</span>{" "}
              <input
                type="number"
                className="ml-1 w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={create} disabled={busy} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              Post poll
            </button>
            <button onClick={() => setCreating(false)} className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          + New poll
        </button>
      )}

      {items.length === 0 && !creating && <p className="text-sm text-neutral-500">No polls yet.</p>}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">📊 {p.question}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {optionCount(p.optionsJson)} options
                  {p.multi ? " · multi" : ""} · {p.status}
                  {p.status === "active" && p.endsAt ? ` · ends ${new Date(p.endsAt).toLocaleString()}` : ""}
                </span>
              </div>
              {p.status === "active" && (
                <button onClick={() => end(p.id)} disabled={busy} className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800">
                  End now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
