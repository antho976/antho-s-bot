import { AttachmentBuilder, type Message } from "discord.js";
import { track } from "@/server/core/analytics";
import { hasMathProvider, renderMath } from "@/server/integrations/math-render";
import type { SmartReplyConfig } from "./queries";

// Runtime-only per-guild daily counter for rendered equations (anti-spam; CodeCogs itself is
// free/unlimited). Not persisted: resetting on restart is fine, and this path already runs inside
// the serial reply queue so a plain check-then-bump needs no locking.
const mathDaily = new Map<string, { day: string; count: number }>();
const todayKey = () => new Date().toISOString().slice(0, 10);

function underCap(guildId: string, cap: number): boolean {
  if (cap <= 0) return true; // 0 = unlimited
  const d = mathDaily.get(guildId);
  return !(d && d.day === todayKey() && d.count >= cap);
}

function bump(guildId: string): void {
  const day = todayKey();
  const d = mathDaily.get(guildId);
  if (d && d.day === day) d.count += 1;
  else mathDaily.set(guildId, { day, count: 1 });
}

/**
 * Handle the model's math request: render the LaTeX to an image and reply with it (caption +
 * attachment). The user explicitly asked, so every outcome answers them — on a cap-hit or a render
 * failure we say so plainly rather than posting a caption that implies an image was attached.
 * Returns false only when there's no provider at all, so the caller falls back to a text reply.
 */
export async function trySendMathReply(opts: {
  message: Message<true>;
  config: SmartReplyConfig;
  caption: string;
  latex: string;
  reason: string;
}): Promise<boolean> {
  const { message, config, caption, latex, reason } = opts;

  if (!hasMathProvider()) return false;

  if (!underCap(message.guildId, config.imageDailyCap)) {
    await sendNote(message, caption, config, "🛑 I've hit today's render limit — try again tomorrow.");
    return true;
  }

  await message.channel.sendTyping().catch(() => {});

  const buffer = await renderMath(latex);
  if (!buffer) {
    // Don't count a failure against the cap (the path is serialized, so no concurrency to guard).
    await sendNote(
      message,
      caption,
      config,
      "🥲 couldn't render that one — the math might be malformed, or the renderer is down. Try rephrasing it.",
    );
    return true;
  }

  bump(message.guildId);
  await message.reply({
    content: caption ? caption.slice(0, config.maxReplyChars) : undefined,
    files: [new AttachmentBuilder(buffer, { name: "math.png" })],
    allowedMentions: { parse: [] },
  });

  await track(message.guildId, "smartreply.math", { reason });
  return true;
}

/** Reply with a short status note, keeping the model's caption (if any) as lead-in. */
async function sendNote(
  message: Message<true>,
  caption: string,
  config: SmartReplyConfig,
  note: string,
): Promise<void> {
  const lead = caption ? `${caption.slice(0, config.maxReplyChars)}\n\n` : "";
  await message.reply({
    content: `${lead}${note}`.slice(0, 2000),
    allowedMentions: { parse: [] },
  });
}
