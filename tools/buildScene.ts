/**
 * The scene part of the art pipeline (TECH_SPEC §14): the jar, the paw and the background from
 * `art-source/scene/`, written to `public/assets/scene/` with their measurements in
 * `src/config/sceneSpriteData.ts`.
 *
 * - Jar: the white outside and the white opening become transparent. The opening is measured
 *   from the bamboo's dark inner outline (walls, floor, and the rail's underside as the rim; its
 *   bottom corners are square), and the image is split in two: what lies inside the opening (the
 *   glass's inner edge, the rail) goes behind the cats, the bamboo frame in front of them.
 * - Paw: the white is cut, the image is cropped, and a plain row of the arm is found for the game
 *   to stretch (the vector skin's arm reaches up to the top of the screen; the art's fades out).
 * - Background: converted as is; its sky and floor colours are sampled for the screen around it.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  alphaAt,
  clearRegion,
  crop,
  cutBackground,
  findSource,
  loadRgba,
  median,
  opaqueBox,
  pixel,
  round,
  saveWebp,
} from './artImage.ts';
import type { Rect, Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/scene';
const OUT_DIR = 'public/assets/scene';
const DATA_FILE = 'src/config/sceneSpriteData.ts';

/** The bamboo's ink outline: red channel below this. */
const INK_MAX_RED = 150;
/**
 * The jar's opening is measured from the bamboo's outline, which is darker than this: the pale
 * glass edge inside it has a thin line of its own (red about 145) that must not count.
 */
const JAR_OUTLINE_MAX_RED = 120;
/** A wall's inner edge counts as straight down to the floor while it stays this close, px. */
const CORNER_TOLERANCE = 2;
/** Piece finding: rows are scanned in bands this tall; gaps this wide split a band's pieces. */
const PIECE_BAND = 40;
const PIECE_GAP = 24;

interface JarData {
  back: string;
  front: string;
  width: number;
  height: number;
  left: number;
  right: number;
  rim: number;
  railTop: number;
  floor: number;
  backPieces: Rect[];
  frontPieces: Rect[];
}

interface PawData {
  file: string;
  width: number;
  height: number;
  cx: number;
  bottom: number;
  pawWidth: number;
  armRow: number;
}

interface BackgroundData {
  file: string;
  width: number;
  height: number;
  sky: string;
  ground: string;
}

export async function buildScene(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const jar = await buildJar(await findSource(SOURCE_DIR, 'jar'));
  const paw = await buildPaw(await findSource(SOURCE_DIR, 'paw'));
  const background = await buildBackground(await findSource(SOURCE_DIR, 'background'));
  await writeFile(DATA_FILE, dataModule(jar, paw, background));
  console.log(`Wrote the scene to ${OUT_DIR} and ${DATA_FILE}`);
}

