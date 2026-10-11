/**
 * The effect sheets of Batch 18 (docs/ART_ASSETS.md §4.12): Heavy Drop's two flames and
 * Porcelain's two crack patterns and two gold seams, from `art-source/fx/`, written to
 * `public/assets/fx/` with their measurements in `src/config/fxSpriteData.ts`.
 *
 * - `fireball`: two flames side by side, each a round head at the bottom with flames rising from
 *   it. They are split at the empty column between them, the white is cut, and the head circle is
 *   fitted to the bottom of the outline (the middle 60% of its columns), so the game can put the
 *   head under a falling ball.
 * - `porcelain`: a 2×2 grid, cracks on top and seams below. Lines on white enclose white between
 *   their branches, so every white region bigger than a highlight is cut (not only the one touching
 *   the border); each pattern is cropped to a square centred on its lines, with the circle through
 *   their farthest pixel, and anything outside that circle cleared.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  components,
  crop,
  cutBackground,
  findSource,
  flood,
  kasa,
  loadRgba,
  opaqueBox,
  round,
  saveWebp,
  WHITE_MIN,
} from './artImage.ts';
import type { Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/fx';
const OUT_DIR = 'public/assets/fx';
const DATA_FILE = 'src/config/fxSpriteData.ts';
/** Transparent margin around a sprite, px. */
const MARGIN = 2;
/** The head circle is fitted to the bottom of the outline over this middle share of its width. */
const HEAD_FIT_SHARE = 0.6;
/** Enclosed white regions at least this big (px) are background; smaller ones are highlights. */
const HOLE_MIN_PX = 120;

interface Flame {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** The head circle's centre and radius in sprite pixels. */
  readonly headX: number;
  readonly headY: number;
  readonly headR: number;
}

interface Pattern {
  readonly file: string;
  /** The square sprite's side; the pattern's circle is centred in it. */
  readonly side: number;
  readonly radius: number;
}

export async function buildFx(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const flames = await buildFlames(await loadRgba(await findSource(SOURCE_DIR, 'fireball')));
  const { cracks, seams } = await buildPorcelain(
    await loadRgba(await findSource(SOURCE_DIR, 'porcelain')),
  );
  await writeFile(DATA_FILE, dataModule({ flames, cracks, seams }));
  console.log(`Fx: ${flames.length} flames, ${cracks.length} cracks, ${seams.length} seams`);
}

async function buildFlames(sheet: Rgba): Promise<Flame[]> {
  cutBackground(sheet);
  const split = emptyColumnNear(sheet, sheet.width / 2);
  const flames: Flame[] = [];
  for (const [i, half] of [
    { x: 0, y: 0, w: split, h: sheet.height },
    { x: split, y: 0, w: sheet.width - split, h: sheet.height },
  ].entries()) {
    const part = crop(sheet, half);
    const box = opaqueBox(part);
    const flame = crop(part, {
      x: box.x - MARGIN,
      y: box.y - MARGIN,
      w: box.w + 2 * MARGIN,
      h: box.h + 2 * MARGIN,
    });
    const head = fitHead(flame);
    const file = `flame-${i === 0 ? 'small' : 'big'}.webp`;
    await saveWebp(flame, join(OUT_DIR, file));
    console.log(
      `${file}: ${flame.width}×${flame.height}, head (${round(head.cx)}, ${round(head.cy)}) r=${round(head.r)}`,
    );
    flames.push({
      file,
      width: flame.width,
      height: flame.height,
      headX: round(head.cx),
      headY: round(head.cy),
      headR: round(head.r),
    });
  }
  return flames;
}

/** The empty column (no pixel with any alpha) nearest `x`. */
function emptyColumnNear(image: Rgba, x: number): number {
  const empty = (col: number): boolean => {
    for (let y = 0; y < image.height; y++) {
      if ((image.data[4 * (y * image.width + col) + 3] ?? 0) > 8) return false;
    }
    return true;
  };
  for (let d = 0; d < image.width / 2; d++) {
    for (const col of [Math.round(x) - d, Math.round(x) + d]) {
      if (col > 0 && col < image.width - 1 && empty(col)) return col;
    }
  }
  throw new Error('fx/fireball: no empty column between the two flames');
}

