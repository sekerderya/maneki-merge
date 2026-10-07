/**
 * Final art pipeline (TECH_SPEC §14, docs/ART_ASSETS.md): turns the owner's generated cat images
 * into game sprites. Run it with `npm run art` after adding or replacing a file in `art-source/`.
 *
 * For each `art-source/cats/size-NN.{png,jpg,jpeg,webp}` (NN = 01–09, one per look):
 *   1. removes the plain white background: the near-white region connected to the image border,
 *      with the anti-aliased edge un-blended from white, so no white fringe shows on dark ground;
 *   2. fits the body circle to the outline below the ears (the physics circle);
 *   3. crops a square centred on that circle, wide enough for the ears;
 *   4. writes `public/assets/cats/look-NN.webp` and measures the body's colour.
 * The measurements go to `src/config/catSpriteData.ts`, which the game reads.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'art-source/cats';
const OUT_DIR = 'public/assets/cats';
const DATA_FILE = 'src/config/catSpriteData.ts';
const LOOK_COUNT = 9;

/** A pixel is background white when its darkest channel is at least this light. */
const WHITE_MIN = 226;
/** Pixels this close to the background are edge pixels: their alpha is un-blended from white. */
const EDGE_DEPTH = 2;
/** Outline pixels this far inside the edge give the outline's colour for the un-blending. */
const OUTLINE_DEPTH = 4;
/** Contour points above this fraction of the radius over the centre are ears, not body. */
const EAR_CUTOFF = 0.45;
/** Contour points further than this (px) from the fitted circle are dropped before refitting. */
const FIT_TOLERANCE = 4;
/** Transparent margin around the sprite, px. */
const MARGIN = 2;

interface Rgba {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

interface Circle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

interface LookData {
  readonly look: number;
  readonly file: string;
  readonly side: number;
  readonly radius: number;
  readonly color: string;
}

async function main(): Promise<void> {
  const files = await readdir(SOURCE_DIR);
  await mkdir(OUT_DIR, { recursive: true });
  const looks: LookData[] = [];
  for (let look = 1; look <= LOOK_COUNT; look++) {
    const nn = String(look).padStart(2, '0');
    const source = files.find((f) => new RegExp(`^size-${nn}\\.(png|jpe?g|webp)$`, 'i').test(f));
    if (!source) throw new Error(`Missing ${SOURCE_DIR}/size-${nn}.(png|jpg|webp)`);
    looks.push(await buildLook(look, join(SOURCE_DIR, source), `look-${nn}.webp`));
  }
  await writeFile(DATA_FILE, dataModule(looks));
  console.log(`Wrote ${looks.length} cats to ${OUT_DIR} and ${DATA_FILE}`);
}

async function buildLook(look: number, path: string, file: string): Promise<LookData> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image: Rgba = {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: info.width,
    height: info.height,
  };
  const depth = cutBackground(image);
  const circle = fitCircle(image, depth);
  const crop = cropAround(image, circle);
  const radius = circle.r;
  await sharp(Buffer.from(crop.data.buffer), {
    raw: { width: crop.width, height: crop.height, channels: 4 },
  })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(join(OUT_DIR, file));
  const centre = crop.width / 2;
  const result: LookData = {
    look,
    file,
    side: crop.width,
    radius: round(radius),
    color: ringColor(crop, centre, radius),
  };
  console.log(
    `${path}: circle r=${result.radius} (${round((2 * radius) / image.width)} of the width), ` +
      `sprite ${crop.width}px, body ${result.color}`,
  );
  return result;
}

/**
 * Makes the white background transparent and returns each pixel's distance (4-connected steps)
 * from it: 0 for background, 1 for the first pixel inside, and so on (capped).
 */
function cutBackground(image: Rgba): Uint8Array {
  const { data, width, height } = image;
  const n = width * height;
  const depth = new Uint8Array(n).fill(255);
  const minChannel = (i: number): number =>
    Math.min(data[4 * i] ?? 0, data[4 * i + 1] ?? 0, data[4 * i + 2] ?? 0);

  // Flood the near-white region from the border.
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seed = (i: number): void => {
    if (depth[i] !== 0 && minChannel(i) >= WHITE_MIN) {
      depth[i] = 0;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++] ?? 0;
    const x = i % width;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (i >= width) seed(i - width);
    if (i < n - width) seed(i + width);
  }

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
  for (let i = 0; i < n; i++) if (depth[i] === OUTLINE_DEPTH) inner.push(minChannel(i));
  inner.sort((a, b) => a - b);
  const outline = inner[Math.floor(inner.length / 2)] ?? 0;

  for (let i = 0; i < n; i++) {
    const d = depth[i] ?? 255;
    if (d === 0) {
      data[4 * i + 3] = 0;
    } else if (d <= EDGE_DEPTH) {
      // pixel = a × outline + (1 − a) × white: recover a, then the colour without the white.
      const a = clamp01((255 - minChannel(i)) / Math.max(1, 255 - outline));
      for (let c = 0; c < 3; c++) {
        const v = data[4 * i + c] ?? 0;
        data[4 * i + c] = a > 0 ? (v - 255 * (1 - a)) / a : 0;
      }
      data[4 * i + 3] = Math.round(a * 255);
    }
  }
  return depth;
}

