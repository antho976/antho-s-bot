import { commands } from "@/server/integrations/discord/commands";
import { listBackups } from "@/server/features/backups/service";
import { BackupsPanel } from "./components/backups-panel";

export const dynamic = "force-dynamic";

export default function GeneralPage() {
  const backups = listBackups();
  const slash = commands.map((c) => ({ name: c.data.name, description: c.data.description }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">General</h1>
      <p className="mt-1 text-sm text-neutral-400">Commands reference, data export, and backups.</p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Slash commands</h2>
        <div className="mt-3 space-y-1.5">
          {slash.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-indigo-400">/{c.name}</span>
              <span className="ml-2 text-neutral-400">{c.description}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Custom <code>!commands</code> are managed on the Commands page.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Export</h2>
        <p className="mt-1 text-sm text-neutral-400">Download your configuration + content as JSON.</p>
        <a
          href="/api/export"
          className="mt-2 inline-block rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Export JSON
        </a>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Backups</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Snapshot the whole database (downloadable <code>.db</code> files).
        </p>
        <BackupsPanel initial={backups} />
      </section>
    </div>
  );
}
