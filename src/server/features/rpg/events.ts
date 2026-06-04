import { performance } from "node:perf_hooks";
import { Events, MessageFlags, type Client } from "discord.js";
import { logger } from "@/server/core/logger";
import { RPG_PREFIX } from "./domain/custom-id";
import { recordClick } from "./metrics";
import { handleRpgComponent, type RpgResponse } from "./router";

/** Users with a click currently being handled — deferUpdate keeps buttons live, so this guards
 *  against a rapid double-click double-acting (e.g. two adventures off one cooldown). */
const inFlight = new Set<string>();

/**
 * Routes RPG button/select interactions (custom_id `rpg:…`) into the hub router.
 *
 * We ack with `deferUpdate()` first — Discord shows NO loading spinner — then `editReply()` the
 * new screen in. Same Discord round-trip as `update()`, but the wait is hidden behind a live UI
 * instead of a spinning button (the v1 feel). Latency is sampled as ack (spinner clears) vs
 * content (screen lands), surfaced on the dashboard RPG page.
 */
export function registerRpgEvents(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith(`${RPG_PREFIX}:`)) return;

    // Drop a user's overlapping click (ack it so Discord doesn't error, then bail).
    if (inFlight.has(interaction.user.id)) {
      await interaction.deferUpdate().catch(() => {});
      return;
    }
    inFlight.add(interaction.user.id);

    const recvWall = Date.now();
    const t0 = performance.now();
    try {
      // Ack first — no spinner.
      try {
        await interaction.deferUpdate();
      } catch (err) {
        logger.error("rpg", "deferUpdate failed (expired/already acked)", err);
        return;
      }
      const ack = performance.now() - t0;

      const tWork = performance.now();
      let resp: RpgResponse | null = null;
      try {
        resp = await handleRpgComponent(interaction);
      } catch (err) {
        logger.error("rpg", "Component handler failed", err);
        resp = { kind: "reply", content: "Something went wrong." };
      }
      const processing = performance.now() - tWork;

      const tContent = performance.now();
      try {
        if (resp?.kind === "update") {
          // files/attachments explicit so the skill-tree image attaches and is cleared when you
          // navigate to a view that has none.
          await interaction.editReply({
            ...resp.screen,
            files: resp.screen.files ?? [],
            attachments: [],
          });
        } else if (resp?.kind === "reply") {
          await interaction.followUp({ content: resp.content, flags: MessageFlags.Ephemeral });
        }
      } catch (err) {
        logger.error("rpg", "Component response failed", err);
      }
      const content = performance.now() - tContent;

      recordClick({
        gateway: Math.max(0, recvWall - interaction.createdTimestamp),
        ack,
        processing,
        content,
      });
    } finally {
      inFlight.delete(interaction.user.id);
    }
  });
}
