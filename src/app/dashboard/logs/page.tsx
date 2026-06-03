import { LogsLive } from "./components/logs-live";

export default function LogsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Logs</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Live feed from the bot. Filter by level or text.
      </p>
      <LogsLive />
    </div>
  );
}
