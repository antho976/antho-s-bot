"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Input } from "@/app/dashboard/_components/ui/input";

const PRESETS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Pink", hex: "#ec4899" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Live-preview the accent on the dashboard root (set in dashboard/layout.tsx). */
function preview(hex: string) {
  document.getElementById("dash-root")?.style.setProperty("--accent", hex);
}

export function AppearanceSettings({ initial }: { initial: string }) {
  const router = useRouter();
  const [hex, setHex] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const valid = HEX.test(hex);

  function choose(v: string) {
    setHex(v);
    setMsg(null);
    if (HEX.test(v)) preview(v);
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings/accent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent: hex }),
      });
      if (res.ok) {
        setMsg("Saved.");
        router.refresh();
      } else {
        setMsg("Could not save — needs a #rrggbb hex.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 space-y-5 p-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Accent color</h2>
        <p className="mt-1 text-sm text-muted">
          Used for buttons, links, the active nav item, toggles, and focus rings.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            onClick={() => choose(p.hex)}
            title={p.name}
            aria-label={p.name}
            className={cn(
              "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface-1 transition",
              hex.toLowerCase() === p.hex ? "ring-white" : "ring-transparent hover:ring-border-strong",
            )}
            style={{ backgroundColor: p.hex }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-muted">
          Custom
          <input
            type="color"
            value={valid ? hex : "#6366f1"}
            onChange={(e) => choose(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
          />
        </label>
        <Input
          value={hex}
          onChange={(e) => choose(e.target.value)}
          placeholder="#6366f1"
          className="w-32 font-mono"
        />
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          Preview
          <Button size="sm" type="button">
            Button
          </Button>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy || !valid}>
          Save
        </Button>
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
      </div>
    </Card>
  );
}
