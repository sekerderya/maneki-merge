/**
 * The special balls' look (GAME_DESIGN §15), drawn in code with the 2D canvas API and kept simple
 * until the owner's art: the magnet (a cream disc with a red horseshoe magnet), boulders (grey
 * stone with one iron band per extra merge they need; with `?skin=placeholder` a grey circle
 * showing the merges left), the hanabi (a navy ball with a firework burst and a fuse), the joker
 * (a white ball with a rainbow ring and a gold star) and the gold glow behind golden cats. Like the cats, each texture is
 * drawn at CAT_PX_PER_UNIT for the radius of its size, with the outline's outer edge on the
 * physics radius, and is shared by every stage. Textures are drawn the first time they are asked for.
 */
import type Phaser from 'phaser';
import { CAT_OUTLINE_MIN, CAT_OUTLINE_RATIO } from '../../config/catSprites';
import { MAGNET_SIZE } from '../../config/picks';
import {
  BOULDER_BAND,
  BOULDER_BAND_LIGHT,
  BOULDER_DARK,
  BOULDER_LIGHT,
  BOULDER_RIVET,
  BOULDER_STONE,
  GOLDEN_GLOW,
  HANABI_BALL,
  HANABI_BURST,
  HANABI_FUSE,
  JOKER_BALL,
  JOKER_RAINBOW,
  JOKER_STAR,
  MAGNET_DISC,
  MAGNET_RED,
  MAGNET_RED_DARK,
  MAGNET_STEEL,
  NUMBER_FILL,
  NUMBER_STROKE,
  SPECIAL_INK,
} from '../../config/skin';
import { sizeRadius } from '../../config/tiers';
import { CAT_PX_PER_UNIT } from '../../config/view';
import type { SkinFrame } from './BallSkin';
import { context, drawNumber } from './canvas';

const PAD_PX = 2;
const UNITS_PER_PIXEL = 1 / CAT_PX_PER_UNIT;
/** The glow texture's radius in texture pixels; it is scaled to each golden cat. */
const GLOW_PX = 128;

export class SpecialSkin {
  private readonly frames = new Map<string, SkinFrame>();

  /** `numbers`: boulders show the merges they still need as a number (`?skin=placeholder`). */
  constructor(
    private readonly textures: Phaser.Textures.TextureManager,
    private readonly numbers = false,
  ) {}

  /** The magnet, at the radius of MAGNET_SIZE. */
  magnet(): SkinFrame {
    return this.frame('special-magnet', (canvas) => drawMagnet(canvas, sizeRadius(MAGNET_SIZE)));
  }

  /** A boulder of `size` that needs `hitsLeft` more merges: one band per extra merge. */
  boulder(size: number, hitsLeft: number): SkinFrame {
    const key = `special-boulder-${size}-${hitsLeft}`;
    return this.frame(key, (canvas) =>
      this.numbers
        ? drawBoulderNumber(canvas, sizeRadius(size), hitsLeft)
        : drawBoulder(canvas, sizeRadius(size), hitsLeft - 1),
    );
  }

  /** A hanabi of `size` (GAME_DESIGN §15.6). */
  hanabi(size: number): SkinFrame {
    return this.frame(`special-hanabi-${size}`, (canvas) => drawHanabi(canvas, sizeRadius(size)));
  }

  /** A joker cat of `size` (GAME_DESIGN §15.7). */
  joker(size: number): SkinFrame {
    return this.frame(`special-joker-${size}`, (canvas) => drawJoker(canvas, sizeRadius(size)));
  }

  /**
   * The gold glow behind a golden cat, a soft disc. Its `unitsPerPixel` is for a radius of 1:
   * scale it by the glow's radius in world units.
   */
  glow(): SkinFrame {
    return this.frame('special-glow', drawGlow, 1 / GLOW_PX);
  }

