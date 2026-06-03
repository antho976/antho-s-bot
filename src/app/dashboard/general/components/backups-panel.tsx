"use client";

import { useState } from "react";
import type { BackupInfo } from "@/server/features/backups/service";
import { formatBytes } from "@/lib/format";
import { Button } from "@/app/dashboard/_components/ui/button";

export function BackupsPanel({ initial }: { initial: BackupInfo[] }) {
  const [items, setItems] = useState<BackupInfo[]>(initial);
  const [busy, setBusy] = useState(false);

  async function backup() {
    setBusy(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      if (res.ok) setItems((await res.json()) as BackupInfo[]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <Button onClick={backup} disabled={busy}>
        {busy ? "Backing up…" : "Backup now"}
      </Button>

      <div className="mt-3 space-y-1.5">
        {items.length === 0 && <p className="text-sm text-faint">No backups yet.</p>}
        {items.map((b) => (
          <div
            key={b.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm"
          >
            <span className="truncate text-muted">{b.name}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-faint">{formatBytes(b.size)}</span>
              <a
                href={`/api/backups/${encodeURIComponent(b.name)}`}
                className="text-xs text-accent transition hover:opacity-80"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
