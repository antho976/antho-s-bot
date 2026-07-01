"use client";

import { useState } from "react";
import { Plus, Send, Trash2 } from "lucide-react";
import { ChannelSelect } from "../_components/guild-select";
import { Button } from "../_components/ui/button";
import { Card } from "../_components/ui/card";
import { Field, Input, Textarea } from "../_components/ui/input";
import { useToast } from "../_components/ui/toast";
import { blankEmbed, isEmptyEmbed, type EmbedField, type EmbedInput } from "@/lib/embed";
import { EmbedPreview } from "./embed-preview";

const checkboxCls = "h-4 w-4 accent-[var(--accent)]";

export function EmbedCreator() {
  const [embed, setEmbed] = useState<EmbedInput>(blankEmbed);
  const [channelId, setChannelId] = useState("");
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  const set = (patch: Partial<EmbedInput>) => setEmbed((e) => ({ ...e, ...patch }));

  const addField = () =>
    setEmbed((e) =>
      e.fields.length >= 25 ? e : { ...e, fields: [...e.fields, { name: "", value: "", inline: false }] },
    );
  const updateField = (i: number, patch: Partial<EmbedField>) =>
    setEmbed((e) => ({ ...e, fields: e.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }));
  const removeField = (i: number) =>
    setEmbed((e) => ({ ...e, fields: e.fields.filter((_, idx) => idx !== i) }));

  async function send() {
    if (!channelId) {
      error("Pick a channel to post to.");
      return;
    }
    if (isEmptyEmbed(embed) && !embed.content.trim()) {
      error("Add a title, description, or message first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/embed/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, ...embed }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) success("Embed posted to the channel.");
      else error(data?.error ?? "Couldn't send the embed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Editor */}
      <Card className="space-y-4 p-5">
        <Field label="Message text (optional)" hint="Plain text above the embed — e.g. a role ping.">
          <Textarea rows={2} value={embed.content} onChange={(e) => set({ content: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Author">
            <Input value={embed.author} onChange={(e) => set({ author: e.target.value })} />
          </Field>
          <Field label="Author icon URL">
            <Input
              value={embed.authorIcon}
              onChange={(e) => set({ authorIcon: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>

        <Field label="Title">
          <Input value={embed.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Title URL" hint="Makes the title a clickable link.">
          <Input value={embed.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
        </Field>
        <Field label="Description">
          <Textarea rows={4} value={embed.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Image URL">
            <Input
              value={embed.imageUrl}
              onChange={(e) => set({ imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Thumbnail URL">
            <Input
              value={embed.thumbnailUrl}
              onChange={(e) => set({ thumbnailUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Footer">
            <Input value={embed.footer} onChange={(e) => set({ footer: e.target.value })} />
          </Field>
          <Field label="Footer icon URL">
            <Input
              value={embed.footerIcon}
              onChange={(e) => set({ footerIcon: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={!!embed.color}
              onChange={(e) => set({ color: e.target.checked ? embed.color || "#5865F2" : "" })}
              className={checkboxCls}
            />
            Colored bar
          </label>
          <input
            type="color"
            value={embed.color || "#5865F2"}
            disabled={!embed.color}
            onChange={(e) => set({ color: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-border-strong bg-surface-0 disabled:opacity-40"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={embed.timestamp}
              onChange={(e) => set({ timestamp: e.target.checked })}
              className={checkboxCls}
            />
            Timestamp
          </label>
        </div>

        {/* Fields */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted">Fields ({embed.fields.length}/25)</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addField}
              disabled={embed.fields.length >= 25}
            >
              <Plus className="h-3.5 w-3.5" /> Add field
            </Button>
          </div>
          <div className="space-y-3">
            {embed.fields.map((f, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface-0 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Field name"
                    value={f.name}
                    onChange={(e) => updateField(i, { name: e.target.value })}
                  />
                  <Input
                    placeholder="Field value"
                    value={f.value}
                    onChange={(e) => updateField(i, { value: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={f.inline}
                      onChange={(e) => updateField(i, { inline: e.target.checked })}
                      className={checkboxCls}
                    />
                    Inline
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Preview + send */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="p-5">
          <div className="mb-3 text-sm font-semibold text-text">Preview</div>
          <EmbedPreview embed={embed} />
        </Card>
        <Card className="space-y-3 p-5">
          <Field label="Post to channel">
            <ChannelSelect value={channelId} onChange={setChannelId} none="— pick a channel —" />
          </Field>
          <Button onClick={send} disabled={busy} className="w-full">
            <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send embed"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
