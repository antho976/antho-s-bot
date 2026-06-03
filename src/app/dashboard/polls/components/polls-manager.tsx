"use client";

import { useState } from "react";
import type { Poll } from "@/server/features/polls/queries";
import { ChannelSelect } from "@/app/dashboard/_components/guild-select";
import { Card } from "@/app/dashboard/_components/ui/card";
import { Button } from "@/app/dashboard/_components/ui/button";
import { Input, Field } from "@/app/dashboard/_components/ui/input";
import { Toggle } from "@/app/dashboard/_components/ui/toggle";
import { useToast } from "@/app/dashboard/_components/ui/toast";

function optionCount(json: string): number {
  try {
    return (JSON.parse(json) as string[]).length;
  } catch {
    return 0;
  }
}

export function PollsManager({ initial }: { initial: Poll[] }) {
  const [items, setItems] = useState<Poll[]>(initial);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  const [channelId, setChannelId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [durationMin, setDurationMin] = useState(0);

  async function create() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!channelId.trim() || !question.trim() || opts.length < 2) {
      error("Need a channel, a question, and 2+ options.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim(),
          question: question.trim(),
          options: opts,
          multi,
          durationMin: Number(durationMin) || 0,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        error(typeof data?.error === "string" ? data.error : "Could not create.");
        return;
      }
      setItems((i) => [data as Poll, ...i]);
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
      success("Poll posted.");
    } finally {
      setBusy(false);
    }
  }

  async function end(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/polls/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setItems((i) => i.map((x) => (x.id === id ? (data as Poll) : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {creating ? (
        <Card className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Question">
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
            </Field>
            <Field label="Channel">
              <ChannelSelect value={channelId} onChange={setChannelId} />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted">Options (2–10)</div>
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={o}
                  onChange={(e) => setOptions((os) => os.map((x, idx) => (idx === i ? e.target.value : x)))}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions((os) => os.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded-md border border-border-strong px-2 text-muted transition hover:bg-surface-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                onClick={() => setOptions((os) => [...os, ""])}
                className="text-sm text-accent transition hover:opacity-80"
              >
                + Add option
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Toggle checked={multi} onChange={setMulti} label="Multiple choice" />
            <label className="text-sm text-muted">
              Duration (min, 0 = manual){" "}
              <input
                type="number"
                className="ml-1 w-24 rounded-md border border-border-strong bg-surface-0 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={create} disabled={busy}>
              Post poll
            </Button>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)}>+ New poll</Button>
      )}

      {items.length === 0 && !creating && <p className="text-sm text-faint">No polls yet.</p>}

      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-text">📊 {p.question}</span>
                <span className="ml-2 text-xs text-faint">
                  {optionCount(p.optionsJson)} options
                  {p.multi ? " · multi" : ""} · {p.status}
                  {p.status === "active" && p.endsAt ? ` · ends ${new Date(p.endsAt).toLocaleString()}` : ""}
                </span>
              </div>
              {p.status === "active" && (
                <Button variant="secondary" size="sm" onClick={() => end(p.id)} disabled={busy}>
                  End now
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
