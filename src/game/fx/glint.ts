/**
 * Golden cats twinkle (GAME_DESIGN §5, §13.1): a four-pointed star on the cat's upper right that
 * grows and fades in a loop, like light catching gold. It stays upright while the cat rolls, so it
 * reads as a reflection. Each cat's phase comes from its id, so a jar of golden cats doesn't blink
 * in unison.
 */
import type Phaser from 'phaser';
import { GLINT_PERIOD_MS, GLINT_SIZE_RATIO } from '../../config/view';

export const GLINT_KEY = 'fx-glint';
const GLINT_PX = 96;

export function createGlintTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(GLINT_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = GLINT_PX;
  canvas.height = GLINT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const c = GLINT_PX / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
  glow.addColorStop(0, 'rgba(255, 250, 220, 0.9)');
  glow.addColorStop(1, 'rgba(255, 250, 220, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, GLINT_PX, GLINT_PX);
  // The star: four thin curved points.
  const s = c * 0.96;
  ctx.beginPath();
  ctx.moveTo(c, c - s);
  ctx.quadraticCurveTo(c, c, c + s, c);
  ctx.quadraticCurveTo(c, c, c, c + s);
  ctx.quadraticCurveTo(c, c, c - s, c);
  ctx.quadraticCurveTo(c, c, c, c - s);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  textures.addCanvas(GLINT_KEY, canvas);
}

/** 0 → 1 → 0 once per period, resting at 0 for the first part of it. */
export function glintStrength(nowMs: number, phase: number): number {
  const t = (((nowMs / GLINT_PERIOD_MS + phase) % 1) + 1) % 1;
  const REST = 0.45;
  if (t < REST) return 0;
  return Math.sin(((t - REST) / (1 - REST)) * Math.PI);
}

/** A cat's phase in [0, 1) from its id (golden ratio steps spread neighbours apart). */
export function glintPhase(id: number): number {
  return (id * 0.618034) % 1;
}

/** Puts a glint on a cat of `radius` at (x, y), or hides it while it rests. */
export function placeGlint(
  image: Phaser.GameObjects.Image,
  x: number,
  y: number,
  radius: number,
  nowMs: number,
  phase: number,
): void {
  const k = glintStrength(nowMs, phase);
  if (k <= 0.01) {
    image.setVisible(false);
    return;
  }
  const size = radius * GLINT_SIZE_RATIO * (0.35 + 0.65 * k);
  image
    .setVisible(true)
    .setPosition(x + radius * 0.42, y - radius * 0.48)
    .setDisplaySize(size, size)
    .setAlpha(k);
}
