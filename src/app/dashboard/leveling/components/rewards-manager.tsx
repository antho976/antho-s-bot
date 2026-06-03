"use client";

import { useState } from "react";
import type { LevelReward } from "@/server/features/leveling/queries";

const inputCls =
  "rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function RewardsManager({ initial }: { initial: LevelReward[] }) {
  const [rewards, setRewards] = useState<LevelReward[]>(initial);
  const [level, setLevel] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!level || !roleId.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/leveling/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: Number(level), roleId: roleId.trim() }),
      });
      if (res.ok) {
        setRewards((await res.json()) as LevelReward[]);
        setLevel("");
        setRoleId("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/leveling/rewards/${id}`, { method: "DELETE" });
      if (res.ok) setRewards((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Role rewards</h2>
      <p className="mt-1 text-sm text-neutral-400">Grant a role when a member reaches a level.</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-neutral-400">Level</span>
          <input type="number" className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Role ID</span>
          <input
            className={inputCls}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            placeholder="right-click role → Copy ID"
          />
        </label>
        <button
          onClick={add}
          disabled={busy || !level || !roleId.trim()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {rewards.length === 0 && <p className="text-sm text-neutral-500">No rewards yet.</p>}
        {rewards.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm"
          >
            <span>
              Level <strong>{r.level}</strong> → role <span className="text-neutral-400">{r.roleId}</span>
            </span>
            <button
              onClick={() => remove(r.id)}
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
