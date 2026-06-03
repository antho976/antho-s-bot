"use client";

import { useState } from "react";
import type { StreamChannel } from "@/server/features/notifications/queries";
import { ChannelForm, type ChannelFormValues } from "./channel-form";
import { ChannelCard, type EventType } from "./channel-card";

export function NotificationsManager({ initial }: { initial: StreamChannel[] }) {
  const [channels, setChannels] = useState<StreamChannel[]>(initial);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function payload(v: ChannelFormValues) {
    return {
      ...v,
      displayName: v.displayName.trim() || undefined,
      discordChannelId: v.discordChannelId.trim() || undefined,
      pingRoleId: v.pingRoleId.trim() || undefined,
      messageTemplate: v.messageTemplate.trim() || undefined,
    };
  }

  async function create(v: ChannelFormValues) {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(v)),
      });
      if (!res.ok) return flash("Could not add channel.");
      const created = (await res.json()) as StreamChannel;
      setChannels((c) => [...c, created]);
      setEditing(null);
      flash("Channel added.");
    } finally {
      setBusy(false);
    }
  }

  async function save(id: number, v: ChannelFormValues) {
    setBusy(true);
    try {
      // platform is fixed after creation; the PATCH schema simply ignores it.
      const res = await fetch(`/api/notifications/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(v)),
      });
      if (!res.ok) return flash("Could not save.");
      const updated = (await res.json()) as StreamChannel;
      setChannels((c) => c.map((x) => (x.id === id ? updated : x)));
      setEditing(null);
      flash("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this channel?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/channels/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChannels((c) => c.filter((x) => x.id !== id));
        flash("Deleted.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function test(id: number, type: EventType) {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: id, type }),
      });
      const data = (await res.json().catch(() => null)) as { sent?: boolean; reason?: string } | null;
      flash(data?.sent ? `Test ${type} alert posted to Discord ✅` : `Not sent: ${data?.reason ?? "error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {toast && (
        <div className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm">{toast}</div>
      )}

      {editing === "new" ? (
        <ChannelForm onSave={create} onCancel={() => setEditing(null)} busy={busy} />
      ) : (
        <button
          onClick={() => setEditing("new")}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + Add channel
        </button>
      )}

      {channels.length === 0 && editing !== "new" && (
        <p className="text-sm text-neutral-500">No channels yet. Add one to start.</p>
      )}

      <div className="space-y-3">
        {channels.map((ch) =>
          editing === ch.id ? (
            <ChannelForm
              key={ch.id}
              channel={ch}
              onSave={(v) => save(ch.id, v)}
              onCancel={() => setEditing(null)}
              busy={busy}
            />
          ) : (
            <ChannelCard
              key={ch.id}
              ch={ch}
              busy={busy}
              onEdit={() => setEditing(ch.id)}
              onDelete={() => remove(ch.id)}
              onTest={(t) => test(ch.id, t)}
            />
          ),
        )}
      </div>
    </div>
  );
}
