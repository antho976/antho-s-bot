"use client";

import { useState } from "react";
import type { LevelConfig } from "@/server/features/leveling/queries";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function LevelingSettings({ initial }: { initial: LevelConfig }) {
  const [c, setC] = useState<LevelConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof LevelConfig>(k: K, v: LevelConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/leveling/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          xpMsgMin: c.xpMsgMin,
          xpMsgMax: c.xpMsgMax,
          msgCooldownSec: c.msgCooldownSec,
          xpPerVoiceMin: c.xpPerVoiceMin,
          xpPerReaction: c.xpPerReaction,
          curveType: c.curveType,
          curveBase: c.curveBase,
          curveFactor: c.curveFactor,
          announce: c.announce,
          announceChannelId: c.announceChannelId || null,
          voiceRequireActive: c.voiceRequireActive,
        }),
      });
      setMsg(res.ok ? "Saved." : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Settings</h2>
      {msg && <div className="mt-2 text-sm text-emerald-400">{msg}</div>}
      <div className="mt-3 space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <Toggle label="Leveling enabled" checked={c.enabled} onChange={(v) => set("enabled", v)} />

        <div className="grid gap-3 sm:grid-cols-3">
          <Num label="XP per message (min)" value={c.xpMsgMin} onChange={(v) => set("xpMsgMin", v)} />
          <Num label="XP per message (max)" value={c.xpMsgMax} onChange={(v) => set("xpMsgMax", v)} />
          <Num label="Message cooldown (s)" value={c.msgCooldownSec} onChange={(v) => set("msgCooldownSec", v)} />
          <Num label="XP per voice minute" value={c.xpPerVoiceMin} onChange={(v) => set("xpPerVoiceMin", v)} />
          <Num label="XP per reaction" value={c.xpPerReaction} onChange={(v) => set("xpPerReaction", v)} />
        </div>
        <Toggle
          label="Voice XP requires unmuted & not AFK"
          checked={c.voiceRequireActive}
          onChange={(v) => set("voiceRequireActive", v)}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="block text-neutral-400">Curve type</span>
            <select
              className={inputCls}
              value={c.curveType}
              onChange={(e) => set("curveType", e.target.value)}
            >
              <option value="multiplier">Multiplier</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <Num label="Curve base XP" value={c.curveBase} onChange={(v) => set("curveBase", v)} />
          <Num label="Curve factor" value={c.curveFactor} step="0.05" onChange={(v) => set("curveFactor", v)} />
        </div>

        <Toggle label="Announce level-ups" checked={c.announce} onChange={(v) => set("announce", v)} />
        <label className="block text-sm">
          <span className="text-neutral-400">Announce channel ID (blank = where it happened)</span>
          <input
            className={inputCls}
            value={c.announceChannelId ?? ""}
            onChange={(e) => set("announceChannelId", e.target.value || null)}
          />
        </label>

        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Save settings
        </button>
      </div>
    </section>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <label className="text-sm">
      <span className="block text-neutral-400">{label}</span>
      <input
        type="number"
        step={step}
        className={inputCls}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-indigo-600"
      />
      {label}
    </label>
  );
}
