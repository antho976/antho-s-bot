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
 * Try to generate the model's requested image and reply with it (caption + attachment).
 * Returns true when an image was sent; false (cap hit, no provider, or generation failed) so the
 * caller can fall back to a plain text reply.
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
  if (!underCap(message.guildId, config.imageDailyCap)) return false;

  bump(message.guildId); // reserve before the slow call so a burst can't blow past the cap
  await message.channel.sendTyping().catch(() => {});

  const buffer = await generateImage(imagePrompt, { provider: config.imageProvider });
  if (!buffer) return false;

  await message.reply({
    content: caption ? caption.slice(0, config.maxReplyChars) : undefined,
    files: [new AttachmentBuilder(buffer, { name: "image.jpg" })],
    allowedMentions: { parse: [] },
  });

  await track(message.guildId, "smartreply.image", { reason, provider: config.imageProvider });
  return true;
}
