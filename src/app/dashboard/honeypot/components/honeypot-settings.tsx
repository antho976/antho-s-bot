"use client";

import { useState } from "react";
import type { HoneypotConfig } from "@/server/features/honeypot/queries";
import {
  ChannelSelect,
  ChannelMultiSelect,
  RoleSelect,
  RoleMultiSelect,
} from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Select } from "@/app/dashboard/_components/ui/select";
import { Input, Textarea, Field } from "@/app/dashboard/_components/ui/input";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function HoneypotSettings({ initial }: { initial: HoneypotConfig }) {
  const [c, setC] = useState<HoneypotConfig>(initial);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof HoneypotConfig>(k: K, v: HoneypotConfig[K]) {
    setC((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/honeypot/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: c.enabled,
          channelIds: c.channelIds,
          muteMode: c.muteMode,
          muteRoleId: c.muteRoleId || null,
          timeoutMinutes: c.timeoutMinutes,
          purgeLookbackMinutes: c.purgeLookbackMinutes,
          pingTargetType: c.pingTargetType,
          pingTargetId: c.pingTargetId || null,
          alertChannelId: c.alertChannelId || null,
          exemptRoleIds: c.exemptRoleIds,
          alsoBan: c.alsoBan,
          dmUser: c.dmUser,
          dmMessage: c.dmMessage || null,
        }),
      });
      if (res.ok) success("Saved.");
      else error("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 space-y-6 p-5">
      <Toggle label="Honeypot enabled" checked={c.enabled} onChange={(v) => set("enabled", v)} />

      <Field
        label="Trap channel(s)"
        hint="Anyone who isn't staff/exempt and posts here gets caught. Staff and bots are always ignored."
      >
        <ChannelMultiSelect value={c.channelIds} onChange={(v) => set("channelIds", v)} />
      </Field>

      {/* Mute */}
      <div className="space-y-3">
        <div className="text-sm text-muted">When tripped — mute</div>
        <Field label="Mute method">
          <Select value={c.muteMode} onChange={(e) => set("muteMode", e.target.value)}>
            <option value="role">Mute role (stays forever)</option>
            <option value="timeout">Timeout (auto-expires)</option>
          </Select>
        </Field>
        {c.muteMode === "role" ? (
          <Field
            label="Mute role"
            hint="A role that denies sending messages everywhere. The bot's own role must sit above it."
          >
            <RoleSelect value={c.muteRoleId ?? ""} onChange={(v) => set("muteRoleId", v || null)} />
          </Field>
        ) : (
          <Field label="Timeout length (minutes)" hint="Discord caps timeouts at 40320 (28 days).">
            <Input
              type="number"
              value={c.timeoutMinutes}
              onChange={(e) => set("timeoutMinutes", Number(e.target.value))}
            />
          </Field>
        )}
      </div>

      {/* Purge */}
      <Field
        label="Purge their messages from the last … (minutes)"
        hint="Deletes the offender's messages server-wide within this window. 0 = don't purge."
      >
        <Input
          type="number"
          value={c.purgeLookbackMinutes}
          onChange={(e) => set("purgeLookbackMinutes", Number(e.target.value))}
        />
      </Field>

      {/* Alert / ping */}
      <div className="space-y-3">
        <div className="text-sm text-muted">Alert / ping</div>
        <p className="text-xs text-faint">
          When tripped, an explanatory embed is posted in the trap channel (action taken, messages
          purged, and who to DM). The ping target below is mentioned there and shown as the appeal
          contact.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Mod-log channel (optional)"
            hint="Also posts a no-ping copy here, including the offender's message. Leave empty to only post in the trap channel."
          >
            <ChannelSelect
              value={c.alertChannelId ?? ""}
              onChange={(v) => set("alertChannelId", v || null)}
            />
          </Field>
          <Field label="Ping / appeal contact">
            <Select
              value={c.pingTargetType}
              onChange={(e) => set("pingTargetType", e.target.value)}
            >
              <option value="user">A user (e.g. you)</option>
              <option value="role">A role</option>
              <option value="none">No ping</option>
            </Select>
          </Field>
        </div>
        {c.pingTargetType === "user" && (
          <Field
            label="User ID to ping"
            hint="Your Discord user ID — enable Developer Mode, right-click yourself, Copy User ID."
          >
            <Input
              value={c.pingTargetId ?? ""}
              onChange={(e) => set("pingTargetId", e.target.value || null)}
              placeholder="123456789012345678"
            />
          </Field>
        )}
        {c.pingTargetType === "role" && (
          <Field label="Role to ping">
            <RoleSelect value={c.pingTargetId ?? ""} onChange={(v) => set("pingTargetId", v || null)} />
          </Field>
        )}
      </div>

      {/* Exemptions */}
      <Field
        label="Extra exempt roles"
        hint="Staff (Moderate Members) and bots are always exempt — add any other safe roles here."
      >
        <RoleMultiSelect value={c.exemptRoleIds} onChange={(v) => set("exemptRoleIds", v)} />
      </Field>

      {/* Extra actions */}
      <div className="space-y-2">
        <div className="text-sm text-muted">Extra actions</div>
        <Toggle label="Also ban the user" checked={c.alsoBan} onChange={(v) => set("alsoBan", v)} />
        <Toggle
          label="DM the user a message"
          checked={c.dmUser}
          onChange={(v) => set("dmUser", v)}
        />
        {c.dmUser && (
          <Textarea
            rows={2}
            value={c.dmMessage ?? ""}
            onChange={(e) => set("dmMessage", e.target.value || null)}
            placeholder="You were muted for posting in a restricted channel."
          />
        )}
      </div>

      <Button onClick={save} disabled={busy}>
        Save settings
      </Button>
    </Card>
  );
}
