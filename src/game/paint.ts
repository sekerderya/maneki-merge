/**
 * Draws vector art (config/paintShape.ts) into canvas textures with `Path2D` (TECH_SPEC §6).
 * The jar and the paw use it; the cats have their own painter (skins/CatSkin.ts).
 */
import type Phaser from 'phaser';
import type { PaintShape } from '../config/paintShape';

/** A texture of `shapes` covering `box` (art units) at `pxPerUnit` texture pixels per unit. */
export interface ArtBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function paintShapes(ctx: CanvasRenderingContext2D, shapes: readonly PaintShape[]): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const shape of shapes) {
    ctx.save();
    if (shape.clip) ctx.clip(new Path2D(shape.clip));
    if (shape.dx || shape.dy) ctx.translate(shape.dx ?? 0, shape.dy ?? 0);
    ctx.globalAlpha = shape.opacity ?? 1;
    const path = new Path2D(shape.d);
    if (shape.gradient) {
      const g = shape.gradient;
      const fill = ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1);
      for (const stop of g.stops) fill.addColorStop(stop.offset, rgba(stop.color, stop.alpha));
      ctx.fillStyle = fill;
      ctx.fill(path);
    } else if (shape.fill) {
      ctx.fillStyle = shape.fill;
      ctx.fill(path);
    }
    if (shape.stroke) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.width ?? 1;
      if (shape.butt) ctx.lineCap = 'butt';
      if (shape.dash) ctx.setLineDash([...shape.dash]);
      ctx.stroke(path);
    }
    ctx.restore();
  }
}

/** Paints `shapes` into a new canvas texture under `key` (replacing an older one). */
export function addArtTexture(
  textures: Phaser.Textures.TextureManager,
  key: string,
  shapes: readonly PaintShape[],
  box: ArtBox,
  pxPerUnit: number,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil((box.right - box.left) * pxPerUnit));
  canvas.height = Math.max(1, Math.ceil((box.bottom - box.top) * pxPerUnit));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.scale(pxPerUnit, pxPerUnit);
  ctx.translate(-box.left, -box.top);
  paintShapes(ctx, shapes);
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

/** One frame of an atlas: `shapes` cut to `box`. */
export interface AtlasPart {
  readonly name: string;
  readonly shapes: readonly PaintShape[];
  readonly box: ArtBox;
}

/** Atlas rows are at most this wide, in texture pixels; parts are this far apart. */
const ATLAS_MAX_WIDTH = 2048;
const ATLAS_GAP = 4;

/**
 * Paints several parts into one canvas texture under `key`, one frame each (named after the
 * part), packed in rows. One texture means one draw call for all of them.
 */
export function addArtAtlas(
  textures: Phaser.Textures.TextureManager,
  key: string,
  parts: readonly AtlasPart[],
  pxPerUnit: number,
): void {
  const placed = parts.map((part) => ({
    part,
    w: Math.ceil((part.box.right - part.box.left) * pxPerUnit),
    h: Math.ceil((part.box.bottom - part.box.top) * pxPerUnit),
    x: 0,
    y: 0,
  }));
  let x = 0;
  let y = 0;
  let row = 0;
  let width = 0;
  for (const p of [...placed].sort((a, b) => b.h - a.h)) {
    if (x > 0 && x + p.w > ATLAS_MAX_WIDTH) {
      x = 0;
      y += row + ATLAS_GAP;
      row = 0;
    }
    p.x = x;
    p.y = y;
    x += p.w + ATLAS_GAP;
    row = Math.max(row, p.h);
    width = Math.max(width, x);
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, y + row);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  for (const p of placed) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    ctx.translate(p.x, p.y);
    ctx.scale(pxPerUnit, pxPerUnit);
    ctx.translate(-p.part.box.left, -p.part.box.top);
    paintShapes(ctx, p.part.shapes);
    ctx.restore();
  }
  if (textures.exists(key)) textures.remove(key);
  const texture = textures.addCanvas(key, canvas);
  for (const p of placed) texture?.add(p.part.name, 0, p.x, p.y, p.w, p.h);
}

/** `#rrggbb` with an alpha, as a CSS colour. */
function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
