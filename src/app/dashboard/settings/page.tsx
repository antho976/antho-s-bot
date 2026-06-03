import { getAccent } from "@/server/core/settings";
import { PageHeader } from "../_components/ui/page-header";
import { AppearanceSettings } from "./components/appearance-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const accent = await getAccent();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Appearance" description="Personalize how the dashboard looks." />
      <AppearanceSettings initial={accent} />
    </div>
  );
}
