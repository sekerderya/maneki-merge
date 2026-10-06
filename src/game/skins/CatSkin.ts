/**
 * The lucky-cat skin (GAME_DESIGN §13): the vector looks of `config/catArt.ts` drawn into canvas
 * textures with `Path2D`, at CAT_PX_PER_UNIT texture pixels per world unit, so they are never
 * upscaled. Bodies are shared by size across stages (skinSets.ts), golden bodies add the ring and
 * sparkles, and each stage adds its numbers: upright sprites that sit on the cat's plate, in the
 * look's colours. Like the placeholders, a stage's numbers are drawn during the zoom into it.
 */
import type Phaser from 'phaser';
import {
  ART_BOX,
  ART_PAD,
  ART_TWO_DIGIT_SCALE,
  bodyEdge,
  catLook,
  GOLDEN_SHAPES,
  numberOffset,
} from '../../config/catArt';
import type { ArtShape, CatLook } from '../../config/catArt';
import { FIRST_STAGE, STAGES, tierSize } from '../../config/stages';
import { SIZE_COUNT, sizeRadius } from '../../config/tiers';
import { CAT_NUMBER_HALO_RATIO, CAT_PX_PER_UNIT } from '../../config/view';
import type { BallSkin, NumberFrame, SkinFrame } from './BallSkin';
import { stageSkinSet } from './skinSets';

const FONT_FAMILY = 'Fredoka, system-ui, sans-serif';
const UNITS_PER_PIXEL = 1 / CAT_PX_PER_UNIT;
const PAD_PX = 2;

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

/** Texture pixels per box unit: the body's outer edge lands on the cat's radius. */
function artScale(size: number, look: CatLook): number {
  return (sizeRadius(size) * CAT_PX_PER_UNIT) / bodyEdge(look);
}

function drawnSize(tier: number, stage: number): number {
  return Math.min(SIZE_COUNT, Math.max(1, tierSize(tier, stage)));
}

/** A size's look: sizes repeat their looks, so size 12 wears size 1's. */
function sizeLook(size: number): CatLook {
  return catLook(size);
}

export class CatSkin implements BallSkin {
  readonly id = 'cat';
  private readonly bodies = new Map<string, SkinFrame>();
  private readonly numbers = new Map<number, Map<number, NumberFrame>>();
  private readonly paths = new Map<string, Path2D>();
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
    return this.bodyFrame(drawnSize(tier, this.active), golden);
  }

  number(tier: number): NumberFrame {
    return this.numberFrame(this.active, tier);
  }

  color(tier: number): string {
    return catLook(tier).color;
  }

  prepare(stage: number, budgetMs: number): boolean {
    const start = performance.now();
    let drew = false;
    for (const [tier, kind] of STAGE_ITEMS[stage - 1] ?? []) {
      if (this.has(stage, tier, kind)) continue;
      if (drew && performance.now() - start >= budgetMs) return false;
      if (kind === 'n') this.numberFrame(stage, tier);
      else this.bodyFrame(drawnSize(tier, stage), kind === 'g');
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
    // Keep stage 1's numbers (every run starts there) and the previous stage's.
    for (const kept of [...this.numbers.keys()]) {
      if (kept !== FIRST_STAGE && kept !== this.active && kept !== this.previous) {
        for (const { key } of this.numbers.get(kept)?.values() ?? []) this.textures.remove(key);
        this.numbers.delete(kept);
      }
    }
  }

  restore(): void {
    const all: SkinFrame[] = [...this.bodies.values()];
    for (const frames of this.numbers.values()) all.push(...frames.values());
    for (const { key } of all) {
      (this.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
    }
  }

  private has(stage: number, tier: number, kind: FrameKind): boolean {
    if (kind === 'n') return this.numbers.get(stage)?.has(tier) ?? false;
    return this.bodies.has(kind + drawnSize(tier, stage));
  }

  private bodyFrame(size: number, golden: boolean): SkinFrame {
    const id = (golden ? 'g' : 'b') + size;
    const existing = this.bodies.get(id);
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    const look = sizeLook(size);
    const scale = artScale(size, look);
    // The texture is square around the body's centre, so the sprite's origin is the cat's centre.
    const side = Math.ceil((ART_BOX + 2 * ART_PAD) * scale);
    const ctx = context(canvas, side, side);
    ctx.translate(side / 2 - (ART_BOX / 2) * scale, side / 2 - (ART_BOX / 2) * scale);
    ctx.scale(scale, scale);
    this.paint(ctx, look.shapes);
    if (golden) this.paint(ctx, GOLDEN_SHAPES);
    const frame = { key: this.addTexture(`cat-${id}`, canvas), unitsPerPixel: UNITS_PER_PIXEL };
    this.bodies.set(id, frame);
    return frame;
  }

  private paint(ctx: CanvasRenderingContext2D, shapes: readonly ArtShape[]): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const shape of shapes) {
      const path = this.path(shape.d);
      ctx.globalAlpha = shape.opacity ?? 1;
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fill(path);
      }
      if (shape.stroke) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.width ?? 1;
        ctx.stroke(path);
      }
    }
    ctx.globalAlpha = 1;
  }

  private path(d: string): Path2D {
    let path = this.paths.get(d);
    if (!path) {
      path = new Path2D(d);
      this.paths.set(d, path);
    }
    return path;
  }

  private numberFrame(stage: number, tier: number): NumberFrame {
    let frames = this.numbers.get(stage);
    if (!frames) {
      frames = new Map();
      this.numbers.set(stage, frames);
    }
    const existing = frames.get(tier);
    if (existing) return existing;
    const size = drawnSize(tier, stage);
    const look = sizeLook(size);
    const canvas = document.createElement('canvas');
    drawNumber(canvas, tier, look, artScale(size, look));
    const key = this.addTexture(`cat-s${stage}-n${tier}`, canvas);
    const frame = { key, unitsPerPixel: UNITS_PER_PIXEL, offset: numberOffset(look) };
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

/** The tier's number in the look's colours, `scale` texture pixels per box unit. */
function drawNumber(canvas: HTMLCanvasElement, tier: number, look: CatLook, scale: number): void {
  const text = String(tier);
  const fontPx = look.number.size * scale * (text.length > 1 ? ART_TWO_DIGIT_SCALE : 1);
  const font = `700 ${fontPx}px ${FONT_FAMILY}`;
  const halo = fontPx * CAT_NUMBER_HALO_RATIO;

  const probe = context(canvas, 1, 1);
  probe.font = font;
  const m = probe.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const inkHeight = ascent + m.actualBoundingBoxDescent;
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;

  const ctx = context(canvas, inkWidth + 2 * (halo + PAD_PX), inkHeight + 2 * (halo + PAD_PX));
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Centre the ink box, so the number sits in the middle of its plate.
  const x = (canvas.width - inkWidth) / 2 + m.actualBoundingBoxLeft;
  const y = (canvas.height - inkHeight) / 2 + ascent;
  ctx.lineJoin = 'round';
  ctx.lineWidth = halo;
  ctx.strokeStyle = look.number.halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = look.number.color;
  ctx.fillText(text, x, y);
}
