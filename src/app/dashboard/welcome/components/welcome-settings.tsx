"use client";

import { useState } from "react";
import type { WelcomeConfig } from "@/server/features/welcome/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function WelcomeSettings({ initial }: { initial: WelcomeConfig }) {
  const [c, setC] = useState<WelcomeConfig>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof WelcomeConfig>(k: K, v: WelcomeConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/welcome/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeEnabled: c.welcomeEnabled,
          welcomeChannelId: c.welcomeChannelId || null,
          welcomeMode: c.welcomeMode,
          welcomeMessage: c.welcomeMessage,
          goodbyeEnabled: c.goodbyeEnabled,
          goodbyeChannelId: c.goodbyeChannelId || null,
          goodbyeMode: c.goodbyeMode,
          goodbyeMessage: c.goodbyeMessage,
          randomBackground: c.randomBackground,
        }),
      });
      setMsg(res.ok ? "Saved." : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-6">
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}

      <Block
        title="Welcome"
        enabled={c.welcomeEnabled}
        onEnabled={(v) => set("welcomeEnabled", v)}
        channelId={c.welcomeChannelId}
        onChannel={(v) => set("welcomeChannelId", v)}
        mode={c.welcomeMode}
        onMode={(v) => set("welcomeMode", v)}
        message={c.welcomeMessage}
        onMessage={(v) => set("welcomeMessage", v)}
      />
      <Block
        title="Goodbye"
        enabled={c.goodbyeEnabled}
        onEnabled={(v) => set("goodbyeEnabled", v)}
        channelId={c.goodbyeChannelId}
        onChannel={(v) => set("goodbyeChannelId", v)}
        mode={c.goodbyeMode}
        onMode={(v) => set("goodbyeMode", v)}
        message={c.goodbyeMessage}
        onMessage={(v) => set("goodbyeMessage", v)}
      />

      <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={c.randomBackground}
          onChange={(e) => set("randomBackground", e.target.checked)}
          className="h-4 w-4 accent-indigo-600"
        />
        Pick a random background each time
      </label>

      <div>
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

function Block({
  title,
  enabled,
  onEnabled,
  channelId,
  onChannel,
  mode,
  onMode,
  message,
  onMessage,
}: {
  title: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  channelId: string | null;
  onChannel: (v: string | null) => void;
  mode: string;
  onMode: (v: string) => void;
  message: string;
  onMessage: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabled(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Enabled
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-neutral-400">Channel</span>
          <ChannelSelect value={channelId ?? ""} onChange={(v) => onChannel(v || null)} />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Mode</span>
          <select className={inputCls} value={mode} onChange={(e) => onMode(e.target.value)}>
            <option value="text">Text only</option>
            <option value="image">Image only</option>
            <option value="both">Text + image</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-neutral-400">
          Message — placeholders: {"{user} {username} {server} {memberCount}"}
        </span>
        <textarea
          className={inputCls}
          rows={2}
          value={message}
          onChange={(e) => onMessage(e.target.value)}
        />
      </label>
    </div>
  );
}
