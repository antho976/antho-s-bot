// Notifications feature module — Twitch & YouTube live/upload alerts.
// The toggle/registry wiring lands when the feature registry is built; for now this is the
// module's public surface.
export const notificationsModule = {
  key: "notifications",
  name: "Stream Notifications",
  description: "Twitch & YouTube live and upload alerts",
} as const;

export { handleStreamEvent } from "./service";
export type { AlertInput, StreamEventType } from "./domain/types";