/** The head: the circle through the bottom of the flame's outline, over its middle columns. */
function fitHead(flame: Rgba): { cx: number; cy: number; r: number } {
  const main = components(flame)[0];
  if (!main) throw new Error('fx/fireball: a flame is empty');
  const from = Math.round(main.x + ((1 - HEAD_FIT_SHARE) / 2) * main.w);
  const to = Math.round(main.x + ((1 + HEAD_FIT_SHARE) / 2) * main.w);
  const points: [number, number][] = [];
  for (let x = from; x <= to; x++) {
    for (let y = flame.height - 1; y >= 0; y--) {
      if ((flame.data[4 * (y * flame.width + x) + 3] ?? 0) > 128) {
        points.push([x, y + 0.5]);
        break;
      }
    }
  }
  return kasa(points);
}

async function buildPorcelain(sheet: Rgba): Promise<{ cracks: Pattern[]; seams: Pattern[] }> {
  const w = Math.floor(sheet.width / 2);
  const h = Math.floor(sheet.height / 2);
  const cracks: Pattern[] = [];
  const seams: Pattern[] = [];
  // Top left, top right: the cracks; bottom left, bottom right: the seams.
  for (let cell = 0; cell < 4; cell++) {
    const quarter = crop(sheet, { x: (cell % 2) * w, y: Math.floor(cell / 2) * h, w, h });
    cutBackground(quarter, undefined, whiteRegions(quarter));
    const variant = cell % 2;
    const name = cell < 2 ? `crack-${variant}.webp` : `seam-${variant}.webp`;
    const pattern = await savePattern(quarter, name);
    (cell < 2 ? cracks : seams).push(pattern);
  }
  return { cracks, seams };
}

/** One pixel of every near-white region of at least HOLE_MIN_PX pixels. */
function whiteRegions(image: Rgba): number[] {
  const n = image.width * image.height;
  const region = new Uint8Array(n);
  const seeds: number[] = [];
  for (let i = 0; i < n; i++) {
    if (region[i] || !nearWhite(image, i)) continue;
    let size = 0;
    flood(image, [i], (j) => {
      region[j] = 1;
      size++;
    });
    if (size >= HOLE_MIN_PX) seeds.push(i);
  }
  return seeds;
}

function nearWhite(image: Rgba, i: number): boolean {
  const { data } = image;
  return Math.min(data[4 * i] ?? 0, data[4 * i + 1] ?? 0, data[4 * i + 2] ?? 0) >= WHITE_MIN;
}

/** Crops the pattern to a square around its circle, clears what lies outside and saves it. */
async function savePattern(image: Rgba, file: string): Promise<Pattern> {
  const box = opaqueBox(image);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let radius = 0;
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      if ((image.data[4 * (y * image.width + x) + 3] ?? 0) > 8) {
        radius = Math.max(radius, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
      }
    }
  }
  radius = Math.ceil(radius);
  const side = 2 * (radius + MARGIN);
  const sprite = crop(image, {
    x: Math.round(cx - side / 2),
    y: Math.round(cy - side / 2),
    w: side,
    h: side,
  });
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (Math.hypot(x + 0.5 - side / 2, y + 0.5 - side / 2) > radius) {
        sprite.data[4 * (y * side + x) + 3] = 0;
      }
    }
  }
  await saveWebp(sprite, join(OUT_DIR, file));
  console.log(`${file}: ${side}px, circle r=${radius}`);
  return { file, side, radius };
}

function dataModule(data: { flames: Flame[]; cracks: Pattern[]; seams: Pattern[] }): string {
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/fx/: do not edit by hand.
 * Heavy Drop's flames and Porcelain's cracks and seams in public/assets/fx/ (see fxSprites.ts).
 */
import type { FxSprites } from './fxSprites';

export const FX_SPRITE_DATA: FxSprites = ${JSON.stringify(data, null, 2)};
`;
}
