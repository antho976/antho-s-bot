"use client";

import { useState } from "react";
import type { StreamChannel } from "@/server/features/notifications/queries";

export interface ChannelFormValues {
  platform: "twitch" | "youtube";
  channelRef: string;
  displayName: string;
  discordChannelId: string;
  pingRoleId: string;
  useEmbed: boolean;
  alertOnLive: boolean;
  alertOnEnd: boolean;
  alertOnUpload: boolean;
  messageTemplate: string;
}

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

function fromChannel(channel?: StreamChannel): ChannelFormValues {
  return {
    platform: (channel?.platform as "twitch" | "youtube") ?? "twitch",
    channelRef: channel?.channelRef ?? "",
    displayName: channel?.displayName ?? "",
    discordChannelId: channel?.discordChannelId ?? "",
    pingRoleId: channel?.pingRoleId ?? "",
    useEmbed: channel?.useEmbed ?? true,
    alertOnLive: channel?.alertOnLive ?? true,
    alertOnEnd: channel?.alertOnEnd ?? false,
    alertOnUpload: channel?.alertOnUpload ?? true,
    messageTemplate: channel?.messageTemplate ?? "",
  };
}

export function ChannelForm({
  channel,
  onSave,
  onCancel,
  busy,
}: {
  channel?: StreamChannel;
  onSave: (v: ChannelFormValues) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [v, setV] = useState<ChannelFormValues>(() => fromChannel(channel));
  const isEdit = Boolean(channel);
  function set<K extends keyof ChannelFormValues>(k: K, val: ChannelFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }
  const refLabel = v.platform === "twitch" ? "Twitch username" : "YouTube channel ID";

  return (
    <div className="space-y-3 rounded-xl border border-indigo-900/60 bg-neutral-900 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-neutral-400">Platform</span>
          <select
            className={inputCls}
            value={v.platform}
            disabled={isEdit}
            onChange={(e) => set("platform", e.target.value as "twitch" | "youtube")}
          >
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">{refLabel}</span>
          <input
            className={inputCls}
            value={v.channelRef}
            onChange={(e) => set("channelRef", e.target.value)}
            placeholder={v.platform === "twitch" ? "e.g. ninja" : "e.g. UCxxxxxxxx"}
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Display name (optional)</span>
          <input className={inputCls} value={v.displayName} onChange={(e) => set("displayName", e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Discord channel ID (where to post)</span>
          <input
            className={inputCls}
            value={v.discordChannelId}
            onChange={(e) => set("discordChannelId", e.target.value)}
            placeholder="right-click channel → Copy ID"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-400">Ping role ID (optional)</span>
          <input className={inputCls} value={v.pingRoleId} onChange={(e) => set("pingRoleId", e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-neutral-300">
        <Check label="Use embed" checked={v.useEmbed} onChange={(c) => set("useEmbed", c)} />
        <Check label="Alert on live" checked={v.alertOnLive} onChange={(c) => set("alertOnLive", c)} />
        <Check label="Alert on end" checked={v.alertOnEnd} onChange={(c) => set("alertOnEnd", c)} />
        <Check label="Alert on upload" checked={v.alertOnUpload} onChange={(c) => set("alertOnUpload", c)} />
      </div>

      <label className="block text-sm">
        <span className="text-neutral-400">
          Message template (optional) — placeholders: {"{name} {platform} {title} {game} {url}"}
        </span>
        <textarea
          className={inputCls}
          rows={2}
          value={v.messageTemplate}
          onChange={(e) => set("messageTemplate", e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <button
          disabled={busy || !v.channelRef.trim()}
          onClick={() => onSave(v)}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isEdit ? "Save changes" : "Add channel"}
        </button>
        <button
          disabled={busy}
          onClick={onCancel}
          className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
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
