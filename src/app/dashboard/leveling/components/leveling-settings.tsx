"use client";

import { useState } from "react";
import type { LevelConfig } from "@/server/features/leveling/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Select } from "@/app/dashboard/_components/ui/select";
import { Input, Textarea, Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function LevelingSettings({ initial }: { initial: LevelConfig }) {
  const [c, setC] = useState<LevelConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof LevelConfig>(k: K, v: LevelConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/leveling/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          xpMsgMin: c.xpMsgMin,
          xpMsgMax: c.xpMsgMax,
          msgCooldownSec: c.msgCooldownSec,
          xpPerVoiceMin: c.xpPerVoiceMin,
          xpPerReaction: c.xpPerReaction,
          curveType: c.curveType,
          curveBase: c.curveBase,
          curveFactor: c.curveFactor,
          announce: c.announce,
          announceChannelId: c.announceChannelId || null,
          announcePing: c.announcePing,
          announceMinLevel: c.announceMinLevel,
          levelUpMessage: c.levelUpMessage?.trim() ? c.levelUpMessage.trim() : null,
          stackRoleRewards: c.stackRoleRewards,
          voiceRequireActive: c.voiceRequireActive,
        }),
      });
      if (res.ok) success("Saved.");
      else error("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-text">Settings</h2>
      <Card className="mt-3 space-y-6 p-5">
        <Toggle label="Leveling enabled" checked={c.enabled} onChange={(v) => set("enabled", v)} />

        {/* XP earning */}
        <Group title="Earning XP">
          <div className="grid gap-3 sm:grid-cols-3">
            <Num label="XP per message (min)" value={c.xpMsgMin} onChange={(v) => set("xpMsgMin", v)} />
            <Num label="XP per message (max)" value={c.xpMsgMax} onChange={(v) => set("xpMsgMax", v)} />
            <Num label="Message cooldown (s)" value={c.msgCooldownSec} onChange={(v) => set("msgCooldownSec", v)} />
            <Num label="XP per voice minute" value={c.xpPerVoiceMin} onChange={(v) => set("xpPerVoiceMin", v)} />
            <Num label="XP per reaction" value={c.xpPerReaction} onChange={(v) => set("xpPerReaction", v)} />
          </div>
          <Toggle
            label="Voice XP requires unmuted & not AFK"
            checked={c.voiceRequireActive}
            onChange={(v) => set("voiceRequireActive", v)}
          />
        </Group>

        {/* Level curve */}
        <Group title="Level curve">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Curve type">
              <Select value={c.curveType} onChange={(e) => set("curveType", e.target.value)}>
                <option value="multiplier">Multiplier</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Num label="Curve base XP" value={c.curveBase} onChange={(v) => set("curveBase", v)} />
            <Num label="Curve factor" value={c.curveFactor} step="0.05" onChange={(v) => set("curveFactor", v)} />
          </div>
        </Group>

        {/* Announcements */}
        <Group title="Level-up announcements">
          <Toggle label="Announce level-ups" checked={c.announce} onChange={(v) => set("announce", v)} />
          <Toggle
            label="Mention (ping) the member"
            checked={c.announcePing}
            disabled={!c.announce}
            onChange={(v) => set("announcePing", v)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Announce channel (blank = where it happened)">
              <ChannelSelect
                value={c.announceChannelId ?? ""}
                onChange={(v) => set("announceChannelId", v || null)}
              />
            </Field>
            <Num
              label="Only announce at level ≥"
              value={c.announceMinLevel}
              onChange={(v) => set("announceMinLevel", v)}
            />
          </div>
          <Field
            label="Custom message (optional)"
            hint="Placeholders: {user} (mention or name) and {level}. Blank uses the default."
          >
            <Textarea
              rows={2}
              placeholder="🎉 {user} reached level {level}!"
              value={c.levelUpMessage ?? ""}
              onChange={(e) => set("levelUpMessage", e.target.value)}
            />
          </Field>
        </Group>

        {/* Role rewards behaviour */}
        <Group title="Role rewards">
          <Toggle
            label="Stack reward roles (keep lower roles when a new one is earned)"
            checked={c.stackRoleRewards}
            onChange={(v) => set("stackRoleRewards", v)}
          />
        </Group>

        <Button onClick={save} disabled={busy}>
          Save settings
        </Button>
      </Card>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border pt-5 first:border-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">{title}</h3>
      {children}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}
