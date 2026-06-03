"use client";

import { useState } from "react";
import type { StarboardConfig } from "@/server/features/starboard/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Input, Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function StarboardSettings({ initial }: { initial: StarboardConfig }) {
  const [c, setC] = useState<StarboardConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof StarboardConfig>(k: K, v: StarboardConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/starboard/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          emoji: c.emoji,
          threshold: c.threshold,
          channelId: c.channelId || null,
          selfStar: c.selfStar,
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
      <Toggle checked={c.enabled} onChange={(v) => set("enabled", v)} label="Highlights enabled" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Emoji">
          <Input value={c.emoji} onChange={(e) => set("emoji", e.target.value)} />
        </Field>
        <Field label="Stars needed">
          <Input
            type="number"
            value={c.threshold}
            onChange={(e) => set("threshold", Number(e.target.value))}
          />
        </Field>
        <Field label="Highlights channel">
          <ChannelSelect value={c.channelId ?? ""} onChange={(v) => set("channelId", v || null)} />
        </Field>
      </div>

      <Toggle
        checked={c.selfStar}
        onChange={(v) => set("selfStar", v)}
        label="Count the author's own star"
      />

      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
