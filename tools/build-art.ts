/**
 * Final art pipeline (TECH_SPEC §14, docs/ART_ASSETS.md): turns the owner's generated images into
 * game sprites. Run it with `npm run art` after adding or replacing a file in `art-source/`. The
 * scene (jar, paw, background) is built by tools/buildScene.ts, the HUD by tools/buildHud.ts.
 *
 * For each `art-source/cats/size-NN.{png,jpg,jpeg,webp}` (NN = 01–09, one per look):
 *   1. removes the plain white background: the near-white region connected to the image border,
 *      with the anti-aliased edge un-blended from white, so no white fringe shows on dark ground;
 *   2. fits the body circle to the outline below the ears (the physics circle);
 *   3. crops a square centred on that circle, wide enough for the ears;
 *   4. writes `public/assets/cats/look-NN.webp` and measures the body's colour.
 * The measurements go to `src/config/catSpriteData.ts`, which the game reads.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  crop,
  cutBackground,
  findSource,
  loadRgba,
  median,
  pixel,
  round,
  saveWebp,
} from './artImage.ts';
import type { Rgba } from './artImage.ts';
import { buildHud } from './buildHud.ts';
import { buildScene } from './buildScene.ts';

const SOURCE_DIR = 'art-source/cats';
const OUT_DIR = 'public/assets/cats';
const DATA_FILE = 'src/config/catSpriteData.ts';
const LOOK_COUNT = 9;

/** Contour points above this fraction of the radius over the centre are ears, not body. */
const EAR_CUTOFF = 0.45;
/** Contour points further than this (px) from the fitted circle are dropped before refitting. */
const FIT_TOLERANCE = 4;
/** Transparent margin around the sprite, px. */
const MARGIN = 2;

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
  await mkdir(OUT_DIR, { recursive: true });
  const looks: LookData[] = [];
  for (let look = 1; look <= LOOK_COUNT; look++) {
    const nn = String(look).padStart(2, '0');
    const source = await findSource(SOURCE_DIR, `size-${nn}`);
    looks.push(await buildLook(look, source, `look-${nn}.webp`));
  }
  await writeFile(DATA_FILE, dataModule(looks));
  console.log(`Wrote ${looks.length} cats to ${OUT_DIR} and ${DATA_FILE}`);
  await buildScene();
  await buildHud();
}

async function buildLook(look: number, path: string, file: string): Promise<LookData> {
  const image = await loadRgba(path);
  const depth = cutBackground(image);
  const circle = fitCircle(image, depth);
  const sprite = cropAround(image, circle);
  const radius = circle.r;
  await saveWebp(sprite, join(OUT_DIR, file));
  const centre = sprite.width / 2;
  const result: LookData = {
    look,
    file,
    side: sprite.width,
    radius: round(radius),
    color: ringColor(sprite, centre, radius),
  };
  console.log(
    `${path}: circle r=${result.radius} (${round((2 * radius) / image.width)} of the width), ` +
      `sprite ${sprite.width}px, body ${result.color}`,
  );
  return result;
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
  const x = Math.round(circle.cx - side / 2);
  const y = Math.round(circle.cy - side / 2);
  return crop(image, { x, y, w: side, h: side });
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

await main();
