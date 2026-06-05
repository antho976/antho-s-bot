// Canvas render of a gathering skill's talent panel: a themed scene background per skill (forest for
// woodcutting, cavern for mining, meadow for herbalism, sea for fishing) drawn behind four talent
// cards. Each card shows the talent name, what it does (smaller), and rank pips coloured on a
// green→orange scale so the level invested reads at a glance. Pure-primitive drawing — no art assets
// or colour-emoji font — mirroring skills/render.ts. Deterministic (fixed motif positions) so the
// image doesn't jitter between re-renders on navigation.
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";
import { GATHER_SKILL_MAP, GATHER_TALENTS, type GatherSkillId } from "../gather-config";

const W = 820;
const H = 500;

type Theme = { top: string; bottom: string; accent: string };

/** Per-skill palette: a vertical background gradient + an accent for rank text / blossoms / ore. */
const THEME: Record<GatherSkillId, Theme> = {
  mining: { top: "#322a22", bottom: "#171310", accent: "#d08a5a" },
  woodcutting: { top: "#1d3a24", bottom: "#0e1d13", accent: "#5bbf66" },
  herbalism: { top: "#2a3a1c", bottom: "#16220f", accent: "#c77dff" },
  fishing: { top: "#133b4a", bottom: "#091821", accent: "#4fc3d6" },
};

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Text with a dark outline so it stays legible over the scene. */
function outlined(ctx: SKRSContext2D, text: string, x: number, y: number, fill: string): void {
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// ── Per-skill scene motifs (drawn over the gradient, then dimmed by drawBackground) ──────────────

function drawCavern(ctx: SKRSContext2D, t: Theme): void {
  // Stalactites hanging from the top.
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  const tips = [40, 130, 230, 350, 470, 600, 720, 790];
  tips.forEach((x, i) => {
    const len = 72 + (i % 4) * 34;
    const w = 30 - (i % 3) * 5;
    ctx.beginPath();
    ctx.moveTo(x - w, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x, len);
    ctx.closePath();
    ctx.fill();
  });
  // Ore veins with bright specks near the floor.
  const veins: [number, number][] = [[40, H - 78], [240, H - 48], [470, H - 90], [660, H - 58]];
  for (const [vx, vy] of veins) {
    ctx.strokeStyle = "rgba(0,0,0,0.36)";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + 64, vy - 30);
    ctx.lineTo(vx + 128, vy + 12);
    ctx.stroke();
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.8;
    for (let s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.arc(vx + 24 + s * 30, vy - 15 + (s % 2) * 19, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawTree(ctx: SKRSContext2D, x: number, baseY: number, treeH: number, halfW0: number): void {
  ctx.fillRect(x - 6, baseY - treeH * 0.4, 12, treeH * 0.4);
  for (let layer = 0; layer < 3; layer++) {
    const ly = baseY - treeH * 0.4 - layer * (treeH * 0.18);
    const halfW = halfW0 - layer * (halfW0 * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, ly - treeH * 0.3);
    ctx.lineTo(x - halfW, ly);
    ctx.lineTo(x + halfW, ly);
    ctx.closePath();
    ctx.fill();
  }
}

function drawForest(ctx: SKRSContext2D, _t: Theme): void {
  const baseY = H - 4;
  // Back row — smaller and lighter, for depth.
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  [30, 120, 210, 300, 400, 500, 610, 720, 800].forEach((x, i) =>
    drawTree(ctx, x, baseY - 22, 120 + (i % 3) * 34, 32),
  );
  // Front row — taller and darker.
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  [60, 160, 270, 380, 480, 580, 680, 780].forEach((x, i) =>
    drawTree(ctx, x, baseY, 190 + (i % 3) * 52, 48),
  );
}

function drawMeadow(ctx: SKRSContext2D, t: Theme): void {
  const glow = ctx.createLinearGradient(0, 40, 0, 240);
  glow.addColorStop(0, "rgba(150,170,90,0.13)");
  glow.addColorStop(1, "rgba(150,170,90,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 40, W, 200);

  const stalks = [50, 120, 190, 260, 340, 430, 520, 610, 700, 780];
  stalks.forEach((x, i) => {
    const baseY = H - 4;
    const hgt = 95 + (i % 4) * 40;
    ctx.strokeStyle = "rgba(0,0,0,0.32)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + (i % 2 ? 16 : -16), baseY - hgt * 0.6, x, baseY - hgt);
    ctx.stroke();
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.arc(x, baseY - hgt, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawFish(ctx: SKRSContext2D, fx: number, fy: number, s: number): void {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(fx, fy, 46 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fx + 44 * s, fy);
  ctx.lineTo(fx + 74 * s, fy - 22 * s);
  ctx.lineTo(fx + 74 * s, fy + 22 * s);
  ctx.closePath();
  ctx.fill();
}

function drawSea(ctx: SKRSContext2D, _t: Theme): void {
  // A brighter surface band fading into the deep.
  const surf = ctx.createLinearGradient(0, 50, 0, 230);
  surf.addColorStop(0, "rgba(120,200,220,0.13)");
  surf.addColorStop(1, "rgba(120,200,220,0)");
  ctx.fillStyle = surf;
  ctx.fillRect(0, 50, W, 180);

  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 3;
  for (let row = 0; row < 6; row++) {
    const y = 90 + row * 70;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 40) {
      const yy = y + Math.sin(x / 40 + row) * 8;
      if (x === -20) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  drawFish(ctx, 150, 420, 0.9);
  drawFish(ctx, 660, 360, 1.2);
}

function drawBackground(ctx: SKRSContext2D, skillId: GatherSkillId, t: Theme): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, t.top);
  g.addColorStop(1, t.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (skillId === "mining") drawCavern(ctx, t);
  else if (skillId === "woodcutting") drawForest(ctx, t);
  else if (skillId === "herbalism") drawMeadow(ctx, t);
  else drawSea(ctx, t);

  // Dim the scene a touch so the cards and text on top stay readable.
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(0, 0, W, H);
}

// ── Talent cards ─────────────────────────────────────────────────────────────────────────────────

function drawTalentCard(
  ctx: SKRSContext2D,
  tal: (typeof GATHER_TALENTS)[number],
  rank: number,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
): void {
  const maxed = rank >= tal.maxRank;

  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = "rgba(12,12,16,0.5)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = maxed ? "#ffd54f" : "rgba(255,255,255,0.18)";
  ctx.stroke();

  const pad = 22;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "bold 25px sans-serif";
  ctx.fillStyle = maxed ? "#ffd54f" : "#ffffff";
  ctx.fillText(tal.name, x + pad, y + 42);

  ctx.textAlign = "right";
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText(`${rank}/${tal.maxRank}`, x + w - pad, y + 42);

  ctx.textAlign = "left";
  ctx.font = "17px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillText(`${tal.unit} per rank`, x + pad, y + 72);

  // Rank pips: filled up to the current rank, each coloured on a green→orange ramp so the level
  // invested is distinguishable at a glance (rank 1 green … max rank orange).
  const pipY = y + h - 40;
  const pipGap = 8;
  const pipW = (w - pad * 2 - pipGap * (tal.maxRank - 1)) / tal.maxRank;
  const pipH = 18;
  for (let k = 1; k <= tal.maxRank; k++) {
    const px = x + pad + (k - 1) * (pipW + pipGap);
    roundRect(ctx, px, pipY, pipW, pipH, 5);
    if (k <= rank) {
      const hue = 130 - ((k - 1) / Math.max(1, tal.maxRank - 1)) * 105;
      ctx.fillStyle = `hsl(${hue}, 68%, 52%)`;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.10)";
    }
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();
  }
}

/** Render a skill's talent panel (scene + four cards) to a PNG attachment. */
export function renderGatherTalentsImage(
  skillId: string,
  ranks: Record<string, number>,
  level: number,
  points: number,
): AttachmentBuilder {
  const skill = GATHER_SKILL_MAP[skillId];
  const theme = THEME[skillId as GatherSkillId] ?? THEME.mining;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, (skillId as GatherSkillId) in THEME ? (skillId as GatherSkillId) : "mining", theme);

  // Header: skill name (left) + level / points (right).
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = "bold 32px sans-serif";
  outlined(ctx, `${skill?.name ?? "Gathering"} — Talents`, 30, 50, "#ffffff");
  ctx.textAlign = "right";
  ctx.font = "bold 20px sans-serif";
  outlined(ctx, `Level ${level}  ·  ${points} ${points === 1 ? "point" : "points"}`, W - 30, 50, theme.accent);

  // Four talents in a 2×2 grid.
  const gap = 24;
  const mx = 30;
  const top = 84;
  const cardW = (W - mx * 2 - gap) / 2;
  const cardH = (H - top - 30 - gap) / 2;
  GATHER_TALENTS.forEach((tal, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = mx + col * (cardW + gap);
    const y = top + row * (cardH + gap);
    drawTalentCard(ctx, tal, ranks[tal.id] ?? 0, x, y, cardW, cardH, theme.accent);
  });

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "gather-talents.png" });
}
