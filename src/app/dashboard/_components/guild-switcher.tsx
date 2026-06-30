"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectGuild } from "../_actions/guild";

interface Props {
  guilds: { id: string; name: string }[];
  current: string;
}

const selectCls =
  "w-full rounded-md border border-border-strong bg-surface-0 px-2 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-50";

/** Header dropdown for switching which server the dashboard manages. Hidden with <2 guilds. */
export function GuildSwitcher({ guilds, current }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (guilds.length < 2) return null;

  return (
    <select
      aria-label="Active server"
      value={current}
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        startTransition(async () => {
          await selectGuild(id);
          router.refresh();
        });
      }}
      className={selectCls}
    >
      {guilds.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
