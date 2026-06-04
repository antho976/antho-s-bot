// Canvas render of the skill tree: edges as lines, nodes as circles (actives as diamonds),
// coloured by state (allocated / allocatable frontier / locked). Plain shapes — no emoji — so it
// renders anywhere. The select menu carries node names; the image carries the shape + progress.
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { frontier } from "./graph";
import { nodeById, type SkillNode, type SkillTree } from "./trees";

const W = 720;
const H = 520;

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
  label: "#cdd0d6",
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

function drawNode(ctx: SKRSContext2D, n: SkillNode, allocated: boolean, front: boolean): void {
  const big = n.type !== "minor";
  const r = big ? 15 : 9;

  ctx.fillStyle = allocated ? (n.type === "active" ? COLOR.active : COLOR.passive) : front ? COLOR.frontier : COLOR.locked;
  ctx.lineWidth = front ? 3 : 2;
  ctx.strokeStyle = front ? COLOR.frontierBorder : allocated ? COLOR.allocatedBorder : COLOR.lockedBorder;

  if (n.type === "active") diamond(ctx, n.x, n.y, r);
  else {
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  if (big) {
    ctx.fillStyle = COLOR.label;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(n.name, n.x, n.y + r + 14);
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
    ctx.lineWidth = on ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
  }

  const front = frontier(tree, allocated);
  for (const n of tree.nodes) drawNode(ctx, n, allocated.has(n.id), front.has(n.id));

  // Header + legend.
  ctx.fillStyle = COLOR.title;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Warrior — Skill Tree", 18, 30);

  ctx.font = "12px sans-serif";
  const legend: [string, string][] = [
    [COLOR.passive, "allocated"],
    [COLOR.frontierBorder, "available"],
    [COLOR.lockedBorder, "locked"],
    [COLOR.active, "active (Dungeons)"],
  ];
  let lx = 18;
  for (const [color, text] of legend) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx + 6, H - 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOR.label;
    ctx.fillText(text, lx + 16, H - 14);
    lx += 30 + ctx.measureText(text).width;
  }

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "skill-tree.png" });
}
