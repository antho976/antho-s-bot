import { AttachmentBuilder, type MessageCreateOptions } from "discord.js";
import { track } from "@/server/core/analytics";
import { sendToChannel } from "@/server/integrations/discord/send";
import { renderCard } from "./domain/render";
import { getConfig, pickBackground } from "./queries";

export interface CardInput {
  guildId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  serverName: string;
  memberCount: number;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

async function send(
  channelId: string,
  mode: string,
  template: string,
  title: string,
  kind: "welcome" | "goodbye",
  input: CardInput,
  random: boolean,
): Promise<void> {
  const content = applyTemplate(template, {
    user: `<@${input.userId}>`,
    username: input.username,
    server: input.serverName,
    memberCount: String(input.memberCount),
  });

  const payload: MessageCreateOptions = {
    allowedMentions: { users: [input.userId] },
  };
  if (mode !== "image") payload.content = content;

  if (mode !== "text") {
    try {
      const buffer = await renderCard({
        title,
        username: input.username,
        subtitle: input.serverName,
        avatarUrl: input.avatarUrl,
        backgroundUrl: await pickBackground(input.guildId, kind, random),
      });
      payload.files = [new AttachmentBuilder(buffer, { name: `${kind}.png` })];
    } catch {
      // artwork failed — fall back to text only
      if (!payload.content) payload.content = content;
    }
  }

  await sendToChannel(channelId, payload);
}

export async function handleJoin(input: CardInput): Promise<void> {
  const config = await getConfig(input.guildId);
  if (!config.welcomeEnabled || !config.welcomeChannelId) return;
  await send(
    config.welcomeChannelId,
    config.welcomeMode,
    config.welcomeMessage,
    "Welcome!",
    "welcome",
    input,
    config.randomBackground,
  );
  await track(input.guildId, "welcome.join", { userId: input.userId });
}

export async function handleLeave(input: CardInput): Promise<void> {
  const config = await getConfig(input.guildId);
  if (!config.goodbyeEnabled || !config.goodbyeChannelId) return;
  await send(
    config.goodbyeChannelId,
    config.goodbyeMode,
    config.goodbyeMessage,
    "Goodbye",
    "goodbye",
    input,
    config.randomBackground,
  );
  await track(input.guildId, "welcome.leave", { userId: input.userId });
}
