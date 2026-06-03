import { getHealth } from "@/server/core/health";
import { HealthLive } from "./components/health-live";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const initial = await getHealth();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Bot Health</h1>
      <p className="mt-1 text-sm text-neutral-400">Live telemetry — refreshes every 5s.</p>
      <HealthLive initial={initial} />
    </div>
  );
}
