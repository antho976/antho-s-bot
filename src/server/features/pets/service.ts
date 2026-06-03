import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { getSubmission, setStatus, type PetSubmission } from "./queries";

/** Approve/deny a submission, DM the submitter (best-effort), and return the updated row. */
export async function reviewSubmission(
  id: number,
  status: "approved" | "denied",
  reviewedBy: string,
): Promise<PetSubmission | null> {
  const sub = await getSubmission(id);
  if (!sub) return null;

  await setStatus(id, status, reviewedBy);
  await track(sub.guildId, `pet.${status}`, {});

  const client = getClient();
  if (client) {
    const user = await client.users.fetch(sub.userId).catch(() => null);
    await user
      ?.send(`Your pet submission **${sub.petName}** was **${status}**.`)
      .catch(() => {});
  }

  return { ...sub, status, reviewedBy, reviewedAt: new Date() };
}