/** Least-squares circle through the silhouette's edge below the ears, refitted without outliers. */
function fitCircle(image: Rgba, depth: Uint8Array): Circle {
  const { width, height } = image;
  const edge: [number, number][] = [];
  let minX = width;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (depth[y * width + x] === 1) {
        edge.push([x, y]);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const r0 = (maxX - minX) / 2;
  let circle: Circle = { cx: (minX + maxX) / 2, cy: maxY - r0, r: r0 };
  let points = edge.filter(([, y]) => y > circle.cy - EAR_CUTOFF * circle.r);
  for (let pass = 0; pass < 4; pass++) {
    circle = kasa(points);
    const c = circle;
    points = points.filter(
      ([x, y]) => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) <= FIT_TOLERANCE * (4 - pass),
    );
  }
  return kasa(points);
}

function kasa(points: readonly (readonly [number, number])[]): Circle {
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

/** A square of opaque content centred on the circle (the sprite's origin is the cat's centre). */
function cropAround(image: Rgba, circle: Circle): Rgba {
  const { data, width, height } = image;
  let half = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[4 * (y * width + x) + 3] ?? 0) > 8) {
        half = Math.max(half, Math.abs(x + 0.5 - circle.cx), Math.abs(y + 0.5 - circle.cy));
      }
    }
  }
  const side = 2 * Math.ceil(half + MARGIN);
  const ox = Math.round(circle.cx - side / 2);
  const oy = Math.round(circle.cy - side / 2);
  const out = new Uint8ClampedArray(side * side * 4);
  for (let y = 0; y < side; y++) {
    const sy = y + oy;
    if (sy < 0 || sy >= height) continue;
    for (let x = 0; x < side; x++) {
      const sx = x + ox;
      if (sx < 0 || sx >= width) continue;
      const s = 4 * (sy * width + sx);
      const d = 4 * (y * side + x);
      for (let c = 0; c < 4; c++) out[d + c] = data[s + c] ?? 0;
    }
  }
  return { data: out, width: side, height: side };
}

/** The body's colour: the median of the left and right sides of a ring inside the outline. */
function ringColor(image: Rgba, centre: number, radius: number): string {
  const samples: number[][] = [];
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    // The sides only: the top is the head between the ears, the bottom is often the belly.
    if (Math.abs(Math.cos(t)) < 0.7) continue;
    for (const f of [0.8, 0.85, 0.9]) {
      const x = Math.round(centre + Math.cos(t) * radius * f);
      const y = Math.round(centre + Math.sin(t) * radius * f);
      samples.push(pixel(image, x, y));
    }
  }
  return median(samples);
}

function pixel(image: Rgba, x: number, y: number): number[] {
  const i = 4 * (y * image.width + x);
  return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
}

/** The median by luminance, so the result is a colour that is really in the image. */
function median(samples: number[][]): string {
  const lum = (c: number[]): number => 0.3 * (c[0] ?? 0) + 0.59 * (c[1] ?? 0) + 0.11 * (c[2] ?? 0);
  const sorted = [...samples].sort((a, b) => lum(a) - lum(b));
  const c = sorted[Math.floor(sorted.length / 2)] ?? [0, 0, 0];
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function dataModule(looks: readonly LookData[]): string {
  const rows = looks
    .map(
      (l) => `  { file: '${l.file}', side: ${l.side}, radius: ${l.radius}, color: '${l.color}' },`,
    )
    .join('\n');
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/cats/: do not edit by hand.
 * One entry per look (index 0 is look 1): the sprite in public/assets/cats/, its side and the body
 * circle's radius in sprite pixels (the circle is centred in the sprite) and the body's colour.
 */
import type { CatSprite } from './catSprites';

export const CAT_SPRITE_DATA: readonly CatSprite[] = [
${rows}
];
`;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

await main();
