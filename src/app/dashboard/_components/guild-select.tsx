"use client";

import { useEffect, useState } from "react";

interface Option {
  id: string;
  name: string;
}
interface GuildOptions {
  channels: Option[];
  roles: Option[];
}

// Module-level cache so every select on a page (and across navigations) shares one fetch.
let cache: GuildOptions | null = null;
let inflight: Promise<GuildOptions> | null = null;

function load(): Promise<GuildOptions> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/guild/options")
      .then((r) => (r.ok ? r.json() : { channels: [], roles: [] }))
      .then((d: GuildOptions) => {
        cache = d;
        return d;
      })
      .catch(() => ({ channels: [], roles: [] }));
  }
  return inflight;
}

function useGuildOptions(): GuildOptions | null {
  const [opts, setOpts] = useState<GuildOptions | null>(cache);
  useEffect(() => {
    let alive = true;
    load().then((d) => alive && setOpts(d));
    return () => {
      alive = false;
    };
  }, []);
  return opts;
}

const selectCls =
  "w-full rounded-md border border-border-strong bg-surface-0 px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40";

function Picker({
  value,
  onChange,
  options,
  loaded,
  none,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  loaded: boolean;
  none?: string;
  prefix: string;
}) {
  const known = options.some((o) => o.id === value);
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {none !== undefined && <option value="">{none}</option>}
      {!loaded && value && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {prefix}
          {o.name}
        </option>
      ))}
      {loaded && value && !known && <option value={value}>{prefix}(unknown)</option>}
    </select>
  );
}

export function ChannelSelect({
  value,
  onChange,
  none = "— none —",
}: {
  value: string;
  onChange: (v: string) => void;
  none?: string;
}) {
  const opts = useGuildOptions();
  return (
    <Picker
      value={value}
      onChange={onChange}
      options={opts?.channels ?? []}
      loaded={opts !== null}
      none={none}
      prefix="#"
    />
  );
}

export function RoleSelect({
  value,
  onChange,
  none = "— none —",
}: {
  value: string;
  onChange: (v: string) => void;
  none?: string;
}) {
  const opts = useGuildOptions();
  return (
    <Picker
      value={value}
      onChange={onChange}
      options={opts?.roles ?? []}
      loaded={opts !== null}
      none={none}
      prefix="@"
    />
  );
}

function MultiPicker({
  value,
  onChange,
  options,
  loaded,
  prefix,
  empty,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  loaded: boolean;
  prefix: string;
  empty: string;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const unknown = loaded ? value.filter((id) => !options.some((o) => o.id === id)) : [];
  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border-strong bg-surface-0 p-2">
      {!loaded && <div className="text-xs text-faint">Loading…</div>}
      {loaded && options.length === 0 && <div className="text-xs text-faint">{empty}</div>}
      {options.map((o) => (
        <label key={o.id} className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={value.includes(o.id)}
            onChange={() => toggle(o.id)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          {prefix}
          {o.name}
        </label>
      ))}
      {unknown.map((id) => (
        <label key={id} className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked
            onChange={() => toggle(id)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          {prefix}
          {id} (unknown)
        </label>
      ))}
    </div>
  );
}

export function ChannelMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const opts = useGuildOptions();
  return (
    <MultiPicker
      value={value}
      onChange={onChange}
      options={opts?.channels ?? []}
      loaded={opts !== null}
      prefix="#"
      empty="No channels."
    />
  );
}

export function RoleMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const opts = useGuildOptions();
  return (
    <MultiPicker
      value={value}
      onChange={onChange}
      options={opts?.roles ?? []}
      loaded={opts !== null}
      prefix="@"
      empty="No roles."
    />
  );
}
