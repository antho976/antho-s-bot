"use client";

import { useState } from "react";
import type { SupportConfig } from "@/server/features/support/queries";
import { ChannelSelect, RoleSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function SupportSettings({ initial }: { initial: SupportConfig }) {
  const [c, setC] = useState<SupportConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof SupportConfig>(k: K, v: SupportConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/support/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelId: c.channelId || null,
          staffRoleId: c.staffRoleId || null,
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
      <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="Support tickets enabled" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tickets channel (threads are created here)">
          <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
        </Field>
        <Field label="Staff role (pinged on new tickets)">
          <RoleSelect value={c.staffRoleId ?? ""} onChange={(v) => set("staffRoleId", v || null)} />
        </Field>
      </div>

      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
