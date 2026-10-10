/**
 * Placeholder cats (GAME_DESIGN §13.2, `?skin=placeholder`): a flat circle per size with a darker
 * outline, and the tier number as a separate upright sprite. Textures are drawn with the
 * 2D canvas API at PLACEHOLDER_PX_PER_UNIT, so they are never upscaled. Bodies are shared by size
 * across stages (skinSets.ts); each stage adds its numbers, drawn ahead of time during the zoom
 * into it. Any frame still missing when asked for is drawn on the spot.
 */
import type Phaser from 'phaser';
import {
  NUMBER_FILL,
  NUMBER_STROKE,
  NUMBER_STROKE_RATIO,
  OUTLINE_DARKEN,
  tierColor,
} from '../../config/skin';
import { FIRST_STAGE, tierSize } from '../../config/stages';
import { SIZE_COUNT, sizeRadius } from '../../config/tiers';
import {
  NUMBER_HEIGHT_RATIO,
  NUMBER_HEIGHT_RATIO_TWO_DIGITS,
  PLACEHOLDER_OUTLINE_RATIO,
  PLACEHOLDER_PX_PER_UNIT,
} from '../../config/view';
import { darken } from '../../core/color';
import type { BallSkin, NumberFrame, SkinFrame } from './BallSkin';
import { stageSkinSet } from './skinSets';

const PAD_PX = 2;
const FONT_FAMILY = 'Fredoka, system-ui, sans-serif';
const UNITS_PER_PIXEL = 1 / PLACEHOLDER_PX_PER_UNIT;

/** A body ('b') or an upright number ('n'). */
type FrameKind = 'b' | 'n';
type FrameItem = readonly [tier: number, kind: FrameKind];

/** Every frame a stage needs, the dropper's tiers first (they show right after the expansion). */
function stageItems(stage: number): readonly FrameItem[] {
  const set = stageSkinSet(stage);
  const items: FrameItem[] = [];
  for (const tier of set.drops) items.push([tier, 'b'], [tier, 'n']);
  for (const tier of set.tiers) {
    if (!set.drops.includes(tier)) items.push([tier, 'b'], [tier, 'n']);
  }
  return items;
}

/** The size a tier is drawn at on `stage` (kept in 1–9, so a stray tier still renders). */
function drawnSize(tier: number, stage: number): number {
  return Math.min(SIZE_COUNT, Math.max(1, tierSize(tier, stage)));
}

export class PlaceholderSkin implements BallSkin {
  readonly id = 'placeholder';
  /** Bodies by kind + size ('b4'), shared by every stage. */
  private readonly bodies = new Map<string, SkinFrame>();
  /** Numbers per stage, by tier. */
  private readonly numbers = new Map<number, Map<number, NumberFrame>>();
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

  body(tier: number): SkinFrame {
    return this.bodyFrame(drawnSize(tier, this.active));
  }

  number(tier: number): NumberFrame {
    return this.numberFrame(this.active, tier);
  }

  color(tier: number): string {
    return tierColor(tier);
  }

  prepare(stage: number, budgetMs: number): boolean {
    const start = performance.now();
    let drew = false;
    for (const [tier, kind] of stageItems(stage)) {
      if (this.has(stage, tier, kind)) continue;
      if (drew && performance.now() - start >= budgetMs) return false;
      if (kind === 'n') this.numberFrame(stage, tier);
      else this.bodyFrame(drawnSize(tier, stage));
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
    // Keep stage 1's numbers (every run starts there) and the previous stage's: a cat popped just
    // before the switch may still show them while it fades.
    for (const kept of [...this.numbers.keys()]) {
      if (kept !== FIRST_STAGE && kept !== this.active && kept !== this.previous) {
        for (const { key } of this.numbers.get(kept)?.values() ?? []) this.textures.remove(key);
        this.numbers.delete(kept);
      }
    }
  }

  restore(): void {
    const all = [...this.bodies.values()];
    for (const frames of this.numbers.values()) all.push(...frames.values());
    for (const { key } of all) {
      (this.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
    }
  }

  private has(stage: number, tier: number, kind: FrameKind): boolean {
    if (kind === 'n') return this.numbers.get(stage)?.has(tier) ?? false;
    return this.bodies.has(kind + drawnSize(tier, stage));
  }

  private bodyFrame(size: number): SkinFrame {
    const id = 'b' + size;
    const existing = this.bodies.get(id);
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    drawBody(canvas, size, PLACEHOLDER_PX_PER_UNIT);
    const frame = { key: this.addTexture(`ph-${id}`, canvas), unitsPerPixel: UNITS_PER_PIXEL };
    this.bodies.set(id, frame);
    return frame;
  }

  private numberFrame(stage: number, tier: number): NumberFrame {
    let frames = this.numbers.get(stage);
    if (!frames) {
      frames = new Map();
      this.numbers.set(stage, frames);
    }
    const existing = frames.get(tier);
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    drawNumber(canvas, tier, sizeRadius(drawnSize(tier, stage)) * PLACEHOLDER_PX_PER_UNIT);
    const key = this.addTexture(`ph-s${stage}-n${tier}`, canvas);
    const frame = { key, unitsPerPixel: UNITS_PER_PIXEL, offset: 0 };
    frames.set(tier, frame);
    return frame;
  }

  private addTexture(key: string, canvas: HTMLCanvasElement): string {
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
    return key;
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

function drawBody(canvas: HTMLCanvasElement, size: number, pxPerUnit: number): void {
  const r = sizeRadius(size) * pxPerUnit;
  const side = 2 * r + 2 * PAD_PX;
  const ctx = context(canvas, side, side);
  const c = canvas.width / 2;
  // Sizes and tiers share their colour cycle, so a size's colour is its stage-1 tier's.
  const color = tierColor(size);

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
}

/** The tier's number for a cat whose radius is `r` texture pixels. */
function drawNumber(canvas: HTMLCanvasElement, tier: number, r: number): void {
  const text = String(tier);
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
