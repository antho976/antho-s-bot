"use client";

import { useState } from "react";
import type { PetSubmission } from "@/server/features/pets/queries";

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
      <div className="flex w-fit gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-xs capitalize ${
              filter === f ? "bg-indigo-600 text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">🐾 {p.petName}</span>
                  <span className={`ml-2 text-xs capitalize ${STATUS_CLR[p.status] ?? ""}`}>
                    {p.status}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500">by {p.userId}</span>
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => review(p.id, "approved")}
                      disabled={busy}
                      className="rounded-md border border-emerald-900 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-950"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(p.id, "denied")}
                      disabled={busy}
                      className="rounded-md border border-red-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
              {p.note && <div className="mt-1 text-sm text-neutral-400">{p.note}</div>}
              {p.imageUrl && <div className="mt-1 truncate text-xs text-neutral-600">{p.imageUrl}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
