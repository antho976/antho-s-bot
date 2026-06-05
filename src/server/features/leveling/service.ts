import { logger } from "@/server/core/logger";
import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { sendToChannel } from "@/server/integrations/discord/send";
import { levelFromXp, type CurveConfig } from "./domain/curve";
import { renderLevelUp } from "./domain/format";
import {
  getConfig,
  getOrCreateLevel,
  listRewards,
  loadCurveMap,
  updateLevelRow,
  type LevelConfig,
  type LevelRow,
} from "./queries";

export interface XpContext {
  guildId: string;
  userId: string;
  channelId?: string; // where it happened, used as announce fallback
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Build the curve inputs for a guild (loads custom XP overrides only when needed). */
export async function curveFor(config: LevelConfig) {
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
  messageInc?: number;
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
    ...(extra?.messageInc ? { messages: row.messages + extra.messageInc } : {}),
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
      const member = await guild.members.fetch(ctx.userId).catch(() => null);
      const rewards = await listRewards(ctx.guildId);
      const reward = rewards.find((r) => r.level === level);
      if (reward && member) {
        await member.roles.add(reward.roleId).catch(() => {});
        // When not stacking, strip any lower reward roles so only the newest remains.
        if (!config.stackRoleRewards) {
          for (const other of rewards) {
            if (other.roleId !== reward.roleId && member.roles.cache.has(other.roleId)) {
              await member.roles.remove(other.roleId).catch(() => {});
            }
          }
        }
      }
      if (config.announce && level >= config.announceMinLevel) {
        const channelId = config.announceChannelId || ctx.channelId;
        if (channelId) {
          const ping = config.announcePing;
          const userToken = ping ? `<@${ctx.userId}>` : (member?.displayName ?? "Someone");
          await sendToChannel(channelId, {
            content: renderLevelUp(config.levelUpMessage, userToken, level),
            allowedMentions: ping ? { users: [ctx.userId] } : { parse: [] },
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
  const onCooldown =
    row.lastMessageAt != null && nowMs - row.lastMessageAt.getTime() < config.msgCooldownSec * 1000;
  if (onCooldown) {
    // No XP this tick, but the message still counts toward the messages leaderboard.
    await updateLevelRow(row.id, { messages: row.messages + 1 });
    return;
  }
  await grantXp(ctx, config, randInt(config.xpMsgMin, config.xpMsgMax), {
    lastMessageAt: new Date(nowMs),
    messageInc: 1,
  });
}

/**
 * Admin action behind /addxp: add (or, with a negative delta, remove) XP for a member and
 * recompute their level. Fires the normal level-up side effects when the level rises.
 */
export async function addXpAdmin(
  guildId: string,
  userId: string,
  delta: number,
  channelId?: string,
): Promise<LevelRow> {
  const config = await getConfig(guildId);
  const row = await getOrCreateLevel(guildId, userId);
  const newXp = Math.max(0, row.xp + Math.trunc(delta));
  const { c, custom } = await curveFor(config);
  const newLevel = levelFromXp(newXp, c, custom);

  await updateLevelRow(row.id, { xp: newXp, level: newLevel });
  if (newLevel > row.level) {
    await onLevelUp({ guildId, userId, channelId }, config, newLevel);
  }
  await track(guildId, "level.addxp", { userId, delta: Math.trunc(delta), level: newLevel });
  return { ...row, xp: newXp, level: newLevel };
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
