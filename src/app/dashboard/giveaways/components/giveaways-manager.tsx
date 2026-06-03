"use client";

import { useState } from "react";
import type { Giveaway } from "@/server/features/giveaways/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

const STATUS_CLR: Record<string, string> = {
  active: "text-emerald-400",
  ended: "text-neutral-400",
  cancelled: "text-red-400",
};

function winnerCount(json: string | null): number {
  try {
    return json ? (JSON.parse(json) as string[]).length : 0;
  } catch {
    return 0;
  }
}

export function GiveawaysManager({ initial }: { initial: Giveaway[] }) {
  const [items, setItems] = useState<Giveaway[]>(initial);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [channelId, setChannelId] = useState("");
  const [prize, setPrize] = useState("");
  const [winnersCount, setWinnersCount] = useState(1);
  const [durationMin, setDurationMin] = useState(60);
  const [pingRoleId, setPingRoleId] = useState("");
  const [minLevel, setMinLevel] = useState(0);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  }

  async function create() {
    if (!channelId.trim() || !prize.trim()) {
      flash("Need a channel and a prize.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/giveaways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim(),
          prize: prize.trim(),
          winnersCount: Number(winnersCount) || 1,
          durationMin: Number(durationMin) || 60,
          pingRoleId: pingRoleId.trim() || null,
          minLevel: Number(minLevel) || 0,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash(typeof data?.error === "string" ? data.error : "Could not create.");
        return;
      }
      setItems((i) => [data as Giveaway, ...i]);
      setCreating(false);
      setPrize("");
      flash("Giveaway started.");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: number, action: "end" | "cancel") {
    setBusy(true);
    try {
      const res = await fetch(`/api/giveaways/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setItems((i) => i.map((x) => (x.id === id ? (data as Giveaway) : x)));
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
              <span className="block text-neutral-400">Prize</span>
              <input className={inputCls} value={prize} onChange={(e) => setPrize(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Channel ID</span>
              <input className={inputCls} value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              <span className="block text-neutral-400">Winners</span>
              <input type="number" className={inputCls} value={winnersCount} onChange={(e) => setWinnersCount(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Duration (min)</span>
              <input type="number" className={inputCls} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Min level</span>
              <input type="number" className={inputCls} value={minLevel} onChange={(e) => setMinLevel(Number(e.target.value))} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Ping role ID</span>
              <input className={inputCls} value={pingRoleId} onChange={(e) => setPingRoleId(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={busy} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              Start giveaway
            </button>
            <button onClick={() => setCreating(false)} className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          + New giveaway
        </button>
      )}

      {items.length === 0 && !creating && <p className="text-sm text-neutral-500">No giveaways yet.</p>}

      <div className="space-y-3">
        {items.map((g) => (
          <div key={g.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">🎉 {g.prize}</span>
                <span className={`ml-2 text-xs ${STATUS_CLR[g.status] ?? ""}`}>{g.status}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {g.winnersCount} winner(s)
                  {g.minLevel > 0 ? ` · lvl ${g.minLevel}+` : ""} ·{" "}
                  {g.status === "active"
                    ? `ends ${new Date(g.endsAt).toLocaleString()}`
                    : `${winnerCount(g.winnersJson)} won`}
                </span>
              </div>
              {g.status === "active" && (
                <div className="flex gap-2">
                  <button onClick={() => act(g.id, "end")} disabled={busy} className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800">
                    End now
                  </button>
                  <button onClick={() => act(g.id, "cancel")} disabled={busy} className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
