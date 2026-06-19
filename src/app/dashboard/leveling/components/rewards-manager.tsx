"use client";

import { useState } from "react";
import type { LevelReward } from "@/server/features/leveling/queries";
import type { RewardSyncResult } from "@/server/features/leveling/reward-sync";
import { RoleSelect } from "@/app/dashboard/_components/guild-select";
import { Button } from "@/app/dashboard/_components/ui/button";
import { useToast } from "@/app/dashboard/_components/ui/toast";

const inputCls =
  "rounded-md border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

export function RewardsManager({ initial }: { initial: LevelReward[] }) {
  const [rewards, setRewards] = useState<LevelReward[]>(initial);
  const [level, setLevel] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

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

  async function autodetect() {
    setBusy(true);
    try {
      const res = await fetch("/api/leveling/rewards/sync", { method: "POST" });
      const data = (await res.json()) as RewardSyncResult & { rewards: LevelReward[] };
      if (res.ok && data.ok) {
        setRewards(data.rewards);
        if (data.matched === 0) error(data.reason ?? "No level-named roles found.");
        else if (data.added > 0)
          success(`Added ${data.added} reward${data.added === 1 ? "" : "s"} from ${data.matched} level role${data.matched === 1 ? "" : "s"}.`);
        else success(`All ${data.matched} level roles were already set up.`);
      } else {
        error(data.reason ?? "Auto-detect failed.");
      }
    } catch {
      error("Auto-detect failed.");
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
      <h2 className="text-lg font-semibold text-text">Role rewards</h2>
      <p className="mt-1 text-sm text-muted">Grant a role when a member reaches a level.</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-muted">Level</span>
          <input
            type="number"
            className={inputCls}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block text-muted">Role</span>
          <RoleSelect value={roleId} onChange={(v) => setRoleId(v)} />
        </label>
        <Button onClick={add} disabled={busy || !level || !roleId.trim()}>
          Add
        </Button>
        <Button variant="secondary" onClick={autodetect} disabled={busy}>
          {busy ? "Scanning…" : "Auto-detect from roles"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-faint">
        Auto-detect scans your server roles and turns any named like{" "}
        <span className="text-muted">Lv 75</span> or <span className="text-muted">Level 40</span> into a
        reward. New or renamed level roles are picked up automatically too.
      </p>

      <div className="mt-3 space-y-2">
        {rewards.length === 0 && <p className="text-sm text-faint">No rewards yet.</p>}
        {rewards.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-2 text-sm"
          >
            <span className="text-text">
              Level <strong>{r.level}</strong> → role <span className="text-muted">{r.roleId}</span>
            </span>
            <Button variant="danger" size="sm" onClick={() => remove(r.id)} disabled={busy}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
