"use client";

import { useState } from "react";
import type { PanelWithPairs } from "@/server/features/reaction-roles/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

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
  const [toast, setToast] = useState<string | null>(null);

  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("toggle");
  const [pairs, setPairs] = useState<PairRow[]>([{ emoji: "", roleId: "" }]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  }
  function setPair(i: number, k: keyof PairRow, v: string) {
    setPairs((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  async function create() {
    const valid = pairs.filter((p) => p.emoji.trim() && p.roleId.trim());
    if (!channelId.trim() || valid.length === 0) {
      flash("Need a channel and at least one emoji → role.");
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
        flash(typeof data?.error === "string" ? data.error : "Could not create panel.");
        return;
      }
      setPanels((ps) => [...ps, data as PanelWithPairs]);
      setCreating(false);
      setChannelId("");
      setTitle("");
      setPairs([{ emoji: "", roleId: "" }]);
      flash("Panel posted.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this panel and its message?")) return;
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
      {toast && (
        <div className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm">{toast}</div>
      )}

      {creating ? (
        <div className="space-y-3 rounded-xl border border-indigo-900/60 bg-neutral-900 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="block text-neutral-400">Channel ID</span>
              <input className={inputCls} value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Title</span>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="block text-neutral-400">Mode</span>
              <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="toggle">Toggle</option>
                <option value="unique">Unique (one at a time)</option>
                <option value="verify">Verify (add only)</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-neutral-400">Emoji → Role</div>
            {pairs.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={inputCls}
                  value={p.emoji}
                  onChange={(e) => setPair(i, "emoji", e.target.value)}
                  placeholder="✅ or <:name:id>"
                />
                <input
                  className={inputCls}
                  value={p.roleId}
                  onChange={(e) => setPair(i, "roleId", e.target.value)}
                  placeholder="role ID"
                />
                <button
                  onClick={() => setPairs((ps) => (ps.length > 1 ? ps.filter((_, idx) => idx !== i) : ps))}
                  className="shrink-0 rounded-md border border-neutral-700 px-2 text-neutral-400 hover:bg-neutral-800"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setPairs((ps) => [...ps, { emoji: "", roleId: "" }])}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              + Add row
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={busy}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Post panel
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            The bot posts the panel and adds the reactions. <strong>Toggle</strong> add/removes;{" "}
            <strong>Unique</strong> keeps one at a time; <strong>Verify</strong> only adds.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New panel
        </button>
      )}

      {panels.length === 0 && !creating && (
        <p className="text-sm text-neutral-500">No panels yet.</p>
      )}

      <div className="space-y-3">
        {panels.map((panel) => (
          <div key={panel.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">{panel.title || "Reaction Roles"}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  channel {panel.channelId} · {panel.mode}
                </span>
              </div>
              <button
                onClick={() => remove(panel.id)}
                disabled={busy}
                className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
              >
                Delete
              </button>
            </div>
            <div className="mt-2 text-sm text-neutral-400">
              {panel.pairs.map((pr) => (
                <span key={pr.id} className="mr-3">
                  {emojiDisplay(pr.emoji)} → role {pr.roleId}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
