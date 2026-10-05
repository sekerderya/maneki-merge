/**
 * Placeholder cats (GAME_DESIGN §13.1): a flat circle per tier with a darker outline, a gold ring
 * for golden cats, and the tier number as a separate upright sprite. Textures are drawn with the
 * 2D canvas API, one set per stage at that stage's zoom (skinSets.ts), so they are never upscaled
 * and never shrunk much. A set is drawn ahead of time during the expansion into its stage; any
 * frame still missing when asked for is drawn on the spot.
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
import { FIRST_STAGE, STAGES } from '../../config/stages';
import { tierRadius } from '../../config/tiers';
import {
  NUMBER_HEIGHT_RATIO,
  NUMBER_HEIGHT_RATIO_TWO_DIGITS,
  PLACEHOLDER_GOLD_RING_RATIO,
  PLACEHOLDER_OUTLINE_RATIO,
} from '../../config/view';
import { darken } from '../../core/color';
import type { BallSkin, SkinFrame } from './BallSkin';
import { stageSkinSet, texturePxPerUnit } from './skinSets';

const PAD_PX = 2;
const FONT_FAMILY = 'Fredoka, system-ui, sans-serif';

/** A body ('b'), a golden body ('g') or an upright number ('n'). */
type FrameKind = 'b' | 'g' | 'n';
type FrameItem = readonly [tier: number, kind: FrameKind];

/** Every frame a stage needs, the dropper's tiers first (they show right after the expansion). */
const STAGE_ITEMS: readonly (readonly FrameItem[])[] = STAGES.map(({ stage }) => {
  const set = stageSkinSet(stage);
  const items: FrameItem[] = [];
  for (const tier of set.golden) items.push([tier, 'b'], [tier, 'n']);
  for (const tier of set.golden) items.push([tier, 'g']);
  for (const tier of set.tiers) {
    if (!set.golden.includes(tier)) items.push([tier, 'b'], [tier, 'n']);
  }
  return items;
});

export function tierColor(tier: number): string {
  return TIER_COLORS[tier - 1] ?? '#cccccc';
}

export class PlaceholderSkin implements BallSkin {
  readonly id = 'placeholder';
  /** Frames per stage, keyed by kind + tier ('b4', 'g4', 'n4'). */
  private readonly sets = new Map<number, Map<string, SkinFrame>>();
  private active = FIRST_STAGE;
  private previous = FIRST_STAGE;
  private rev = 0;

  constructor(private readonly textures: Phaser.Textures.TextureManager) {}

  get stage(): number {
    return this.active;
  }

  get revision(): number {
    return this.rev;
  }

  body(tier: number, golden: boolean): SkinFrame {
    return this.frame(this.active, tier, golden ? 'g' : 'b');
  }

  number(tier: number): SkinFrame {
    return this.frame(this.active, tier, 'n');
  }

  prepare(stage: number, budgetMs: number): boolean {
    const start = performance.now();
    let drew = false;
    for (const [tier, kind] of STAGE_ITEMS[stage - 1] ?? []) {
      if (this.sets.get(stage)?.has(kind + tier)) continue;
      if (drew && performance.now() - start >= budgetMs) return false;
      this.frame(stage, tier, kind);
      drew = true;
    }
    return true;
  }

  setStage(stage: number): void {
    if (stage === this.active) return;
    this.prepare(stage, Infinity);
    this.previous = this.active;
    this.active = stage;
    this.rev++;
    // Keep stage 1 (every run starts there) and the previous set: cats popped at the cash-out
    // still show it while they fade.
    for (const kept of [...this.sets.keys()]) {
      if (kept !== FIRST_STAGE && kept !== this.active && kept !== this.previous) {
        this.dispose(kept);
      }
    }
  }

  restore(): void {
    for (const frames of this.sets.values()) {
      for (const { key } of frames.values()) {
        (this.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
      }
    }
  }

  private frame(stage: number, tier: number, kind: FrameKind): SkinFrame {
    let frames = this.sets.get(stage);
    if (!frames) {
      frames = new Map();
      this.sets.set(stage, frames);
    }
    const id = kind + tier;
    const existing = frames.get(id);
    if (existing) return existing;

    const pxPerUnit = texturePxPerUnit(tier, stage);
    const canvas = document.createElement('canvas');
    if (kind === 'n') drawNumber(canvas, tier, pxPerUnit);
    else drawBody(canvas, tier, kind === 'g', pxPerUnit);
    const key = `ph-s${stage}-${id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
    const frame = { key, unitsPerPixel: 1 / pxPerUnit };
    frames.set(id, frame);
    return frame;
  }

  private dispose(stage: number): void {
    const frames = this.sets.get(stage);
    if (!frames) return;
    for (const { key } of frames.values()) this.textures.remove(key);
    this.sets.delete(stage);
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

function drawBody(
  canvas: HTMLCanvasElement,
  tier: number,
  golden: boolean,
  pxPerUnit: number,
): void {
  const r = tierRadius(tier) * pxPerUnit;
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

function drawNumber(canvas: HTMLCanvasElement, tier: number, pxPerUnit: number): void {
  const text = String(tier);
  const r = tierRadius(tier) * pxPerUnit;
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
