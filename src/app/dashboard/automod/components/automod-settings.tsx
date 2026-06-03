"use client";

import { useState } from "react";
import type { AutomodConfig } from "@/server/features/automod/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function AutomodSettings({ initial }: { initial: AutomodConfig }) {
  const [c, setC] = useState<AutomodConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof AutomodConfig>(k: K, v: AutomodConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/automod/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          deleteMessage: c.deleteMessage,
          timeoutUser: c.timeoutUser,
          timeoutMinutes: c.timeoutMinutes,
          logChannelId: c.logChannelId || null,
          checkBlocklist: c.checkBlocklist,
          checkTyposquats: c.checkTyposquats,
          checkScamPhrases: c.checkScamPhrases,
        }),
      });
      setMsg(res.ok ? "Saved." : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-4">
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
      <div className="space-y-5 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <Toggle label="Scam protection enabled" checked={c.enabled} onChange={(v) => set("enabled", v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block text-neutral-400">Log channel (optional)</span>
            <ChannelSelect value={c.logChannelId ?? ""} onChange={(v) => set("logChannelId", v || null)} />
          </label>
          <label className="text-sm">
            <span className="block text-neutral-400">Timeout length (minutes)</span>
            <input
              type="number"
              className={inputCls}
              value={c.timeoutMinutes}
              onChange={(e) => set("timeoutMinutes", Number(e.target.value))}
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-neutral-400">Detection</div>
          <Toggle label="Block known scam domains (your blocklist)" checked={c.checkBlocklist} onChange={(v) => set("checkBlocklist", v)} />
          <Toggle label="Catch lookalike domains (discord / steam typosquats)" checked={c.checkTyposquats} onChange={(v) => set("checkTyposquats", v)} />
          <Toggle label="Catch scam phrases + a link (&quot;free nitro&quot;, etc.)" checked={c.checkScamPhrases} onChange={(v) => set("checkScamPhrases", v)} />
        </div>

        <div className="space-y-2">
          <div className="text-sm text-neutral-400">Action on detection</div>
          <Toggle label="Delete the message" checked={c.deleteMessage} onChange={(v) => set("deleteMessage", v)} />
          <Toggle label="Timeout the user" checked={c.timeoutUser} onChange={(v) => set("timeoutUser", v)} />
        </div>

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
    <label className="flex items-center gap-2 text-sm text-neutral-300">
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
