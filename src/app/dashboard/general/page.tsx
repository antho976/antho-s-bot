import { commands } from "@/server/integrations/discord/commands";
import { listBackups } from "@/server/features/backups/service";
import { PageHeader } from "../_components/ui/page-header";
import { BackupsPanel } from "./components/backups-panel";

export const dynamic = "force-dynamic";

export default function GeneralPage() {
  const backups = listBackups();
  const slash = commands.map((c) => ({ name: c.data.name, description: c.data.description }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="General" description="Commands reference, data export, and backups." />

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-text">Slash commands</h2>
        <div className="mt-3 space-y-1.5">
          {slash.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-accent">/{c.name}</span>
              <span className="ml-2 text-muted">{c.description}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-faint">
          Custom <code>!commands</code> are managed on the Commands page.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text">Export</h2>
        <p className="mt-1 text-sm text-muted">Download your configuration + content as JSON.</p>
        <a
          href="/api/export"
          className="mt-2 inline-block rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast transition hover:bg-accent-strong"
        >
          Export JSON
        </a>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text">Backups</h2>
        <p className="mt-1 text-sm text-muted">
          Snapshot the whole database (downloadable <code>.db</code> files).
        </p>
        <BackupsPanel initial={backups} />
      </section>
    </div>
  );
}
