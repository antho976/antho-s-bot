"use client";

import type { StreamChannel } from "@/server/features/notifications/queries";

export type EventType = "live" | "end" | "upload";

export function ChannelCard({
  ch,
  busy,
  onEdit,
  onDelete,
  onTest,
}: {
  ch: StreamChannel;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTest: (t: EventType) => void;
}) {
  const badge = ch.platform === "twitch" ? "bg-purple-600" : "bg-red-600";

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${badge}`}>
            {ch.platform}
          </span>
          <span className="font-medium">{ch.displayName || ch.channelRef}</span>
          <span className="text-xs text-neutral-500">{ch.channelRef}</span>
          {!ch.enabled && <span className="text-xs text-amber-400">disabled</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={busy}
            className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-neutral-500">
        Posts to {ch.discordChannelId ? `channel ${ch.discordChannelId}` : "— (no channel set)"} ·
        live {ch.alertOnLive ? "on" : "off"} · end {ch.alertOnEnd ? "on" : "off"} · upload{" "}
        {ch.alertOnUpload ? "on" : "off"}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="self-center text-xs text-neutral-500">Test:</span>
        {(["live", "end", "upload"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTest(t)}
            disabled={busy}
            className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs capitalize hover:bg-neutral-700 disabled:opacity-50"
          >
            Fake {t}
          </button>
        ))}
      </div>
    </div>
  );
}
