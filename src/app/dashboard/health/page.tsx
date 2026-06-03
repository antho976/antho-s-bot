import { getHealth } from "@/server/core/health";
import { PageHeader } from "../_components/ui/page-header";
import { HealthLive } from "./components/health-live";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const initial = await getHealth();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Bot Health" description="Live telemetry — refreshes every 5s." />
      <HealthLive initial={initial} />
    </div>
  );
}
