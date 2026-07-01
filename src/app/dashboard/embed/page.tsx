import { PageHeader } from "../_components/ui/page-header";
import { EmbedCreator } from "./embed-builder";

export const dynamic = "force-dynamic";

export default function EmbedPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Embed Creator"
        description="Design a Discord embed and post it to a channel in this server."
      />
      <EmbedCreator />
    </div>
  );
}
