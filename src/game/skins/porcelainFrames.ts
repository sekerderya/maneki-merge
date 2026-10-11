/**
 * Porcelain's look on a cat (GAME_DESIGN §15.10), shared by the skins: the owner's crack lines and
 * gold seams (docs/ART_ASSETS.md §4.12) for the art skin, and for the others a dark ring just
 * inside the cat's outline. A frame's `unitsPerPixel` is for a radius of 1: scale it by the cat's
 * radius.
 */
import type Phaser from 'phaser';
import type { PatternSprite } from '../../config/fxSprites';
import { CRACK_ART_RADIUS, CRACK_RING } from '../../config/skin';
import { imageCanvas } from '../artImages';
import type { SkinFrame } from './BallSkin';
import { context } from './canvas';

/**
 * The owner's pattern `sprite` (a crack or a seam) from `image`, as the texture `key`, its circle
 * on CRACK_ART_RADIUS of the cat's radius.
 */
export function patternFrame(
  textures: Phaser.Textures.TextureManager,
  key: string,
  image: HTMLImageElement,
  sprite: PatternSprite,
): SkinFrame {
  if (!textures.exists(key)) textures.addCanvas(key, imageCanvas(image));
  return { key, unitsPerPixel: CRACK_ART_RADIUS / sprite.radius };
}

/** Re-uploads canvas textures after a WebGL context restore. */
export function refreshTextures(
  textures: Phaser.Textures.TextureManager,
  keys: readonly string[],
): void {
  for (const key of keys) {
    if (textures.exists(key)) (textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
  }
}

const RING_KEY = 'porcelain-ring';
/** The texture's radius in pixels. */
const RING_PX = 128;

/** The code-drawn stand-in for a crack: a dark ring just inside the cat's outline. */
export function crackRingFrame(textures: Phaser.Textures.TextureManager): SkinFrame {
  if (!textures.exists(RING_KEY)) {
    const canvas = document.createElement('canvas');
    const ctx = context(canvas, 2 * RING_PX, 2 * RING_PX);
    const width = CRACK_RING.width * RING_PX;
    ctx.beginPath();
    ctx.arc(RING_PX, RING_PX, CRACK_RING.radius * RING_PX - width / 2, 0, Math.PI * 2);
    ctx.lineWidth = width;
    ctx.strokeStyle = CRACK_RING.color;
    ctx.setLineDash([0.5 * RING_PX, 0.12 * RING_PX]);
    ctx.stroke();
    textures.addCanvas(RING_KEY, canvas);
  }
  return { key: RING_KEY, unitsPerPixel: 1 / RING_PX };
}

/** Rebuilds the ring after a WebGL context restore. */
export function restoreCrackRing(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(RING_KEY)) {
    (textures.get(RING_KEY) as Phaser.Textures.CanvasTexture).refresh();
  }
}
