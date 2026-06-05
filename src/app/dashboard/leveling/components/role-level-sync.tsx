"use client";

import { useState } from "react";
import type { RoleSyncResult } from "@/server/features/leveling/role-sync";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { useToast } from "@/app/dashboard/_components/ui/toast";

export function RoleLevelSync() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RoleSyncResult | null>(null);
  const { success, error } = useToast();

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/leveling/sync-roles", { method: "POST" });
      const data = (await res.json()) as RoleSyncResult;
      setResult(data);
      if (res.ok && data.ok) {
        if (data.updated > 0) success(`Updated ${data.updated} member${data.updated === 1 ? "" : "s"}.`);
        else if (data.reason) error(data.reason);
        else success("Everyone is already at or above their role level.");
      } else {
        error(data.reason ?? "Sync failed.");
      }
    } catch {
      error("Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-text">Sync levels from roles</h2>
      <p className="mt-1 text-sm text-muted">
        Scans every member and sets their level from any role named like{" "}
        <span className="text-text">Level 40</span> or <span className="text-text">Lv 40</span> — handy
        for seeding leveling from roles you already hand out. Levels are only raised (existing higher
        progress is left alone) and no Discord roles are changed.
      </p>
      <Card className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 p-5">
        <Button onClick={run} disabled={busy}>
          {busy ? "Scanning…" : "Scan roles & sync"}
        </Button>
        {result?.ok && (
          <p className="text-sm text-muted">
            Scanned <Stat>{result.scanned}</Stat> · matched <Stat>{result.matched}</Stat> · updated{" "}
            <Stat>{result.updated}</Stat> · skipped <Stat>{result.skipped}</Stat>
          </p>
        )}
        {result && !result.ok && <p className="text-sm text-red-400">{result.reason}</p>}
      </Card>
    </section>
  );
}

function Stat({ children }: { children: number }) {
  return <strong className="text-text">{children}</strong>;
}
