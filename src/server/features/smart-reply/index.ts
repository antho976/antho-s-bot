// Smart-reply feature module — AI chat replies via OpenRouter (persona + owner-filled memory,
// chance-based plus always-on-mention). Configured from the `/ai` command.
export const smartReplyModule = {
  key: "smart-reply",
  name: "Smart Reply",
  description: "AI chat replies via OpenRouter — persona, memory, chance-based and on @mention",
} as const;

export { handleSmartReply } from "./service";
export { registerSmartReplyEvents } from "./events";
