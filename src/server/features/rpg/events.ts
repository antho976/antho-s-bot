import { performance } from "node:perf_hooks";
import { Events, MessageFlags, type Client } from "discord.js";
import { logger } from "@/server/core/logger";
import { RPG_PREFIX } from "./domain/custom-id";
import { recordClick } from "./metrics";
import { handleRpgComponent, type RpgResponse } from "./router";

/**
 * Routes RPG button/select interactions (custom_id `rpg:…`) into the hub router, applies the
 * result to Discord, and samples the latency split: gateway delivery, our processing (DB+render),
 * and the Discord round-trip — surfaced on the dashboard RPG page.
 */
export function registerRpgEvents(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith(`${RPG_PREFIX}:`)) return;

    const recvWall = Date.now();
    const start = performance.now();

    let resp: RpgResponse | null = null;
    try {
      resp = await handleRpgComponent(interaction);
    } catch (err) {
      logger.error("rpg", "Component handler failed", err);
      resp = { kind: "reply", content: "Something went wrong." };
    }
    const afterWork = performance.now();

    try {
      if (resp?.kind === "update") {
        await interaction.update(resp.screen);
      } else if (resp?.kind === "reply") {
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: resp.content, flags: MessageFlags.Ephemeral });
        }
      }
    } catch (err) {
      logger.error("rpg", "Component response failed", err);
    }
    const done = performance.now();

    if (resp) {
      recordClick({
        gateway: Math.max(0, recvWall - interaction.createdTimestamp),
        processing: afterWork - start,
        discord: done - afterWork,
      });
    }
  });
}
