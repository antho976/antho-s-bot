"use client";

import { useState } from "react";
import type { StreamChannel } from "@/server/features/notifications/queries";
import { Button } from "@/app/dashboard/_components/ui/button";
import { useToast } from "@/app/dashboard/_components/ui/toast";
import { useConfirm } from "@/app/dashboard/_components/ui/confirm";
import { ChannelForm, type ChannelFormValues } from "./channel-form";
import { ChannelCard, type EventType } from "./channel-card";

export function NotificationsManager({ initial }: { initial: StreamChannel[] }) {
  const [channels, setChannels] = useState<StreamChannel[]>(initial);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const { success, error, info } = useToast();
  const confirm = useConfirm();

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
      if (!res.ok) {
        error("Could not add channel.");
        return;
      }
      const created = (await res.json()) as StreamChannel;
      setChannels((c) => [...c, created]);
      setEditing(null);
      success("Channel added.");
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
      if (!res.ok) {
        error("Could not save.");
        return;
      }
      const updated = (await res.json()) as StreamChannel;
      setChannels((c) => c.map((x) => (x.id === id ? updated : x)));
      setEditing(null);
      success("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!(await confirm({ message: "Delete this channel?", confirmLabel: "Delete", danger: true }))) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/channels/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChannels((c) => c.filter((x) => x.id !== id));
        success("Deleted.");
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
      if (data?.sent) success(`Test ${type} alert posted to Discord`);
      else info(`Not sent: ${data?.reason ?? "error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {editing === "new" ? (
        <ChannelForm onSave={create} onCancel={() => setEditing(null)} busy={busy} />
      ) : (
        <Button onClick={() => setEditing("new")}>+ Add channel</Button>
      )}

      {channels.length === 0 && editing !== "new" && (
        <p className="text-sm text-faint">No channels yet. Add one to start.</p>
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
