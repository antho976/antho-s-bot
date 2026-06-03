"use client";

import { useState } from "react";
import type { Giveaway } from "@/server/features/giveaways/queries";
import { ChannelSelect, RoleSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Input, Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

const STATUS_CLR: Record<string, string> = {
  active: "text-emerald-400",
  ended: "text-muted",
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
  const { success, error } = useToast();

  const [channelId, setChannelId] = useState("");
  const [prize, setPrize] = useState("");
  const [winnersCount, setWinnersCount] = useState(1);
  const [durationMin, setDurationMin] = useState(60);
  const [pingRoleId, setPingRoleId] = useState("");
  const [minLevel, setMinLevel] = useState(0);

  async function create() {
    if (!channelId.trim() || !prize.trim()) {
      error("Need a channel and a prize.");
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
        error(typeof data?.error === "string" ? data.error : "Could not create.");
        return;
      }
      setItems((i) => [data as Giveaway, ...i]);
      setCreating(false);
      setPrize("");
      success("Giveaway started.");
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
      {creating ? (
        <Card className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prize">
              <Input value={prize} onChange={(e) => setPrize(e.target.value)} />
            </Field>
            <Field label="Channel">
              <ChannelSelect value={channelId} onChange={setChannelId} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Winners">
              <Input
                type="number"
                value={winnersCount}
                onChange={(e) => setWinnersCount(Number(e.target.value))}
              />
            </Field>
            <Field label="Duration (min)">
              <Input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </Field>
            <Field label="Min level">
              <Input
                type="number"
                value={minLevel}
                onChange={(e) => setMinLevel(Number(e.target.value))}
              />
            </Field>
            <Field label="Ping role">
              <RoleSelect value={pingRoleId} onChange={setPingRoleId} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button onClick={create} disabled={busy}>
              Start giveaway
            </Button>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)}>+ New giveaway</Button>
      )}

      {items.length === 0 && !creating && <p className="text-sm text-faint">No giveaways yet.</p>}

      <div className="space-y-3">
        {items.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-text">🎉 {g.prize}</span>
                <span className={`ml-2 text-xs ${STATUS_CLR[g.status] ?? ""}`}>{g.status}</span>
                <span className="ml-2 text-xs text-faint">
                  {g.winnersCount} winner(s)
                  {g.minLevel > 0 ? ` · lvl ${g.minLevel}+` : ""} ·{" "}
                  {g.status === "active"
                    ? `ends ${new Date(g.endsAt).toLocaleString()}`
                    : `${winnerCount(g.winnersJson)} won`}
                </span>
              </div>
              {g.status === "active" && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => act(g.id, "end")} disabled={busy}>
                    End now
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => act(g.id, "cancel")} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
