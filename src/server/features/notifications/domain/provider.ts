import type { AlertInput } from "./types";

export interface ParsedEvent {
  channelRef: string;
  input: AlertInput;
}

/**
 * A platform integration (Twitch, YouTube, …). This is the seam that lets us add platforms as
 * data rather than engine rewrites (planning/07 seam 3). The engine only talks to this shape.
 */
export interface StreamProvider {
  readonly platform: string;
  /** Register a channel subscription with the platform (EventSub / PubSubHubbub). */
  subscribe(channelRef: string, callbackUrl: string): Promise<void>;
  /** Authenticate an inbound webhook request. */
  verify(headers: Headers, rawBody: string): boolean;
  /** Turn an inbound webhook body into engine events. */
  parse(rawBody: string, headers: Headers): ParsedEvent[];
}
