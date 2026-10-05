/**
 * Placeholder cats (GAME_DESIGN §13.1): a flat circle per tier with a darker outline, a gold ring
 * for golden cats, and the tier number as a separate upright sprite. Textures are drawn with the
 * 2D canvas API on first use and kept, sized so they are never upscaled (config/view.ts).
 */
import type Phaser from 'phaser';
import {
  GOLD_RING,
  GOLD_RING_DARK,
  GOLD_SHIMMER,
  NUMBER_FILL,
  NUMBER_STROKE,
  NUMBER_STROKE_RATIO,
  OUTLINE_DARKEN,
  TIER_COLORS,
} from '../../config/skin';
import { STAGES } from '../../config/stages';
import { MAX_TIER, tierRadius } from '../../config/tiers';
import {
  NUMBER_HEIGHT_RATIO,
  NUMBER_HEIGHT_RATIO_TWO_DIGITS,
  PLACEHOLDER_GOLD_RING_RATIO,
  PLACEHOLDER_OUTLINE_RATIO,
  PLACEHOLDER_PX_PER_UNIT,
} from '../../config/view';
import { darken } from '../../core/color';
import type { BallSkin, SkinFrame } from './BallSkin';

const PAD_PX = 2;
const FONT_FAMILY = 'Fredoka, system-ui, sans-serif';

/** Texture pixels per world unit for a tier: largest at the first stage that can hold it. */
export function texturePxPerUnit(tier: number): number {
  const first = STAGES.find((stage) => stage.tierCap >= tier) ?? STAGES[STAGES.length - 1];
  return PLACEHOLDER_PX_PER_UNIT / (first?.scale ?? 1);
}

export function tierColor(tier: number): string {
  return TIER_COLORS[tier - 1] ?? '#cccccc';
}

export class PlaceholderSkin implements BallSkin {
  readonly id = 'placeholder';
  private readonly frames = new Map<string, SkinFrame>();

  constructor(private readonly textures: Phaser.Textures.TextureManager) {}

  body(tier: number, golden: boolean): SkinFrame {
    const key = `ph-body-${tier}${golden ? '-gold' : ''}`;
    return (
      this.frames.get(key) ?? this.create(key, tier, (canvas) => drawBody(canvas, tier, golden))
    );
  }

  number(tier: number): SkinFrame {
    const key = `ph-num-${tier}`;
    return this.frames.get(key) ?? this.create(key, tier, (canvas) => drawNumber(canvas, tier));
  }

  prewarm(maxTier: number): void {
    for (let tier = 1; tier <= Math.min(maxTier, MAX_TIER); tier++) {
      this.body(tier, false);
      this.number(tier);
    }
  }

  restore(): void {
    for (const key of this.frames.keys()) {
      const texture = this.textures.get(key) as Phaser.Textures.CanvasTexture;
      texture.refresh();
    }
  }

  private create(key: string, tier: number, draw: (canvas: HTMLCanvasElement) => void): SkinFrame {
    const canvas = document.createElement('canvas');
    draw(canvas);
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
    const frame = { key, unitsPerPixel: 1 / texturePxPerUnit(tier) };
    this.frames.set(key, frame);
    return frame;
  }
}

function context(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

function drawBody(canvas: HTMLCanvasElement, tier: number, golden: boolean): void {
  const r = tierRadius(tier) * texturePxPerUnit(tier);
  const size = 2 * r + 2 * PAD_PX;
  const ctx = context(canvas, size, size);
  const c = canvas.width / 2;
  const color = tierColor(tier);

  // Body with a darker outline (inside the radius, so the circle is exactly r).
  const outline = r * PLACEHOLDER_OUTLINE_RATIO;
  ctx.beginPath();
  ctx.arc(c, c, r - outline / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = outline;
  ctx.strokeStyle = darken(color, OUTLINE_DARKEN);
  ctx.stroke();

  // A soft highlight arc: it turns with the body, so rolling is visible.
  ctx.beginPath();
  ctx.arc(c, c, r * 0.68, -2.5, -1.35);
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.stroke();

  if (!golden) return;
  const ring = r * PLACEHOLDER_GOLD_RING_RATIO;
  ctx.beginPath();
  ctx.arc(c, c, r - ring / 2, 0, Math.PI * 2);
  ctx.lineWidth = ring;
  ctx.strokeStyle = GOLD_RING;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, r - ring, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, ring * 0.22);
  ctx.strokeStyle = GOLD_RING_DARK;
  ctx.stroke();
  // Shimmer: a bright streak on the ring and two sparkles.
  ctx.beginPath();
  ctx.arc(c, c, r - ring / 2, -2.2, -1.5);
  ctx.lineWidth = ring * 0.5;
  ctx.strokeStyle = GOLD_SHIMMER;
  ctx.stroke();
  sparkle(ctx, c + r * 0.42, c - r * 0.5, r * 0.14);
  sparkle(ctx, c - r * 0.5, c + r * 0.38, r * 0.09);
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fillStyle = GOLD_SHIMMER;
  ctx.fill();
}

function drawNumber(canvas: HTMLCanvasElement, tier: number): void {
  const text = String(tier);
  const r = tierRadius(tier) * texturePxPerUnit(tier);
  const fontPx = r * (text.length > 1 ? NUMBER_HEIGHT_RATIO_TWO_DIGITS : NUMBER_HEIGHT_RATIO);
  const font = `700 ${fontPx}px ${FONT_FAMILY}`;
  const stroke = fontPx * NUMBER_STROKE_RATIO;

  const probe = context(canvas, 1, 1);
  probe.font = font;
  const m = probe.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const inkHeight = ascent + m.actualBoundingBoxDescent;
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;

  const ctx = context(canvas, inkWidth + 2 * (stroke + PAD_PX), inkHeight + 2 * (stroke + PAD_PX));
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Centre the ink box, not the advance box, so the number sits in the middle of the cat.
  const x = (canvas.width - inkWidth) / 2 + m.actualBoundingBoxLeft;
  const y = (canvas.height - inkHeight) / 2 + ascent;
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke;
  ctx.strokeStyle = NUMBER_STROKE;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = NUMBER_FILL;
  ctx.fillText(text, x, y);
}
