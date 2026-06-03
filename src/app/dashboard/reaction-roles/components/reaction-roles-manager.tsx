"use client";

import { useState } from "react";
import type { PanelWithPairs } from "@/server/features/reaction-roles/queries";
import { ChannelSelect, RoleSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Input, Field } from "@/app/dashboard/_components/ui/input";
import { Select } from "@/app/dashboard/_components/ui/select";
import { useToast } from "@/app/dashboard/_components/ui/toast";
import { useConfirm } from "@/app/dashboard/_components/ui/confirm";

interface PairRow {
  emoji: string;
  roleId: string;
}

function emojiDisplay(stored: string): string {
  return /^\d+$/.test(stored) ? "(custom emoji)" : stored;
}

export function ReactionRolesManager({ initial }: { initial: PanelWithPairs[] }) {
  const [panels, setPanels] = useState<PanelWithPairs[]>(initial);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("toggle");
  const [pairs, setPairs] = useState<PairRow[]>([{ emoji: "", roleId: "" }]);

  function setPair(i: number, k: keyof PairRow, v: string) {
    setPairs((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  async function create() {
    const valid = pairs.filter((p) => p.emoji.trim() && p.roleId.trim());
    if (!channelId.trim() || valid.length === 0) {
      error("Need a channel and at least one emoji → role.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reaction-roles/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim(),
          title: title.trim() || undefined,
          mode,
          pairs: valid.map((p) => ({ emoji: p.emoji.trim(), roleId: p.roleId.trim() })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        error(typeof data?.error === "string" ? data.error : "Could not create panel.");
        return;
      }
      setPanels((ps) => [...ps, data as PanelWithPairs]);
      setCreating(false);
      setChannelId("");
      setTitle("");
      setPairs([{ emoji: "", roleId: "" }]);
      success("Panel posted.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (
      !(await confirm({
        message: "Delete this panel and its message?",
        confirmLabel: "Delete",
        danger: true,
      }))
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/reaction-roles/panels/${id}`, { method: "DELETE" });
      if (res.ok) setPanels((ps) => ps.filter((p) => p.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {creating ? (
        <Card className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Channel">
              <ChannelSelect value={channelId} onChange={setChannelId} />
            </Field>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Mode">
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="toggle">Toggle</option>
                <option value="unique">Unique (one at a time)</option>
                <option value="verify">Verify (add only)</option>
              </Select>
            </Field>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted">Emoji → Role</div>
            {pairs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={p.emoji}
                  onChange={(e) => setPair(i, "emoji", e.target.value)}
                  placeholder="✅ or <:name:id>"
                />
                <div className="flex-1">
                  <RoleSelect value={p.roleId} onChange={(v) => setPair(i, "roleId", v)} />
                </div>
                <button
                  onClick={() => setPairs((ps) => (ps.length > 1 ? ps.filter((_, idx) => idx !== i) : ps))}
                  className="shrink-0 rounded-md border border-border-strong px-2 text-muted transition hover:bg-surface-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setPairs((ps) => [...ps, { emoji: "", roleId: "" }])}
              className="text-sm text-accent transition hover:opacity-80"
            >
              + Add row
            </button>
          </div>

          <div className="flex gap-2">
            <Button onClick={create} disabled={busy}>
              Post panel
            </Button>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-faint">
            The bot posts the panel and adds the reactions. <strong>Toggle</strong> add/removes;{" "}
            <strong>Unique</strong> keeps one at a time; <strong>Verify</strong> only adds.
          </p>
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)}>+ New panel</Button>
      )}

      {panels.length === 0 && !creating && <p className="text-sm text-faint">No panels yet.</p>}

      <div className="space-y-3">
        {panels.map((panel) => (
          <Card key={panel.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-text">{panel.title || "Reaction Roles"}</span>
                <span className="ml-2 text-xs text-faint">
                  channel {panel.channelId} · {panel.mode}
                </span>
              </div>
              <Button variant="danger" size="sm" onClick={() => remove(panel.id)} disabled={busy}>
                Delete
              </Button>
            </div>
            <div className="mt-2 text-sm text-muted">
              {panel.pairs.map((pr) => (
                <span key={pr.id} className="mr-3">
                  {emojiDisplay(pr.emoji)} → role {pr.roleId}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
