// Canvas render of the skill tree: edges as lines, nodes as circles (actives as diamonds),
// coloured by state (allocated / allocatable frontier / locked). Fonts are large because Discord
// downscales the embed image — small text turns to mush. Only landmark nodes (notable/active) are
// labelled; minor "filler" nodes are dots, their names live in the allocate menu.
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { frontier } from "./graph";
import { nodeById, type SkillNode, type SkillTree } from "./trees";

const W = 800;
const H = 620;

const COLOR = {
  bg: "#1e1f22",
  edge: "#3a3d44",
  edgeOn: "#f1c40f",
  locked: "#2b2d31",
  lockedBorder: "#4a4d54",
  frontier: "#33363d",
  frontierBorder: "#2ecc71",
  passive: "#f1c40f",
  active: "#9b59b6",
  allocatedBorder: "#f7dc6f",
  label: "#e6e8eb",
  labelShadow: "#101114",
  title: "#ffffff",
};

function diamond(ctx: SKRSContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

/** Text with a dark outline so it stays legible over edges/nodes. */
function outlinedText(ctx: SKRSContext2D, text: string, x: number, y: number): void {
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLOR.labelShadow;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = COLOR.label;
  ctx.fillText(text, x, y);
}

function drawNode(ctx: SKRSContext2D, n: SkillNode, allocated: boolean, front: boolean): void {
  const big = n.type !== "minor";
  const r = big ? 24 : 13;

  ctx.fillStyle = allocated ? (n.type === "active" ? COLOR.active : COLOR.passive) : front ? COLOR.frontier : COLOR.locked;
  ctx.lineWidth = front ? 4 : 3;
  ctx.strokeStyle = front ? COLOR.frontierBorder : allocated ? COLOR.allocatedBorder : COLOR.lockedBorder;

  if (n.type === "active") diamond(ctx, n.x, n.y, r);
  else {
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Labels: name on top, bonus underneath. (Minors are gone — they live in Talents now.)
  ctx.textAlign = "center";
  let ly = n.y + r + 20;
  if (n.type === "notable" || n.type === "active") {
    ctx.font = "bold 22px sans-serif";
    outlinedText(ctx, n.name, n.x, ly);
    ly += 24;
    ctx.font = "16px sans-serif";
    outlinedText(ctx, n.type === "active" ? "Active" : n.desc, n.x, ly);
  }
}

/** Render the tree to a PNG attachment. `allocated` should already include the root. */
export function renderTreeImage(tree: SkillTree, allocated: Set<string>): AttachmentBuilder {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, W, H);

  // Edges first (so nodes sit on top).
  for (const [a, b] of tree.edges) {
    const na = nodeById(tree, a);
    const nb = nodeById(tree, b);
    if (!na || !nb) continue;
    const on = allocated.has(a) && allocated.has(b);
    ctx.strokeStyle = on ? COLOR.edgeOn : COLOR.edge;
    ctx.lineWidth = on ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
  }

  const front = frontier(tree, allocated);
  for (const n of tree.nodes) drawNode(ctx, n, allocated.has(n.id), front.has(n.id));

  // Title.
  ctx.fillStyle = COLOR.title;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Warrior — Skill Tree", 24, 42);

  // Legend (colour key) along the bottom.
  ctx.font = "18px sans-serif";
  ctx.textBaseline = "middle";
  const legend: [string, string][] = [
    [COLOR.passive, "allocated"],
    [COLOR.frontierBorder, "available"],
    [COLOR.lockedBorder, "locked"],
    [COLOR.active, "active"],
  ];
  let lx = 24;
  const ly = H - 26;
  for (const [color, text] of legend) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx + 9, ly, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOR.label;
    ctx.textAlign = "left";
    ctx.fillText(text, lx + 24, ly);
    lx += 42 + ctx.measureText(text).width;
  }
  ctx.textBaseline = "alphabetic";

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "skill-tree.png" });
}
