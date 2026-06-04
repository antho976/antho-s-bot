import { AttachmentBuilder } from "discord.js";
import { createCanvas } from "@napi-rs/canvas";

// A fully transparent, wide-but-1px-tall PNG. Set as the embed image, it forces the card to a
// consistent width without enlarging any text or icons (Discord sizes an embed to its widest
// element). Width is the single knob for how wide the card is; height 1 keeps it invisible.
const SPACER_WIDTH = 480;
const SPACER_PNG = createCanvas(SPACER_WIDTH, 1).toBuffer("image/png");
const SPACER_NAME = "rpg-spacer.png";

export const SPACER_URL = `attachment://${SPACER_NAME}`;

/** Fresh attachment wrapping the shared transparent buffer (cheap — buffer is built once). */
export function spacerFile(): AttachmentBuilder {
  return new AttachmentBuilder(SPACER_PNG, { name: SPACER_NAME });
}
