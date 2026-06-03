"use client";

import { useState } from "react";
import type { RpgConfig } from "@/server/features/rpg/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function RpgSettings({ initial }: { initial: RpgConfig }) {
  const [c, setC] = useState<RpgConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof RpgConfig>(k: K, v: RpgConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/rpg/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: c.enabled, channelId: c.channelId || null }),
      });
      if (res.ok) success("Saved.");
      else error("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 space-y-4 p-5">
      <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="RPG enabled" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Hub channel"
          hint="Where /rpg posts adventure hubs. Leave blank to allow it anywhere."
        >
          <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
        </Field>
      </div>

      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
