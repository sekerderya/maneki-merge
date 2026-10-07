/**
 * The cat art skin, the default (GAME_DESIGN §13.1): the owner's raster cats (config/catSprites.ts)
 * scaled into one canvas texture per size at CAT_PX_PER_UNIT texture pixels per world unit, so the
 * body circle lands exactly on the physics radius. The art shows no numbers: a cat's look tells its
 * size. Every stage holds the same ten sizes, so the bodies are drawn once and shared by all stages.
 *
 * The images are loaded at boot (`loadCatArt`, with the fonts), before the game is created.
 */
import type Phaser from 'phaser';
import {
  CAT_ART_LOAD_TIMEOUT_MS,
  CAT_SPRITE_DIR,
  CAT_SPRITES,
  catSprite,
} from '../../config/catSprites';
import type { CatSprite } from '../../config/catSprites';
import { FIRST_STAGE, tierSize } from '../../config/stages';
import { SIZE_COUNT, sizeRadius } from '../../config/tiers';
import { CAT_PX_PER_UNIT } from '../../config/view';
import type { BallSkin, SkinFrame } from './BallSkin';
import { context } from './canvas';

const UNITS_PER_PIXEL = 1 / CAT_PX_PER_UNIT;

/**
 * Loads and decodes the nine cat images, in look order. Rejects if one fails or they take longer
 * than CAT_ART_LOAD_TIMEOUT_MS (the caller then falls back to the vector cats).
 */
export function loadCatArt(baseUrl: string): Promise<readonly HTMLImageElement[]> {
  const loads = Promise.all(
    CAT_SPRITES.map(async ({ file }) => {
      const image = new Image();
      image.src = `${baseUrl}${CAT_SPRITE_DIR}${file}`;
      await image.decode();
      return image;
    }),
  );
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(() => reject(new Error('Cat art timed out')), CAT_ART_LOAD_TIMEOUT_MS),
  );
  return Promise.race([loads, timeout]);
}

function drawnSize(tier: number, stage: number): number {
  return Math.min(SIZE_COUNT, Math.max(1, tierSize(tier, stage)));
}

/** Texture pixels per sprite pixel for a cat of `size`. */
function spriteScale(size: number, sprite: CatSprite): number {
  return (sizeRadius(size) * CAT_PX_PER_UNIT) / sprite.radius;
}

export class ArtSkin implements BallSkin {
  readonly id = 'art';
  private readonly bodies = new Map<number, SkinFrame>();
  private active = FIRST_STAGE;
  private rev = 0;

  /** `images`: the looks' images from `loadCatArt`, in look order. */
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
    const side = Math.ceil(sprite.side * spriteScale(size, sprite));
    const canvas = document.createElement('canvas');
    drawScaled(canvas, source, side);
    const key = `cat-art-b${size}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
    const frame = { key, unitsPerPixel: UNITS_PER_PIXEL };
    this.bodies.set(size, frame);
    return frame;
  }
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
