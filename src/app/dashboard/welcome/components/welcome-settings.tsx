"use client";

import { useState } from "react";
import type { WelcomeConfig } from "@/server/features/welcome/queries";
import { ChannelSelect, RoleMultiSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Select } from "@/app/dashboard/_components/ui/select";
import { Textarea, Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function WelcomeSettings({ initial }: { initial: WelcomeConfig }) {
  const [c, setC] = useState<WelcomeConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof WelcomeConfig>(k: K, v: WelcomeConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/welcome/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeEnabled: c.welcomeEnabled,
          welcomeChannelId: c.welcomeChannelId || null,
          welcomeMode: c.welcomeMode,
          welcomeMessage: c.welcomeMessage,
          goodbyeEnabled: c.goodbyeEnabled,
          goodbyeChannelId: c.goodbyeChannelId || null,
          goodbyeMode: c.goodbyeMode,
          goodbyeMessage: c.goodbyeMessage,
          autoRoleEnabled: c.autoRoleEnabled,
          autoRoleIds: c.autoRoleIds,
          randomBackground: c.randomBackground,
        }),
      });
      if (res.ok) success("Saved.");
      else error("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 space-y-6">
      <Block
        title="Welcome"
        enabled={c.welcomeEnabled}
        onEnabled={(v) => set("welcomeEnabled", v)}
        channelId={c.welcomeChannelId}
        onChannel={(v) => set("welcomeChannelId", v)}
        mode={c.welcomeMode}
        onMode={(v) => set("welcomeMode", v)}
        message={c.welcomeMessage}
        onMessage={(v) => set("welcomeMessage", v)}
      />
      <Block
        title="Goodbye"
        enabled={c.goodbyeEnabled}
        onEnabled={(v) => set("goodbyeEnabled", v)}
        channelId={c.goodbyeChannelId}
        onChannel={(v) => set("goodbyeChannelId", v)}
        mode={c.goodbyeMode}
        onMode={(v) => set("goodbyeMode", v)}
        message={c.goodbyeMessage}
        onMessage={(v) => set("goodbyeMessage", v)}
      />

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Auto-role</h2>
            <p className="text-sm text-muted">
              Automatically give every new member these roles when they join.
            </p>
          </div>
          <Toggle
            checked={c.autoRoleEnabled}
            onChange={(v) => set("autoRoleEnabled", v)}
            label="Enabled"
          />
        </div>
        <Field label="Roles to assign on join">
          <RoleMultiSelect value={c.autoRoleIds} onChange={(v) => set("autoRoleIds", v)} />
        </Field>
        <p className="text-xs text-faint">
          The bot&apos;s own role must sit above these in Server Settings → Roles, or it can&apos;t
          assign them.
        </p>
      </Card>

      <Toggle
        checked={c.randomBackground}
        onChange={(v) => set("randomBackground", v)}
        label="Pick a random background each time"
      />

      <div>
        <Button onClick={save} disabled={busy}>
          Save settings
        </Button>
      </div>
    </section>
  );
}

function Block({
  title,
  enabled,
  onEnabled,
  channelId,
  onChannel,
  mode,
  onMode,
  message,
  onMessage,
}: {
  title: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  channelId: string | null;
  onChannel: (v: string | null) => void;
  mode: string;
  onMode: (v: string) => void;
  message: string;
  onMessage: (v: string) => void;
}) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <Toggle checked={enabled} onChange={onEnabled} label="Enabled" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Channel">
          <ChannelSelect value={channelId ?? ""} onChange={(v) => onChannel(v || null)} />
        </Field>
        <Field label="Mode">
          <Select value={mode} onChange={(e) => onMode(e.target.value)}>
            <option value="text">Text only</option>
            <option value="image">Image only</option>
            <option value="both">Text + image</option>
          </Select>
        </Field>
      </div>
      <Field label="Message — placeholders: {user} {username} {server} {memberCount}">
        <Textarea rows={2} value={message} onChange={(e) => onMessage(e.target.value)} />
      </Field>
    </Card>
  );
}