async function buildJar(path: string): Promise<JarData> {
  const image = await loadRgba(path);
  const { width, height } = image;
  cutBackground(image);
  clearRegion(image, width / 2, height / 2);

  const ink = (x: number, y: number): boolean =>
    alphaAt(image, x, y) > 128 && (pixel(image, x, y)[0] ?? 255) < JAR_OUTLINE_MAX_RED;
  const cx = Math.round(width / 2);
  const scan = (from: number, to: number, at: (i: number) => boolean): number => {
    const step = to > from ? 1 : -1;
    for (let i = from; i !== to; i += step) if (at(i)) return i;
    return to;
  };
  const rows = range(Math.round(height * 0.3), Math.round(height * 0.6), 6);
  const cols = range(cx - 60, cx + 60, 6);
  // Edges sit half a pixel past the outline's first ink pixel, on the opening's side.
  const left = medianOf(rows.map((y) => scan(cx, 0, (x) => ink(x, y)))) + 0.5;
  const right = medianOf(rows.map((y) => scan(cx, width - 1, (x) => ink(x, y)))) - 0.5;
  const floor = medianOf(cols.map((x) => scan(height / 2, height - 1, (y) => ink(x, y)))) - 0.5;
  const rim = medianOf(cols.map((x) => scan(height / 2, 0, (y) => ink(x, y)))) + 0.5;
  // The top rail's upper edge over the opening: the first solid pixel above it.
  const railTop = medianOf(
    cols.map((x) => scan(0, Math.round(rim), (y) => alphaAt(image, x, y) > 128)),
  );

  // The physics corners are square: a rounded inner corner would let a cat tuck behind the bamboo.
  // The corner's height is the highest row near the floor where a wall's edge leaves its line.
  let cornerHeight = 0;
  for (let y = Math.round(floor - 80); y < floor - 1; y++) {
    const l = scan(cx, 0, (x) => ink(x, y)) + 0.5;
    const r = scan(cx, width - 1, (x) => ink(x, y)) - 0.5;
    if (l - left > CORNER_TOLERANCE || right - r > CORNER_TOLERANCE) {
      cornerHeight = Math.max(cornerHeight, Math.round(floor - y));
    }
  }
  if (cornerHeight > 0) {
    console.warn(`${path}: the inner bottom corners are rounded over ${cornerHeight} px`);
  }

  // Inside the opening (and the column above it, where the rail is) goes behind the cats.
  const inside = (x: number, y: number): boolean => {
    const px = x + 0.5;
    const py = y + 0.5;
    return px >= left && px <= right && py <= floor;
  };
  const back = split(image, (x, y) => inside(x, y));
  const front = split(image, (x, y) => !inside(x, y));
  await saveWebp(back, join(OUT_DIR, 'jar-back.webp'));
  await saveWebp(front, join(OUT_DIR, 'jar-front.webp'));
  const data: JarData = {
    back: 'jar-back.webp',
    front: 'jar-front.webp',
    width,
    height,
    left,
    right,
    rim,
    railTop,
    floor,
    backPieces: pieces(back),
    frontPieces: pieces(front),
  };
  console.log(
    `${path}: opening x ${left}–${right}, rim ${rim} (rail from ${railTop}), floor ${floor} ` +
      `(1 : ${round((floor - rim) / (right - left))}), ${data.backPieces.length} back and ` +
      `${data.frontPieces.length} front pieces`,
  );
  return data;
}

async function buildPaw(path: string): Promise<PawData> {
  const source = await loadRgba(path);
  // The arm runs off the top edge: its fur there, between the outlines, isn't background.
  const ink: number[] = [];
  for (let x = 0; x < source.width; x++)
    if ((pixel(source, x, 0)[0] ?? 255) < INK_MAX_RED) ink.push(x);
  const armLeft = ink[0] ?? 0;
  const armRight = ink[ink.length - 1] ?? -1;
  cutBackground(source, (x) => x > armLeft && x < armRight);
  const box = opaqueBox(source);
  const margin = 2;
  const image = crop(source, {
    x: box.x - margin,
    y: box.y,
    w: box.w + 2 * margin,
    h: box.h + margin,
  });
  const span = (y: number): [number, number] => {
    let a = -1;
    let b = -1;
    for (let x = 0; x < image.width; x++) {
      if (alphaAt(image, x, y) > 128) {
        if (a < 0) a = x;
        b = x;
      }
    }
    return [a, b];
  };
  // The arm's top rows: the first one whose colours are all fur (no dark or orange spot).
  const [a0, b0] = span(4);
  const cx = (a0 + b0 + 1) / 2;
  let armRow = 4;
  for (let y = 4; y < image.height / 3; y++) {
    const [a, b] = span(y);
    let plain = true;
    for (let x = a + 8; x <= b - 8; x++) {
      const [r = 0, g = 0, bl = 0] = pixel(image, x, y);
      if (Math.min(r, g, bl) < 200) plain = false;
    }
    if (plain) {
      armRow = y;
      break;
    }
  }
  let pawWidth = 0;
  for (let y = Math.round(image.height * 0.6); y < image.height; y++) {
    const [a, b] = span(y);
    if (a >= 0) pawWidth = Math.max(pawWidth, b - a + 1);
  }
  await saveWebp(image, join(OUT_DIR, 'paw.webp'));
  const bottom = opaqueBox(image);
  const data: PawData = {
    file: 'paw.webp',
    width: image.width,
    height: image.height,
    cx,
    bottom: bottom.y + bottom.h,
    pawWidth,
    armRow,
  };
  console.log(`${path}: paw ${pawWidth}px wide, arm ${b0 - a0 + 1}px, plain arm row ${armRow}`);
  return data;
}

