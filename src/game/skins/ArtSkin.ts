/**
 * The cat art skin, the default (GAME_DESIGN §13.1): the owner's raster cats (config/catSprites.ts)
 * scaled into one canvas texture per size at CAT_PX_PER_UNIT texture pixels per world unit, so the
 * body circle lands exactly on the physics radius. A thick dark outline goes round each cat (its
 * outer edge is the physics radius). The art shows no numbers: a cat's look tells its size. Every stage holds the same ten sizes, so the bodies are drawn once and shared by all stages.
 *
 * The images are loaded at boot (game/artImages.ts), before the game is created.
 */
import type Phaser from 'phaser';
import {
  CAT_OUTLINE_COLOR,
  CAT_SPRITES,
  catOutlineWidth,
  catSprite,
} from '../../config/catSprites';
import type { CatSprite } from '../../config/catSprites';
import { FIRST_STAGE, tierSize } from '../../config/stages';
import { SIZE_COUNT, sizeRadius } from '../../config/tiers';
import { CAT_PX_PER_UNIT } from '../../config/view';
import type { BallSkin, SkinFrame } from './BallSkin';
import { context } from './canvas';

const UNITS_PER_PIXEL = 1 / CAT_PX_PER_UNIT;

function drawnSize(tier: number, stage: number): number {
  return Math.min(SIZE_COUNT, Math.max(1, tierSize(tier, stage)));
}

/** The outline's width in texture pixels for a cat of `size`. */
function outlinePx(size: number): number {
  return catOutlineWidth(sizeRadius(size)) * CAT_PX_PER_UNIT;
}

/** Texture pixels per sprite pixel for a cat of `size`: the body sits inside its outline. */
function spriteScale(size: number, sprite: CatSprite): number {
  return (sizeRadius(size) * CAT_PX_PER_UNIT - outlinePx(size)) / sprite.radius;
}

/** Around the outline, so its anti-aliased edge isn't cut. */
const PAD_PX = 2;
/** The outline is the cat's silhouette stamped this many times round a circle. */
const OUTLINE_STEPS = 24;

export class ArtSkin implements BallSkin {
  readonly id = 'art';
  private readonly bodies = new Map<number, SkinFrame>();
  private active = FIRST_STAGE;
  private rev = 0;

  /** `images`: the looks' images (ArtImages.cats), in look order. */
  constructor(
    private readonly textures: Phaser.Textures.TextureManager,
    private readonly images: readonly HTMLImageElement[],
  ) {}

  get stage(): number {
    return this.active;
  }

  get revision(): number {
    return this.rev;
  }

  body(tier: number): SkinFrame {
    return this.bodyFrame(drawnSize(tier, this.active));
  }

  number(): null {
    return null;
  }

  color(tier: number): string {
    return catSprite(tier).color;
  }

  prepare(_stage: number, budgetMs: number): boolean {
    const start = performance.now();
    let drew = false;
    for (let size = 1; size <= SIZE_COUNT; size++) {
      if (this.bodies.has(size)) continue;
      if (drew && performance.now() - start >= budgetMs) return false;
      this.bodyFrame(size);
      drew = true;
    }
    return true;
  }

  setStage(stage: number): void {
    if (stage === this.active) return;
    this.prepare(stage, Infinity);
    this.active = stage;
    this.rev++;
  }

  restore(): void {
    for (const { key } of this.bodies.values()) {
      (this.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
    }
  }

  private bodyFrame(size: number): SkinFrame {
    const existing = this.bodies.get(size);
    if (existing) return existing;
    // Sizes repeat their looks, so size 10 wears size 1's.
    const sprite = catSprite(size);
    const source = this.images[CAT_SPRITES.indexOf(sprite)];
    if (!source) throw new Error(`Cat art not loaded: ${sprite.file}`);
    const body = document.createElement('canvas');
    drawScaled(body, source, Math.ceil(sprite.side * spriteScale(size, sprite)));
    const canvas = document.createElement('canvas');
    drawOutlined(canvas, body, outlinePx(size));
    const key = `cat-art-b${size}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
    const frame = { key, unitsPerPixel: UNITS_PER_PIXEL };
    this.bodies.set(size, frame);
    return frame;
  }
}

/**
 * Draws `body` centred in `canvas` with a `width` px outline of CAT_OUTLINE_COLOR round its
 * silhouette: the silhouette, filled with the colour, stamped round a circle under the body.
 */
function drawOutlined(canvas: HTMLCanvasElement, body: HTMLCanvasElement, width: number): void {
  const side = Math.ceil(body.width + 2 * (width + PAD_PX));
  const ctx = context(canvas, side, side);
  const silhouette = document.createElement('canvas');
  const sctx = context(silhouette, body.width, body.height);
  sctx.drawImage(body, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = CAT_OUTLINE_COLOR;
  sctx.fillRect(0, 0, body.width, body.height);
  const at = (side - body.width) / 2;
  for (let i = 0; i < OUTLINE_STEPS; i++) {
    const a = (i / OUTLINE_STEPS) * Math.PI * 2;
    ctx.drawImage(silhouette, at + Math.cos(a) * width, at + Math.sin(a) * width);
  }
  ctx.drawImage(silhouette, at, at);
  ctx.drawImage(body, at, at);
}

/**
 * Draws `source` into a `side` × `side` canvas. Big reductions go through halving steps, so small
 * cats stay smooth instead of shimmering.
 */
function drawScaled(canvas: HTMLCanvasElement, source: HTMLImageElement, side: number): void {
  let current: CanvasImageSource = source;
  let currentSide = source.naturalWidth;
  while (currentSide / 2 > side) {
    const half = document.createElement('canvas');
    const ctx = context(half, Math.ceil(currentSide / 2), Math.ceil(currentSide / 2));
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, half.width, half.height);
    current = half;
    currentSide = half.width;
  }
  const ctx = context(canvas, side, side);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, 0, 0, side, side);
}
