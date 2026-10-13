/**
 * Ring textures (TECH_SPEC §13): a circle's outline drawn once on a canvas and shown as an image,
 * for the aim's ghost and the magnet's selection. Phaser re-traces a Graphics circle as a
 * 100-point path every frame: the ghost alone cost a slow phone about as much as the physics.
 * One texture per radius and line width, made on first use; a ball's radius comes from its size,
 * so there are only a few.
 */
import type Phaser from 'phaser';
import { CAT_PX_PER_UNIT } from '../config/view';

/** Like the cats': never upscaled on a phone or tablet. */
export const RING_PX_PER_UNIT = CAT_PX_PER_UNIT;
/** Round the ring, so its anti-aliased edge isn't cut. */
const PAD_PX = 2;
/** The ring textures made so far, to re-upload after a WebGL context loss. */
const made = new Set<string>();

/**
 * The key of a white ring of `radius` (to the middle of its line) and line `width`, both in world
 * units, centred in its texture; drawn on first use. Show it at scale 1 / RING_PX_PER_UNIT.
 */
export function ringTexture(
  textures: Phaser.Textures.TextureManager,
  radius: number,
  width: number,
): string {
  const key = `ring-${radius}-${width}`;
  if (textures.exists(key)) return key;
  const side = Math.ceil(2 * ((radius + width / 2) * RING_PX_PER_UNIT + PAD_PX));
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.beginPath();
    ctx.arc(side / 2, side / 2, radius * RING_PX_PER_UNIT, 0, Math.PI * 2);
    ctx.lineWidth = width * RING_PX_PER_UNIT;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  textures.addCanvas(key, canvas);
  made.add(key);
  return key;
}

/** Re-uploads the ring textures after the WebGL context comes back. */
export function restoreRingTextures(textures: Phaser.Textures.TextureManager): void {
  for (const key of made) {
    if (textures.exists(key)) (textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
  }
}
