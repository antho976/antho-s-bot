"use client";

import { useState } from "react";
import type { MemberLogConfig } from "@/server/features/member-logs/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

const TOGGLES: { key: keyof MemberLogConfig; label: string }[] = [
  { key: "logJoins", label: "Joins" },
  { key: "logLeaves", label: "Leaves" },
  { key: "logBans", label: "Bans" },
  { key: "logUnbans", label: "Unbans" },
  { key: "logNicknames", label: "Nickname changes" },
  { key: "logRoles", label: "Role changes" },
  { key: "logMessageEdits", label: "Message edits" },
  { key: "logMessageDeletes", label: "Message deletes" },
  { key: "logVoice", label: "Voice activity" },
];

export function MemberLogsSettings({ initial }: { initial: MemberLogConfig }) {
  const [c, setC] = useState<MemberLogConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof MemberLogConfig>(k: K, v: MemberLogConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/member-logs/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelId: c.channelId || null,
          logJoins: c.logJoins,
          logLeaves: c.logLeaves,
          logBans: c.logBans,
          logUnbans: c.logUnbans,
          logNicknames: c.logNicknames,
          logRoles: c.logRoles,
          logMessageEdits: c.logMessageEdits,
          logMessageDeletes: c.logMessageDeletes,
          logVoice: c.logVoice,
        }),
      });
      if (res.ok) success("Saved.");
      else error("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 space-y-4 p-5">
      <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="Member logging enabled" />

      <Field label="Log channel">
        <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
      </Field>

      <div>
        <div className="mb-2 text-sm text-muted">Events to log</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {TOGGLES.map((t) => (
            <Toggle
              key={t.key}
              checked={Boolean(c[t.key])}
              onChange={(v) => set(t.key, v as MemberLogConfig[typeof t.key])}
              label={t.label}
            />
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
