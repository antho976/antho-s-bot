import { logger } from "@/server/core/logger";
import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { sendToChannel } from "@/server/integrations/discord/send";
import { levelFromXp, type CurveConfig } from "./domain/curve";
import {
  getConfig,
  getOrCreateLevel,
  listRewards,
  loadCurveMap,
  updateLevelRow,
  type LevelConfig,
} from "./queries";

export interface XpContext {
  guildId: string;
  userId: string;
  channelId?: string; // where it happened, used as announce fallback
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function curveFor(config: LevelConfig) {
  const c: CurveConfig = {
    curveType: config.curveType,
    curveBase: config.curveBase,
    curveFactor: config.curveFactor,
  };
  const custom = config.curveType === "custom" ? await loadCurveMap(config.guildId) : undefined;
  return { c, custom };
}

interface GrantExtra {
  voiceMinutes?: number;
  lastMessageAt?: Date;
}

/** Add XP, recompute level, fire level-up side effects on a level increase. */
async function grantXp(
  ctx: XpContext,
  config: LevelConfig,
  amount: number,
  extra?: GrantExtra,
): Promise<void> {
  const row = await getOrCreateLevel(ctx.guildId, ctx.userId);
  const newXp = row.xp + Math.max(0, amount);
  const { c, custom } = await curveFor(config);
  const newLevel = levelFromXp(newXp, c, custom);

  await updateLevelRow(row.id, {
    xp: newXp,
    level: newLevel,
    ...(extra?.voiceMinutes ? { voiceMinutes: row.voiceMinutes + extra.voiceMinutes } : {}),
    ...(extra?.lastMessageAt ? { lastMessageAt: extra.lastMessageAt } : {}),
  });

  if (newLevel > row.level) {
    await onLevelUp(ctx, config, newLevel);
    await track(ctx.guildId, "level.up", { userId: ctx.userId, level: newLevel });
  }
}

async function onLevelUp(ctx: XpContext, config: LevelConfig, level: number): Promise<void> {
  const client = getClient();
  if (client) {
    try {
      const guild = await client.guilds.fetch(ctx.guildId);
      const reward = (await listRewards(ctx.guildId)).find((r) => r.level === level);
      if (reward) {
        const member = await guild.members.fetch(ctx.userId);
        await member.roles.add(reward.roleId).catch(() => {});
      }
      if (config.announce) {
        const channelId = config.announceChannelId || ctx.channelId;
        if (channelId) {
          await sendToChannel(channelId, {
            content: `🎉 <@${ctx.userId}> reached **level ${level}**!`,
            allowedMentions: { users: [ctx.userId] },
          });
        }
      }
    } catch {
      // best-effort — never throw out of XP granting
    }
  }
  logger.info("leveling", `${ctx.userId} reached level ${level}.`);
}

export async function awardMessageXp(ctx: XpContext): Promise<void> {
  const config = await getConfig(ctx.guildId);
  if (!config.enabled) return;
  const row = await getOrCreateLevel(ctx.guildId, ctx.userId);
  const nowMs = Date.now();
  if (row.lastMessageAt && nowMs - row.lastMessageAt.getTime() < config.msgCooldownSec * 1000) {
    return; // still on cooldown
  }
  await grantXp(ctx, config, randInt(config.xpMsgMin, config.xpMsgMax), {
    lastMessageAt: new Date(nowMs),
  });
}

export async function awardReactionXp(ctx: XpContext): Promise<void> {
  const config = await getConfig(ctx.guildId);
  if (!config.enabled || config.xpPerReaction <= 0) return;
  await grantXp(ctx, config, config.xpPerReaction);
}

export async function awardVoiceXp(
  guildId: string,
  userId: string,
  minutes = 1,
): Promise<void> {
  const config = await getConfig(guildId);
  if (!config.enabled || config.xpPerVoiceMin <= 0) return;
  await grantXp({ guildId, userId }, config, config.xpPerVoiceMin * minutes, {
    voiceMinutes: minutes,
  });
}
