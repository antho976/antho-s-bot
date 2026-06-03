import { db } from "@/server/db";
import { analyticsEvents } from "@/server/db/schema";

/**
 * The single instrumentation sink (planning/08). Every feature calls this; new metrics are
 * new event types, not migrations. Today it writes to the DB; the function is the seam where
 * an external analytics backend could later be added without touching call sites.
 *
 * Must never throw out of the caller — analytics is best-effort.
 */
export async function track(
  guildId: string,
  eventType: string,
  props?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      guildId,
      eventType,
      propsJson: props ? JSON.stringify(props) : null,
    });
  } catch {
    // swallow — never break a feature because analytics failed
  }
}
