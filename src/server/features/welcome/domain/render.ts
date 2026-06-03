import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";

export interface CardOptions {
  title: string; // "Welcome!" / "Goodbye"
  username: string;
  subtitle?: string; // e.g. server name
  avatarUrl: string;
  backgroundUrl?: string | null;
  accent?: string; // hex
}

const W = 1024;
const H = 400;

function drawCover(ctx: SKRSContext2D, img: Image, w: number, h: number): void {
  const ratio = Math.max(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  ctx.drawImage(img, (w - nw) / 2, (h - nh) / 2, nw, nh);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Render a welcome/goodbye card (avatar + name on a background) → PNG buffer. */
export async function renderCard(opts: CardOptions): Promise<Buffer> {
  const accent = opts.accent ?? "#6366f1";
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background: image (cover) or gradient fallback.
  let drewBg = false;
  if (opts.backgroundUrl) {
    try {
      drawCover(ctx, await loadImage(opts.backgroundUrl), W, H);
      drewBg = true;
    } catch {
      // fall through to gradient
    }
  }
  if (!drewBg) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);

  // Avatar (clipped circle + ring).
  const r = 110;
  const cx = 175;
  const cy = H / 2;
  try {
    const avatar = await loadImage(opts.avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } catch {
    // no avatar — skip
  }
  ctx.lineWidth = 8;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Text block.
  const textX = 330;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(opts.title, textX, cy - 45);
  ctx.font = "bold 64px sans-serif";
  ctx.fillText(truncate(opts.username, 16), textX, cy + 25);
  if (opts.subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "30px sans-serif";
    ctx.fillText(truncate(opts.subtitle, 30), textX, cy + 78);
  }

  return canvas.toBuffer("image/png");
}
