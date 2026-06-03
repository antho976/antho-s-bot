import { PageHeader } from "../_components/ui/page-header";
import { LogsLive } from "./components/logs-live";

export default function LogsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Logs" description="Live feed from the bot. Filter by level or text." />
      <LogsLive />
    </div>
  );
}
