"use client";

import { useState } from "react";
import type { CustomCommand } from "@/server/features/custom-commands/queries";
import { CommandForm, type CommandFormValues } from "./command-form";

function splitIds(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function CustomCommandsManager({ initial }: { initial: CustomCommand[] }) {
  const [commands, setCommands] = useState<CustomCommand[]>(initial);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  }

  function body(v: CommandFormValues) {
    return {
      responseText: v.responseText,
      imageUrl: v.imageUrl.trim() || null,
      embed: v.embed,
      autoDeleteSec: Number(v.autoDeleteSec) || 0,
      maxUses: Number(v.maxUses) || 0,
      cooldownSec: Number(v.cooldownSec) || 0,
      allowedRoles: splitIds(v.allowedRoles),
      allowedChannels: splitIds(v.allowedChannels),
    };
  }

  async function create(v: CommandFormValues) {
    setBusy(true);
    try {
      const res = await fetch("/api/custom-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name.trim().toLowerCase(), ...body(v) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash(typeof data?.error === "string" ? data.error : "Could not create.");
        return;
      }
      setCommands((c) => [...c, data as CustomCommand]);
      setEditing(null);
      flash("Created.");
    } finally {
      setBusy(false);
    }
  }

  async function save(id: number, v: CommandFormValues) {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-commands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body(v)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash("Could not save.");
        return;
      }
      setCommands((c) => c.map((x) => (x.id === id ? (data as CustomCommand) : x)));
      setEditing(null);
      flash("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this command?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-commands/${id}`, { method: "DELETE" });
      if (res.ok) setCommands((c) => c.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {toast && (
        <div className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm">{toast}</div>
      )}

      {editing === "new" ? (
        <CommandForm onSave={create} onCancel={() => setEditing(null)} busy={busy} />
      ) : (
        <button
          onClick={() => setEditing("new")}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New command
        </button>
      )}

      {commands.length === 0 && editing !== "new" && (
        <p className="text-sm text-neutral-500">No commands yet.</p>
      )}

      <div className="space-y-3">
        {commands.map((cmd) =>
          editing === cmd.id ? (
            <CommandForm
              key={cmd.id}
              cmd={cmd}
              onSave={(v) => save(cmd.id, v)}
              onCancel={() => setEditing(null)}
              busy={busy}
            />
          ) : (
            <div key={cmd.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-medium text-indigo-400">!{cmd.name}</span>
                  <span className="ml-2 text-xs text-neutral-500">
                    used {cmd.usesCount}
                    {cmd.maxUses > 0 ? `/${cmd.maxUses}` : ""}
                    {cmd.cooldownSec > 0 ? ` · ${cmd.cooldownSec}s cd` : ""}
                    {cmd.embed ? " · embed" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(cmd.id)}
                    disabled={busy}
                    className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(cmd.id)}
                    disabled={busy}
                    className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {cmd.responseText && (
                <div className="mt-2 truncate text-sm text-neutral-400">{cmd.responseText}</div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
