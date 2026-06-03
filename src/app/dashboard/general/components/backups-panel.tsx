"use client";

import { useState } from "react";
import type { BackupInfo } from "@/server/features/backups/service";
import { formatBytes } from "@/lib/format";

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
      <button
        onClick={backup}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? "Backing up…" : "Backup now"}
      </button>

      <div className="mt-3 space-y-1.5">
        {items.length === 0 && <p className="text-sm text-neutral-500">No backups yet.</p>}
        {items.map((b) => (
          <div
            key={b.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
          >
            <span className="truncate text-neutral-300">{b.name}</span>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-neutral-500">{formatBytes(b.size)}</span>
              <a
                href={`/api/backups/${encodeURIComponent(b.name)}`}
                className="text-xs text-indigo-400 hover:text-indigo-300"
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
