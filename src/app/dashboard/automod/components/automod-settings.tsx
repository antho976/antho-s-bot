"use client";

import { useState } from "react";
import type { AutomodConfig } from "@/server/features/automod/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Input, Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function AutomodSettings({ initial }: { initial: AutomodConfig }) {
  const [c, setC] = useState<AutomodConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof AutomodConfig>(k: K, v: AutomodConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/automod/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          deleteMessage: c.deleteMessage,
          timeoutUser: c.timeoutUser,
          timeoutMinutes: c.timeoutMinutes,
          logChannelId: c.logChannelId || null,
          checkBlocklist: c.checkBlocklist,
          checkTyposquats: c.checkTyposquats,
          checkScamPhrases: c.checkScamPhrases,
        }),
      });
      if (res.ok) success("Saved.");
      else error("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 space-y-5 p-5">
      <Toggle label="Scam protection enabled" checked={c.enabled} onChange={(v) => set("enabled", v)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Log channel (optional)">
          <ChannelSelect value={c.logChannelId ?? ""} onChange={(v) => set("logChannelId", v || null)} />
        </Field>
        <Field label="Timeout length (minutes)">
          <Input
            type="number"
            value={c.timeoutMinutes}
            onChange={(e) => set("timeoutMinutes", Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted">Detection</div>
        <Toggle
          label="Block known scam domains (your blocklist)"
          checked={c.checkBlocklist}
          onChange={(v) => set("checkBlocklist", v)}
        />
        <Toggle
          label="Catch lookalike domains (discord / steam typosquats)"
          checked={c.checkTyposquats}
          onChange={(v) => set("checkTyposquats", v)}
        />
        <Toggle
          label="Catch scam phrases + a link (&quot;free nitro&quot;, etc.)"
          checked={c.checkScamPhrases}
          onChange={(v) => set("checkScamPhrases", v)}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted">Action on detection</div>
        <Toggle label="Delete the message" checked={c.deleteMessage} onChange={(v) => set("deleteMessage", v)} />
        <Toggle label="Timeout the user" checked={c.timeoutUser} onChange={(v) => set("timeoutUser", v)} />
      </div>

      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
