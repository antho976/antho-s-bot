// Dev-only RPG cheats — gated behind DEV_TOOLS so they exist on the test bot and NOT in production.
// The render + router layers also guard on DEV_TOOLS; this no-op is the final backstop.
import { DEV_TOOLS } from "@/env";
import { classDef, maxHp } from "./domain/stats";
import { addItem, updatePlayer, type RpgPlayer } from "./queries";

/** Cheat actions exposed on the dev panel (custom_id `rpg:<owner>:dev:<action>`). */
export const DEV_ACTIONS = ["level", "gold", "keys", "heal"] as const;

/** Apply a single dev cheat to a player. No-op unless DEV_TOOLS is on. */
export async function applyDevCheat(player: RpgPlayer, action: string): Promise<void> {
  if (!DEV_TOOLS) return;
  const cls = classDef(player.classId);
  switch (action) {
    case "level": {
      const level = Math.min(100, player.level + 5);
      await updatePlayer(player.id, { level, hp: maxHp(cls, level) });
      return;
    }
    case "gold":
      await updatePlayer(player.id, { gold: player.gold + 1000 });
      return;
    case "keys":
      await addItem(player.id, "key", 10);
      return;
    case "heal":
      await updatePlayer(player.id, { hp: maxHp(cls, player.level) });
      return;
  }
}
