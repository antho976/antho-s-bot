"use client";

import { useState } from "react";
import type { CustomCommand } from "@/server/features/custom-commands/queries";
import { ChannelMultiSelect, RoleMultiSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { Input, Textarea, Field } from "@/app/dashboard/_components/ui/input";

const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const toStr = (a: string[]) => a.join(", ");

export interface CommandFormValues {
  name: string;
  responseText: string;
  imageUrl: string;
  embed: boolean;
  autoDeleteSec: number;
  maxUses: number;
  cooldownSec: number;
  allowedRoles: string; // comma-separated IDs
  allowedChannels: string;
}

function joinIds(json: string | null): string {
  try {
    return json ? (JSON.parse(json) as string[]).join(", ") : "";
  } catch {
    return "";
  }
}

function fromCmd(cmd?: CustomCommand): CommandFormValues {
  return {
    name: cmd?.name ?? "",
    responseText: cmd?.responseText ?? "",
    imageUrl: cmd?.imageUrl ?? "",
    embed: cmd?.embed ?? false,
    autoDeleteSec: cmd?.autoDeleteSec ?? 0,
    maxUses: cmd?.maxUses ?? 0,
    cooldownSec: cmd?.cooldownSec ?? 0,
    allowedRoles: joinIds(cmd?.allowedRoles ?? null),
    allowedChannels: joinIds(cmd?.allowedChannels ?? null),
  };
}

export function CommandForm({
  cmd,
  onSave,
  onCancel,
  busy,
}: {
  cmd?: CustomCommand;
  onSave: (v: CommandFormValues) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [v, setV] = useState<CommandFormValues>(() => fromCmd(cmd));
  const isEdit = Boolean(cmd);
  function set<K extends keyof CommandFormValues>(k: K, val: CommandFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }
  const num = (k: keyof CommandFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(k, Number(e.target.value) as CommandFormValues[typeof k]);

  return (
    <Card className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (used as !name)">
          <Input
            value={v.name}
            disabled={isEdit}
            onChange={(e) => set("name", e.target.value.replace(/[^a-z0-9_-]/gi, ""))}
            placeholder="welcome"
          />
        </Field>
        <Field label="Image URL (optional)">
          <Input value={v.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>
      </div>

      <Field label="Response text">
        <Textarea rows={2} value={v.responseText} onChange={(e) => set("responseText", e.target.value)} />
      </Field>

      <Toggle checked={v.embed} onChange={(val) => set("embed", val)} label="Send as embed" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Auto-delete (sec, 0=off)">
          <Input type="number" value={v.autoDeleteSec} onChange={num("autoDeleteSec")} />
        </Field>
        <Field label="Max uses (0=∞)">
          <Input type="number" value={v.maxUses} onChange={num("maxUses")} />
        </Field>
        <Field label="Cooldown (sec)">
          <Input type="number" value={v.cooldownSec} onChange={num("cooldownSec")} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Allowed roles (none checked = any)">
          <RoleMultiSelect value={toList(v.allowedRoles)} onChange={(a) => set("allowedRoles", toStr(a))} />
        </Field>
        <Field label="Allowed channels (none checked = any)">
          <ChannelMultiSelect
            value={toList(v.allowedChannels)}
            onChange={(a) => set("allowedChannels", toStr(a))}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onSave(v)} disabled={busy || !v.name.trim()}>
          {isEdit ? "Save changes" : "Create command"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
