import type { ChatMessage } from "@/server/integrations/openrouter/client";

// Pure prompt assembly: persona + owner-filled memory become the system prompt; recent channel
// messages become the user/assistant turns. Multiple humans are all `user` turns prefixed with
// the speaker's name so the model can tell who said what; the bot's own past messages are
// `assistant` turns.

export interface HistoryItem {
  authorName: string;
  content: string;
  isSelf: boolean; // true if this was the bot's own message
}

export function buildChatMessages(opts: {
  botName: string;
  persona: string;
  memory: string[];
  history: HistoryItem[];
}): ChatMessage[] {
  const { botName, persona, memory, history } = opts;

  const lines: string[] = [
    `You are ${botName}, a member of a Discord server, chatting casually with people.`,
  ];
  if (persona.trim()) lines.push(persona.trim());

  if (memory.length > 0) {
    lines.push("", "Things you know and should keep in mind:");
    for (const m of memory) lines.push(`- ${m}`);
  }

  lines.push(
    "",
    "How to reply:",
    "- Keep it short and conversational, like a real Discord message (usually 1-2 sentences).",
    "- Match the tone of the chat. Be natural, not formal or robotic.",
    "- Don't use headings or bullet-point lists. Don't write essays.",
    "- Don't greet or restate the question every time — just respond.",
    "- Stay in character. Don't mention being an AI, a bot, or a model unless directly asked.",
    "- Reply with only your message text, no name prefix.",
  );

  const system: ChatMessage = { role: "system", content: lines.join("\n") };

  const turns: ChatMessage[] = history
    .filter((h) => h.content.trim().length > 0)
    .map((h) =>
      h.isSelf
        ? { role: "assistant", content: h.content }
        : { role: "user", content: `${h.authorName}: ${h.content}` },
    );

  return [system, ...turns];
}
