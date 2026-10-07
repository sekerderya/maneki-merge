/**
 * Image helpers for the art pipeline (tools/build-art.ts): loading, cutting the owner's plain white
 * backgrounds, colour sampling and writing WebP.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/** A pixel is background white when its darkest channel is at least this light. */
const WHITE_MIN = 226;
/** Pixels this close to the background are edge pixels: their alpha is un-blended from white. */
const EDGE_DEPTH = 2;
/** Outline pixels this far inside the edge give the outline's colour for the un-blending. */
export const OUTLINE_DEPTH = 4;

export interface Rgba {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

export interface Circle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** `dir/base.{png,jpg,jpeg,webp}`, whichever exists. */
export async function findSource(dir: string, base: string): Promise<string> {
  const files = await readdir(dir);
  const file = files.find((f) => new RegExp(`^${base}\\.(png|jpe?g|webp)$`, 'i').test(f));
  if (!file) throw new Error(`Missing ${dir}/${base}.(png|jpg|webp)`);
  return join(dir, file);
}

export async function loadRgba(path: string): Promise<Rgba> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: info.width,
    height: info.height,
  };
}

export async function saveWebp(image: Rgba, path: string, quality = 88): Promise<void> {
  await sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), {
    raw: { width: image.width, height: image.height, channels: 4 },
  })
    .webp({ quality, alphaQuality: 100, effort: 6 })
    .toFile(path);
}

function minChannel(data: Uint8ClampedArray, i: number): number {
  return Math.min(data[4 * i] ?? 0, data[4 * i + 1] ?? 0, data[4 * i + 2] ?? 0);
}

/**
 * Makes the white background transparent and returns each pixel's distance (4-connected steps)
 * from it: 0 for background, 1 for the first pixel inside, and so on (capped). `open` marks the
 * top-row pixels that are not background (an arm cut off by the image's top edge).
 */
export function cutBackground(image: Rgba, open?: (x: number) => boolean): Uint8Array {
  const { data, width, height } = image;
  const n = width * height;
  const depth = new Uint8Array(n).fill(255);

  // Flood the near-white region from the border.
  const seeds: number[] = [];
  for (let x = 0; x < width; x++) {
    if (!open?.(x)) seeds.push(x);
    seeds.push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) seeds.push(y * width, y * width + width - 1);
  flood(image, seeds, (i) => {
    depth[i] = 0;
  });

  // Distance from the background, breadth first, up to OUTLINE_DEPTH.
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (depth[i] === 0) frontier.push(i);
  for (let d = 1; d <= OUTLINE_DEPTH; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (j >= 0 && j < n && depth[j] === 255) {
          depth[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }

  // The outline's darkness, from pixels safely inside the edge.
  const inner: number[] = [];
  for (let i = 0; i < n; i++) if (depth[i] === OUTLINE_DEPTH) inner.push(minChannel(data, i));
  inner.sort((a, b) => a - b);
  const outline = inner[Math.floor(inner.length / 2)] ?? 0;

  for (let i = 0; i < n; i++) {
    const d = depth[i] ?? 255;
    if (d === 0) {
      data[4 * i + 3] = 0;
    } else if (d <= EDGE_DEPTH) {
      // pixel = a × outline + (1 − a) × white: recover a, then the colour without the white.
      const a = clamp01((255 - minChannel(data, i)) / Math.max(1, 255 - outline));
      for (let c = 0; c < 3; c++) {
        const v = data[4 * i + c] ?? 0;
        data[4 * i + c] = a > 0 ? (v - 255 * (1 - a)) / a : 0;
      }
      data[4 * i + 3] = Math.round(a * 255);
    }
  }
  return depth;
}

/** Makes the near-white region around (x, y) transparent: an enclosed white hole, like a jar's. */
export function clearRegion(image: Rgba, x: number, y: number): void {
  flood(image, [Math.round(y) * image.width + Math.round(x)], (i) => {
    image.data[4 * i + 3] = 0;
  });
}

/** Visits the 4-connected near-white region reachable from `seeds`. */
function flood(image: Rgba, seeds: readonly number[], visit: (i: number) => void): void {
  const { data, width } = image;
  const n = width * image.height;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const push = (i: number): void => {
    if (!seen[i] && minChannel(data, i) >= WHITE_MIN) {
      seen[i] = 1;
      queue[tail++] = i;
    }
  };
  for (const i of seeds) push(i);
  while (head < tail) {
    const i = queue[head++] ?? 0;
    visit(i);
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < n - width) push(i + width);
  }
}

/** The smallest rectangle around every pixel with some alpha. */
export function opaqueBox(image: Rgba): Rect {
  const { data, width, height } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[4 * (y * width + x) + 3] ?? 0) > 8) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** `rect` of `image` as a new image; parts outside the source stay transparent. */
export function crop(image: Rgba, rect: Rect): Rgba {
  const { data, width, height } = image;
  const out = new Uint8ClampedArray(rect.w * rect.h * 4);
  for (let y = 0; y < rect.h; y++) {
    const sy = y + rect.y;
    if (sy < 0 || sy >= height) continue;
    for (let x = 0; x < rect.w; x++) {
      const sx = x + rect.x;
      if (sx < 0 || sx >= width) continue;
      const s = 4 * (sy * width + sx);
      const d = 4 * (y * rect.w + x);
      for (let c = 0; c < 4; c++) out[d + c] = data[s + c] ?? 0;
    }
  }
  return { data: out, width: rect.w, height: rect.h };
}

export function pixel(image: Rgba, x: number, y: number): number[] {
  const i = 4 * (y * image.width + x);
  return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
}

export function alphaAt(image: Rgba, x: number, y: number): number {
  return image.data[4 * (y * image.width + x) + 3] ?? 0;
}

/** The median by luminance, so the result is a colour that is really in the image. */
export function median(samples: readonly number[][]): string {
  const lum = (c: number[]): number => 0.3 * (c[0] ?? 0) + 0.59 * (c[1] ?? 0) + 0.11 * (c[2] ?? 0);
  const sorted = [...samples].sort((a, b) => lum(a) - lum(b));
  const c = sorted[Math.floor(sorted.length / 2)] ?? [0, 0, 0];
  return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** The least-squares circle through `points` (Kåsa's method). */
export function kasa(points: readonly (readonly [number, number])[]): Circle {
  // Solve for x² + y² = 2ax + 2by + c in the least-squares sense (normal equations).
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  let sx = 0;
  let sy = 0;
  let szx = 0;
  let szy = 0;
  let sz = 0;
  for (const [x, y] of points) {
    const z = x * x + y * y;
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
    sx += x;
    sy += y;
    szx += z * x;
    szy += z * y;
    sz += z;
  }
  const m = [
    [2 * sxx, 2 * sxy, sx, szx],
    [2 * sxy, 2 * syy, sy, szy],
    [2 * sx, 2 * sy, points.length, sz],
  ];
  for (let i = 0; i < 3; i++) {
    const row = m[i] as number[];
    const pivot = row[i] ?? 1;
    for (let k = 0; k < 4; k++) row[k] = (row[k] ?? 0) / pivot;
    for (let j = 0; j < 3; j++) {
      if (j === i) continue;
      const other = m[j] as number[];
      const f = other[i] ?? 0;
      for (let k = 0; k < 4; k++) other[k] = (other[k] ?? 0) - f * (row[k] ?? 0);
    }
  }
  const cx = m[0]?.[3] ?? 0;
  const cy = m[1]?.[3] ?? 0;
  const c = m[2]?.[3] ?? 0;
  return { cx, cy, r: Math.sqrt(c + cx * cx + cy * cy) };
}
