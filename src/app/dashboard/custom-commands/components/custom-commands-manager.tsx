"use client";

import { useState } from "react";
import type { CustomCommand } from "@/server/features/custom-commands/queries";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { useToast } from "@/app/dashboard/_components/ui/toast";
import { useConfirm } from "@/app/dashboard/_components/ui/confirm";
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
  const { success, error } = useToast();
  const confirm = useConfirm();

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
        error(typeof data?.error === "string" ? data.error : "Could not create.");
        return;
      }
      setCommands((c) => [...c, data as CustomCommand]);
      setEditing(null);
      success("Created.");
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
        error("Could not save.");
        return;
      }
      setCommands((c) => c.map((x) => (x.id === id ? (data as CustomCommand) : x)));
      setEditing(null);
      success("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!(await confirm({ message: "Delete this command?", confirmLabel: "Delete", danger: true }))) {
      return;
    }
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
      {editing === "new" ? (
        <CommandForm onSave={create} onCancel={() => setEditing(null)} busy={busy} />
      ) : (
        <Button onClick={() => setEditing("new")}>+ New command</Button>
      )}

      {commands.length === 0 && editing !== "new" && (
        <p className="text-sm text-faint">No commands yet.</p>
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
            <Card key={cmd.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-medium text-accent">!{cmd.name}</span>
                  <span className="ml-2 text-xs text-faint">
                    used {cmd.usesCount}
                    {cmd.maxUses > 0 ? `/${cmd.maxUses}` : ""}
                    {cmd.cooldownSec > 0 ? ` · ${cmd.cooldownSec}s cd` : ""}
                    {cmd.embed ? " · embed" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(cmd.id)} disabled={busy}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(cmd.id)} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </div>
              {cmd.responseText && (
                <div className="mt-2 truncate text-sm text-muted">{cmd.responseText}</div>
              )}
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
