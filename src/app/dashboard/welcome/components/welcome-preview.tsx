"use client";

import { useState } from "react";
import { Button } from "@/app/dashboard/_components/ui/button";

export function WelcomePreview() {
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview(kind: "welcome" | "goodbye") {
    setBusy(true);
    try {
      const res = await fetch("/api/welcome/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text">Preview</h2>
      <p className="mt-1 text-sm text-muted">
        Renders a sample card with your avatar and current background settings.
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={() => preview("welcome")} disabled={busy}>
          Preview welcome
        </Button>
        <Button variant="secondary" onClick={() => preview("goodbye")} disabled={busy}>
          Preview goodbye
        </Button>
      </div>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="card preview"
          className="mt-3 w-full max-w-2xl rounded-xl border border-border"
        />
      )}
    </section>
  );
}
