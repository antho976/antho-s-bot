import { AttachmentBuilder, type Message } from "discord.js";
import { track } from "@/server/core/analytics";
import { generateImage, hasImageProvider } from "@/server/integrations/image-gen";
import type { SmartReplyConfig } from "./queries";

// Runtime-only per-guild daily counter for images (separate from the text reply cap — the image
// API is the real abuse/cost vector). Not persisted: resetting on restart is fine, and this path
// already runs inside the serial reply queue so a plain check-then-bump needs no locking.
const imageDaily = new Map<string, { day: string; count: number }>();
const todayKey = () => new Date().toISOString().slice(0, 10);

function underCap(guildId: string, cap: number): boolean {
  if (cap <= 0) return true; // 0 = unlimited
  const d = imageDaily.get(guildId);
  return !(d && d.day === todayKey() && d.count >= cap);
}

function bump(guildId: string): void {
  const day = todayKey();
  const d = imageDaily.get(guildId);
  if (d && d.day === day) d.count += 1;
  else imageDaily.set(guildId, { day, count: 1 });
}

/**
 * Handle the model's image request: generate the picture and reply with it (caption + attachment).
 * The user explicitly asked for an image, so every outcome answers them — on a cap-hit or a
 * generation failure we say so plainly rather than silently posting the caption (which reads as if
 * an image was attached when none was). Returns false only when there's no provider at all, so the
 * caller falls back to a normal text reply.
 */
export async function trySendImageReply(opts: {
  message: Message<true>;
  config: SmartReplyConfig;
  caption: string;
  imagePrompt: string;
  reason: string;
}): Promise<boolean> {
  const { message, config, caption, imagePrompt, reason } = opts;

  if (!hasImageProvider(config.imageProvider)) return false;

  if (!underCap(message.guildId, config.imageDailyCap)) {
    await sendNote(message, caption, config, "🛑 I've hit today's image limit — try again tomorrow.");
    return true;
  }

  await message.channel.sendTyping().catch(() => {});

  const buffer = await generateImage(imagePrompt, { provider: config.imageProvider });
  if (!buffer) {
    // Don't count a failure against the cap (the path is serialized, so no concurrency to guard).
    await sendNote(
      message,
      caption,
      config,
      "🥲 couldn't generate that image right now — the free image service is busy/rate-limited. Try again in a moment.",
    );
    return true;
  }

  bump(message.guildId);
  await message.reply({
    content: caption ? caption.slice(0, config.maxReplyChars) : undefined,
    files: [new AttachmentBuilder(buffer, { name: "image.jpg" })],
    allowedMentions: { parse: [] },
  });

  await track(message.guildId, "smartreply.image", { reason, provider: config.imageProvider });
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
