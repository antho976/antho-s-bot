"use client";

import { useState } from "react";
import type { BirthdayConfig } from "@/server/features/birthdays/queries";
import { ChannelSelect, RoleSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function BirthdaySettings({ initial }: { initial: BirthdayConfig }) {
  const [c, setC] = useState<BirthdayConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof BirthdayConfig>(k: K, v: BirthdayConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/birthdays/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelId: c.channelId || null,
          roleId: c.roleId || null,
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
      <Toggle
        checked={c.enabled}
        onChange={(v) => set("enabled", v)}
        label="Birthday announcements enabled"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Announce channel">
          <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
        </Field>
        <Field label="Birthday role (optional, for the day)">
          <RoleSelect value={c.roleId ?? ""} onChange={(v) => set("roleId", v || null)} />
        </Field>
      </div>
      <p className="text-xs text-faint">
        Members set theirs with <code>/birthday set</code>.
      </p>
      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
