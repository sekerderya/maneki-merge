/**
 * The lucky-cat skin (GAME_DESIGN §13): the vector looks of `config/catArt.ts` drawn into canvas
 * textures with `Path2D`, at CAT_PX_PER_UNIT texture pixels per world unit, so they are never
 * upscaled. Bodies are shared by size across stages (skinSets.ts), and each stage adds its numbers: upright sprites that sit on the cat's plate, in the
 * look's colours. Like the placeholders, a stage's numbers are drawn during the zoom into it.
 */
import type Phaser from 'phaser';
import {
  ART_BOX,
  ART_PAD,
  ART_TWO_DIGIT_SCALE,
  bodyEdge,
  catLook,
  numberOffset,
} from '../../config/catArt';
import type { ArtShape, CatLook } from '../../config/catArt';
import { FIRST_STAGE, STAGES, tierSize } from '../../config/stages';
import { SIZE_COUNT, sizeRadius } from '../../config/tiers';
import { CAT_PX_PER_UNIT } from '../../config/view';
import type { BallSkin, NumberFrame, SkinFrame } from './BallSkin';
import { context, drawNumber } from './canvas';
import { stageSkinSet } from './skinSets';

const UNITS_PER_PIXEL = 1 / CAT_PX_PER_UNIT;

type FrameKind = 'b' | 'n';
type FrameItem = readonly [tier: number, kind: FrameKind];

/** Every frame a stage needs, the dropper's tiers first (they show right after the expansion). */
const STAGE_ITEMS: readonly (readonly FrameItem[])[] = STAGES.map(({ stage }) => {
  const set = stageSkinSet(stage);
  const items: FrameItem[] = [];
  for (const tier of set.drops) items.push([tier, 'b'], [tier, 'n']);
  for (const tier of set.tiers) {
    if (!set.drops.includes(tier)) items.push([tier, 'b'], [tier, 'n']);
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

/** A size's look (the same at every stage). */
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

  body(tier: number): SkinFrame {
    return this.bodyFrame(drawnSize(tier, this.active));
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

  private bodyFrame(size: number): SkinFrame {
    const id = 'b' + size;
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
    drawLookNumber(canvas, tier, look, artScale(size, look));
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

/** The tier's number in the look's colours, `scale` texture pixels per box unit. */
function drawLookNumber(
  canvas: HTMLCanvasElement,
  tier: number,
  look: CatLook,
  scale: number,
): void {
  const text = String(tier);
  const fontPx = look.number.size * scale * (text.length > 1 ? ART_TWO_DIGIT_SCALE : 1);
  drawNumber(canvas, text, fontPx, look.number.color, look.number.halo);
}
