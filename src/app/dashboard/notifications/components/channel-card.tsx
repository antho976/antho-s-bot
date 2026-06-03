"use client";

import type { StreamChannel } from "@/server/features/notifications/queries";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";

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
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${badge}`}>
            {ch.platform}
          </span>
          <span className="font-medium text-text">{ch.displayName || ch.channelRef}</span>
          <span className="text-xs text-faint">{ch.channelRef}</span>
          {!ch.enabled && <span className="text-xs text-amber-400">disabled</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit} disabled={busy}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} disabled={busy}>
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-faint">
        Posts to {ch.discordChannelId ? `channel ${ch.discordChannelId}` : "— (no channel set)"} ·
        live {ch.alertOnLive ? "on" : "off"} · end {ch.alertOnEnd ? "on" : "off"} · upload{" "}
        {ch.alertOnUpload ? "on" : "off"}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="self-center text-xs text-faint">Test:</span>
        {(["live", "end", "upload"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTest(t)}
            disabled={busy}
            className="rounded-md bg-surface-2 px-2.5 py-1 text-xs capitalize text-text transition hover:bg-border-strong active:scale-[0.98] disabled:opacity-50"
          >
            Fake {t}
          </button>
        ))}
      </div>
    </Card>
  );
}
