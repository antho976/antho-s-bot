import { track } from "@/server/core/analytics";
import { getClient } from "@/server/integrations/discord/client";
import { sendToChannel } from "@/server/integrations/discord/send";
import { getBirthdaysOn, listEnabledConfigs, markRun } from "./queries";

const pad = (n: number) => String(n).padStart(2, "0");

/** Daily tick (runs once per UTC day per guild): announce birthdays + manage the birthday role. */
export async function checkBirthdays(): Promise<void> {
  const configs = await listEnabledConfigs();
  if (!configs.length) return;

  const now = new Date();
  const todayStr = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const client = getClient();

  for (const config of configs) {
    if (config.lastRunDay === todayStr) continue;
    await markRun(config.guildId, todayStr); // guard first so a slow run can't double-fire

    const bdays = await getBirthdaysOn(config.guildId, month, day);

    if (config.channelId && bdays.length) {
      await sendToChannel(config.channelId, {
        content: bdays.map((b) => `🎂 Happy birthday <@${b.userId}>!`).join("\n"),
        allowedMentions: { users: bdays.map((b) => b.userId) },
      });
      await track(config.guildId, "birthday.announce", { count: bdays.length });
    }

    if (config.roleId && client) {
      const guild = client.guilds.cache.get(config.guildId);
      const role = guild?.roles.cache.get(config.roleId);
      if (guild && role) {
        const todayIds = new Set(bdays.map((b) => b.userId));
        for (const [memberId, member] of role.members) {
          if (!todayIds.has(memberId)) await member.roles.remove(config.roleId).catch(() => {});
        }
        for (const id of todayIds) {
          const member = await guild.members.fetch(id).catch(() => null);
          await member?.roles.add(config.roleId).catch(() => {});
        }
      }
    }
  }
}
