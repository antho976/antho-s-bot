"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/app/dashboard/_components/ui/button";

interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
  ts: number;
}

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  debug: "text-faint",
  info: "text-sky-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const LEVELS = ["all", "info", "warn", "error"] as const;
type LevelFilter = (typeof LEVELS)[number];

export function LogsLive() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry;
        setEntries((prev) => [...prev.slice(-499), entry]);
      } catch {
        // ignore malformed
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (level !== "all" && e.level !== level) return false;
      if (q && !`${e.source} ${e.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, level, query]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length]);

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface-1 p-1">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs capitalize transition",
                level === l ? "bg-accent text-accent-contrast" : "text-muted hover:text-text",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          className="flex-1 rounded-lg border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
        <Button variant="secondary" size="sm" onClick={() => setEntries([])}>
          Clear view
        </Button>
        <span className="inline-flex items-center gap-1.5 text-xs text-faint">
          <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-faint")} />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </div>

      <div className="h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface-0 p-3 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="p-4 text-faint">No log entries.</div>
        ) : (
          filtered.map((e, i) => (
            <div key={i} className="flex gap-3 py-0.5">
              <span className="shrink-0 text-faint">{formatTime(e.ts)}</span>
              <span className={cn("w-12 shrink-0 uppercase", LEVEL_COLOR[e.level])}>{e.level}</span>
              <span className="shrink-0 text-faint">{e.source}</span>
              <span className="text-text">{e.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
