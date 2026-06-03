"use client";

import { useState } from "react";
import type { CustomCommand } from "@/server/features/custom-commands/queries";
import { ChannelMultiSelect, RoleMultiSelect } from "@/app/dashboard/_components/guild-select";

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500";

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
    <div className="space-y-3 rounded-xl border border-indigo-900/60 bg-neutral-900 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-neutral-400">Name (used as !name)</span>
          <input
            className={inputCls}
            value={v.name}
            disabled={isEdit}
            onChange={(e) => set("name", e.target.value.replace(/[^a-z0-9_-]/gi, ""))}
            placeholder="welcome"
          />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Image URL (optional)</span>
          <input className={inputCls} value={v.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-neutral-400">Response text</span>
        <textarea
          className={inputCls}
          rows={2}
          value={v.responseText}
          onChange={(e) => set("responseText", e.target.value)}
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={v.embed}
          onChange={(e) => set("embed", e.target.checked)}
          className="h-4 w-4 accent-indigo-600"
        />
        Send as embed
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="block text-neutral-400">Auto-delete (sec, 0=off)</span>
          <input type="number" className={inputCls} value={v.autoDeleteSec} onChange={num("autoDeleteSec")} />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Max uses (0=∞)</span>
          <input type="number" className={inputCls} value={v.maxUses} onChange={num("maxUses")} />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Cooldown (sec)</span>
          <input type="number" className={inputCls} value={v.cooldownSec} onChange={num("cooldownSec")} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-neutral-400">Allowed roles (none checked = any)</span>
          <RoleMultiSelect value={toList(v.allowedRoles)} onChange={(a) => set("allowedRoles", toStr(a))} />
        </label>
        <label className="text-sm">
          <span className="block text-neutral-400">Allowed channels (none checked = any)</span>
          <ChannelMultiSelect
            value={toList(v.allowedChannels)}
            onChange={(a) => set("allowedChannels", toStr(a))}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(v)}
          disabled={busy || !v.name.trim()}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isEdit ? "Save changes" : "Create command"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
