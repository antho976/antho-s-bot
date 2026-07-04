"use client";

import { useState } from "react";
import type { StreamChannel } from "@/server/features/notifications/queries";
import { ChannelSelect, RoleSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Select } from "@/app/dashboard/_components/ui/select";
import { Input, Textarea, Field } from "@/app/dashboard/_components/ui/input";

export interface ChannelFormValues {
  platform: "twitch" | "youtube";
  channelRef: string;
  displayName: string;
  discordChannelId: string;
  pingRoleId: string;
  useEmbed: boolean;
  alertOnLive: boolean;
  alertOnEnd: boolean;
  alertOnUpload: boolean;
  statsIntervalMin: number;
  messageTemplate: string;
}

function fromChannel(channel?: StreamChannel): ChannelFormValues {
  return {
    platform: (channel?.platform as "twitch" | "youtube") ?? "twitch",
    channelRef: channel?.channelRef ?? "",
    displayName: channel?.displayName ?? "",
    discordChannelId: channel?.discordChannelId ?? "",
    pingRoleId: channel?.pingRoleId ?? "",
    useEmbed: channel?.useEmbed ?? true,
    alertOnLive: channel?.alertOnLive ?? true,
    alertOnEnd: channel?.alertOnEnd ?? false,
    alertOnUpload: channel?.alertOnUpload ?? true,
    statsIntervalMin: channel?.statsIntervalMin ?? 10,
    messageTemplate: channel?.messageTemplate ?? "",
  };
}

export function ChannelForm({
  channel,
  onSave,
  onCancel,
  busy,
}: {
  channel?: StreamChannel;
  onSave: (v: ChannelFormValues) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [v, setV] = useState<ChannelFormValues>(() => fromChannel(channel));
  const isEdit = Boolean(channel);
  function set<K extends keyof ChannelFormValues>(k: K, val: ChannelFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }
  const refLabel = v.platform === "twitch" ? "Twitch username" : "YouTube channel ID";

  return (
    <Card className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Platform">
          <Select
            value={v.platform}
            disabled={isEdit}
            onChange={(e) => set("platform", e.target.value as "twitch" | "youtube")}
          >
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
          </Select>
        </Field>
        <Field label={refLabel}>
          <Input
            value={v.channelRef}
            onChange={(e) => set("channelRef", e.target.value)}
            placeholder={v.platform === "twitch" ? "e.g. ninja" : "e.g. UCxxxxxxxx"}
          />
        </Field>
        <Field label="Display name (optional)">
          <Input value={v.displayName} onChange={(e) => set("displayName", e.target.value)} />
        </Field>
        <Field label="Discord channel (where to post)">
          <ChannelSelect value={v.discordChannelId} onChange={(val) => set("discordChannelId", val)} />
        </Field>
        <Field label="Ping role (optional)">
          <RoleSelect value={v.pingRoleId} onChange={(val) => set("pingRoleId", val)} />
        </Field>
        <Field
          label="Viewer stats refresh (minutes)"
          hint="How often the live embed's viewer count updates."
        >
          <Input
            type="number"
            min={1}
            max={120}
            value={v.statsIntervalMin}
            onChange={(e) => set("statsIntervalMin", e.target.valueAsNumber)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <Toggle checked={v.useEmbed} onChange={(c) => set("useEmbed", c)} label="Use embed" />
        <Toggle checked={v.alertOnLive} onChange={(c) => set("alertOnLive", c)} label="Alert on live" />
        <Toggle checked={v.alertOnEnd} onChange={(c) => set("alertOnEnd", c)} label="Alert on end" />
        <Toggle checked={v.alertOnUpload} onChange={(c) => set("alertOnUpload", c)} label="Alert on upload" />
      </div>

      <Field label="Message template (optional) — placeholders: {name} {platform} {title} {game} {url}">
        <Textarea
          rows={2}
          value={v.messageTemplate}
          onChange={(e) => set("messageTemplate", e.target.value)}
        />
      </Field>

      <div className="flex gap-2">
        <Button disabled={busy || !v.channelRef.trim()} onClick={() => onSave(v)}>
          {isEdit ? "Save changes" : "Add channel"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
