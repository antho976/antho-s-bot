// Pure "is this message worth a random reply?" filter. Mentions bypass this entirely
// (see decide.ts) — this only gates the chance-based path so the bot ignores low-signal
// chatter: commands, bare links, single emoji, "lol", "k", punctuation, etc.

const COMMAND_PREFIXES = ["!", "/", ".", "?", "$", "-", ">", "~", "+", "=", "#"];

export function isReplyWorthy(raw: string, minLength: number): boolean {
  const content = (raw ?? "").trim();
  if (!content) return false;

  // Looks like a bot command invocation — leave it alone.
  if (COMMAND_PREFIXES.includes(content[0]!)) return false;

  // Strip the things that carry no conversational text, then judge what's left.
  const stripped = content
    .replace(/https?:\/\/\S+/gi, "") // links
    .replace(/<a?:\w+:\d+>/g, "") // custom emoji
    .replace(/<@!?\d+>/g, "") // user mentions
    .replace(/<@&\d+>/g, "") // role mentions
    .replace(/<#\d+>/g, "") // channel mentions
    .trim();

  if (stripped.length < minLength) return false;

  // Require a couple of actual letters (any script) — filters "....", "??", pure emoji.
  const letters = (stripped.match(/\p{L}/gu) ?? []).length;
  return letters >= 2;
}