  /** Re-uploads every texture after the WebGL context comes back. */
  restore(): void {
    for (const { key } of this.frames.values()) {
      (this.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
    }
  }

  private frame(
    key: string,
    draw: (canvas: HTMLCanvasElement) => void,
    unitsPerPixel = UNITS_PER_PIXEL,
  ): SkinFrame {
    const existing = this.frames.get(key);
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    draw(canvas);
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
    const frame = { key, unitsPerPixel };
    this.frames.set(key, frame);
    return frame;
  }
}

/** The outline width in texture pixels for a ball of `radius` world units, as the cats'. */
function outlinePx(radius: number): number {
  return Math.max(CAT_OUTLINE_MIN, CAT_OUTLINE_RATIO * radius) * CAT_PX_PER_UNIT;
}

/** A square canvas for a ball of `radius` world units; returns the context and the centre. */
function disc(
  canvas: HTMLCanvasElement,
  radius: number,
): [CanvasRenderingContext2D, number, number] {
  const r = radius * CAT_PX_PER_UNIT;
  const side = 2 * r + 2 * PAD_PX;
  const ctx = context(canvas, side, side);
  return [ctx, canvas.width / 2, r];
}

/** Fills a circle of radius `r` (outer edge) with an ink outline of `line` inside it. */
function outlinedCircle(
  ctx: CanvasRenderingContext2D,
  c: number,
  r: number,
  line: number,
  fill: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.arc(c, c, r - line / 2, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = SPECIAL_INK;
  ctx.stroke();
}

function drawMagnet(canvas: HTMLCanvasElement, radius: number): void {
  const [ctx, c, r] = disc(canvas, radius);
  const line = outlinePx(radius);
  outlinedCircle(ctx, c, r, line, MAGNET_DISC);
  // A horseshoe magnet, opening downwards: a thick red U with steel tips.
  const arm = r * 0.2;
  const outer = r * 0.5;
  const top = c - r * 0.12;
  const bottom = c + r * 0.42;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  const u = (width: number, color: string): void => {
    ctx.beginPath();
    ctx.moveTo(c - outer + arm / 2, bottom);
    ctx.lineTo(c - outer + arm / 2, top);
    ctx.arc(c, top, outer - arm / 2, Math.PI, 0);
    ctx.lineTo(c + outer - arm / 2, bottom);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  u(arm + line, SPECIAL_INK);
  u(arm, MAGNET_RED);
  // A darker inner edge gives the U some depth.
  ctx.beginPath();
  ctx.arc(c, top, outer - arm, Math.PI, 0);
  ctx.lineWidth = arm * 0.3;
  ctx.strokeStyle = MAGNET_RED_DARK;
  ctx.stroke();
  // Steel tips.
  const tip = arm * 0.9;
  for (const side of [-1, 1]) {
    const x = c + side * (outer - arm / 2) - (arm + line) / 2;
    ctx.fillStyle = SPECIAL_INK;
    ctx.fillRect(x, bottom - line / 2, arm + line, tip + line);
    ctx.fillStyle = MAGNET_STEEL;
    ctx.fillRect(x + line / 2, bottom, arm, tip);
  }
}

function drawBoulder(canvas: HTMLCanvasElement, radius: number, bands: number): void {
  const [ctx, c, r] = disc(canvas, radius);
  const line = outlinePx(radius);
  const stone = ctx.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.1, c, c, r);
  stone.addColorStop(0, BOULDER_LIGHT);
  stone.addColorStop(1, BOULDER_STONE);
  outlinedCircle(ctx, c, r, line, stone);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r - line, 0, Math.PI * 2);
  ctx.clip();
  // A few darker speckles, the same on every boulder.
  ctx.fillStyle = BOULDER_DARK;
  for (const [dx, dy, s] of [
    [-0.35, 0.3, 0.09],
    [0.3, -0.4, 0.07],
    [0.42, 0.28, 0.06],
    [-0.1, -0.15, 0.05],
  ] as const) {
    ctx.beginPath();
    ctx.arc(c + dx * r, c + dy * r, s * r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Iron bands across the stone, evenly spaced, each with two rivets.
  const bandHeight = r * 0.2;
  for (let i = 0; i < bands; i++) {
    const y = c + r * ((i + 1) / (bands + 1) - 0.5) * 1.5 - bandHeight / 2;
    ctx.fillStyle = SPECIAL_INK;
    ctx.fillRect(c - r, y - line / 2, 2 * r, bandHeight + line);
    ctx.fillStyle = BOULDER_BAND;
    ctx.fillRect(c - r, y, 2 * r, bandHeight);
    ctx.fillStyle = BOULDER_BAND_LIGHT;
    ctx.fillRect(c - r, y, 2 * r, bandHeight * 0.3);
    ctx.fillStyle = BOULDER_RIVET;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(c + side * r * 0.45, y + bandHeight / 2, bandHeight * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // The outline again over the bands' ends.
  ctx.beginPath();
  ctx.arc(c, c, r - line / 2, 0, Math.PI * 2);
  ctx.lineWidth = line;
  ctx.strokeStyle = SPECIAL_INK;
  ctx.stroke();
}

/** `?skin=placeholder`: a grey circle with the merges it still needs, like the cats' numbers. */
function drawBoulderNumber(canvas: HTMLCanvasElement, radius: number, hitsLeft: number): void {
  const [ctx, c, r] = disc(canvas, radius);
  outlinedCircle(ctx, c, r, outlinePx(radius), BOULDER_STONE);
  const number = document.createElement('canvas');
  drawNumber(number, String(hitsLeft), r * 0.95, NUMBER_FILL, NUMBER_STROKE);
  ctx.drawImage(number, c - number.width / 2, c - number.height / 2);
}

function drawHanabi(canvas: HTMLCanvasElement, radius: number): void {
  const [ctx, c, r] = disc(canvas, radius);
  const line = outlinePx(radius);
  outlinedCircle(ctx, c, r, line, HANABI_BALL);
  // A firework burst: rays in turn of each colour, with a dot past each tip.
  const rays = 12;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.09;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const color = HANABI_BURST[i % HANABI_BURST.length] as string;
    const inner = r * 0.16;
    const outer = r * (i % 2 === 0 ? 0.6 : 0.48);
    const tip = outer + r * 0.1;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
    ctx.lineTo(c + Math.cos(a) * outer, c + Math.sin(a) * outer);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * tip, c + Math.sin(a) * tip, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  // A short fuse at the top, inside the ball's outline.
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = HANABI_FUSE;
  ctx.beginPath();
  ctx.moveTo(c, c - r * 0.72);
  ctx.quadraticCurveTo(c + r * 0.12, c - r * 0.84, c + r * 0.06, c - r * 0.92);
  ctx.stroke();
}

function drawJoker(canvas: HTMLCanvasElement, radius: number): void {
  const [ctx, c, r] = disc(canvas, radius);
  const line = outlinePx(radius);
  outlinedCircle(ctx, c, r, line, JOKER_BALL);
  // A rainbow ring, one arc per colour.
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'butt';
  const step = (Math.PI * 2) / JOKER_RAINBOW.length;
  JOKER_RAINBOW.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(c, c, r * 0.68, i * step - Math.PI / 2, (i + 1) * step - Math.PI / 2);
    ctx.stroke();
  });
  // A five-pointed gold star in the middle.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 === 0 ? r * 0.42 : r * 0.18;
    ctx.lineTo(c + Math.cos(a) * d, c + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = JOKER_STAR;
  ctx.fill();
  ctx.lineWidth = line * 0.6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = SPECIAL_INK;
  ctx.stroke();
}

function drawGlow(canvas: HTMLCanvasElement): void {
  const side = 2 * GLOW_PX;
  const ctx = context(canvas, side, side);
  const glow = ctx.createRadialGradient(GLOW_PX, GLOW_PX, 0, GLOW_PX, GLOW_PX, GLOW_PX);
  glow.addColorStop(0, GOLDEN_GLOW);
  glow.addColorStop(0.62, GOLDEN_GLOW);
  glow.addColorStop(1, 'rgba(255, 211, 77, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, side, side);
}
