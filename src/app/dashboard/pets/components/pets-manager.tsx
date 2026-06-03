"use client";

import { useState } from "react";
import type { PetSubmission } from "@/server/features/pets/queries";
import { cn } from "@/lib/cn";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";

const FILTERS = ["pending", "approved", "denied", "all"] as const;
const STATUS_CLR: Record<string, string> = {
  pending: "text-amber-400",
  approved: "text-emerald-400",
  denied: "text-red-400",
};

export function PetsManager({ initial }: { initial: PetSubmission[] }) {
  const [items, setItems] = useState<PetSubmission[]>(initial);
  const [filter, setFilter] = useState<string>("pending");
  const [busy, setBusy] = useState(false);

  async function review(id: number, status: "approved" | "denied") {
    setBusy(true);
    try {
      const res = await fetch(`/api/pets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setItems((i) => i.map((x) => (x.id === id ? (data as PetSubmission) : x)));
    } finally {
      setBusy(false);
    }
  }

  const shown = items.filter((i) => filter === "all" || i.status === filter);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-surface-1 p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs capitalize transition",
              filter === f
                ? "bg-accent text-accent-contrast"
                : "text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-faint">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-text">🐾 {p.petName}</span>
                  <span className={cn("ml-2 text-xs capitalize", STATUS_CLR[p.status] ?? "")}>
                    {p.status}
                  </span>
                  <span className="ml-2 text-xs text-faint">by {p.userId}</span>
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(p.id, "approved")}
                      disabled={busy}
                      className="rounded-md border border-emerald-900 px-2.5 py-1 text-xs text-emerald-400 transition hover:bg-emerald-950 active:scale-[0.98] disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <Button variant="danger" size="sm" onClick={() => review(p.id, "denied")} disabled={busy}>
                      Deny
                    </Button>
                  </div>
                )}
              </div>
              {p.note && <div className="mt-1 text-sm text-muted">{p.note}</div>}
              {p.imageUrl && <div className="mt-1 truncate text-xs text-faint">{p.imageUrl}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