async function buildBackground(path: string): Promise<BackgroundData> {
  const image = await loadRgba(path);
  await saveWebp(image, join(OUT_DIR, 'background.webp'), 85);
  const sample = (y0: number, y1: number): string => {
    const samples: number[][] = [];
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < image.width; x += 4) samples.push(pixel(image, x, y));
    }
    return median(samples);
  };
  const data: BackgroundData = {
    file: 'background.webp',
    width: image.width,
    height: image.height,
    sky: sample(0, 6),
    ground: sample(image.height - 6, image.height),
  };
  console.log(`${path}: ${image.width}×${image.height}, sky ${data.sky}, ground ${data.ground}`);
  return data;
}

/** A copy of `image` keeping only the pixels where `keep` holds. */
function split(image: Rgba, keep: (x: number, y: number) => boolean): Rgba {
  const out = new Uint8ClampedArray(image.data);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (!keep(x, y)) out[4 * (y * image.width + x) + 3] = 0;
    }
  }
  return { data: out, width: image.width, height: image.height };
}

/**
 * The parts of `image` that hold something: each band of PIECE_BAND rows is cut into runs of
 * columns with pixels in them (runs closer than PIECE_GAP join), and runs that continue the same
 * columns in the next band merge into one piece.
 */
function pieces(image: Rgba): Rect[] {
  const result: Rect[] = [];
  let open: Rect[] = [];
  for (let y0 = 0; y0 < image.height; y0 += PIECE_BAND) {
    const y1 = Math.min(image.height, y0 + PIECE_BAND);
    const used: boolean[] = [];
    for (let x = 0; x < image.width; x++) {
      let any = false;
      for (let y = y0; y < y1 && !any; y++) any = alphaAt(image, x, y) > 0;
      used.push(any);
    }
    const runs: [number, number][] = [];
    for (let x = 0; x < image.width; x++) {
      if (!used[x]) continue;
      const last = runs[runs.length - 1];
      if (last && x - last[1] <= PIECE_GAP) last[1] = x;
      else runs.push([x, x]);
    }
    const next: Rect[] = [];
    for (const [a, b] of runs) {
      const x = Math.max(0, a - 1);
      const w = Math.min(image.width, b + 2) - x;
      const prev = open.find((r) => Math.abs(r.x - x) <= 4 && Math.abs(r.w - w) <= 8);
      if (prev) {
        const merged = {
          x: Math.min(prev.x, x),
          y: prev.y,
          w: Math.max(prev.x + prev.w, x + w) - Math.min(prev.x, x),
          h: y1 - prev.y,
        };
        result.splice(result.indexOf(prev), 1, merged);
        next.push(merged);
      } else {
        const piece = { x, y: y0, w, h: y1 - y0 };
        result.push(piece);
        next.push(piece);
      }
    }
    open = next;
  }
  return result;
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i += step) out.push(i);
  return out;
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function rects(list: readonly Rect[]): string {
  return list.map((r) => `{ x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h} }`).join(', ');
}

function dataModule(jar: JarData, paw: PawData, bg: BackgroundData): string {
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/scene/: do not edit by hand.
 * Image pixels of the sprites in public/assets/scene/ (see sceneSprites.ts for each field).
 */
import type { BackgroundSprite, JarSprite, PawSprite } from './sceneSprites';

export const JAR_SPRITE: JarSprite = {
  back: '${jar.back}',
  front: '${jar.front}',
  width: ${jar.width},
  height: ${jar.height},
  left: ${jar.left},
  right: ${jar.right},
  rim: ${jar.rim},
  railTop: ${jar.railTop},
  floor: ${jar.floor},
  backPieces: [${rects(jar.backPieces)}],
  frontPieces: [${rects(jar.frontPieces)}],
};

export const PAW_SPRITE: PawSprite = {
  file: '${paw.file}',
  width: ${paw.width},
  height: ${paw.height},
  cx: ${paw.cx},
  bottom: ${paw.bottom},
  pawWidth: ${paw.pawWidth},
  armRow: ${paw.armRow},
};

export const BACKGROUND_SPRITE: BackgroundSprite = {
  file: '${bg.file}',
  width: ${bg.width},
  height: ${bg.height},
  sky: '${bg.sky}',
  ground: '${bg.ground}',
};

`;
}
