/**
 * The scene part of the art pipeline (TECH_SPEC §14): the jar, the paw and the background from
 * `art-source/scene/`, written to `public/assets/scene/` with their measurements in
 * `src/config/sceneSpriteData.ts`.
 *
 * - Jar: the white outside and the white opening become transparent. The opening is measured
 *   from the bamboo's dark inner outline (walls, floor, the rail's underside as the rim, and the
 *   bottom corners' radius), and the image is split in two: what lies inside the opening (the
 *   glass's inner edge, the rail) goes behind the cats, the bamboo frame in front of them.
 * - Paw: the white is cut, the image is cropped, and a plain row of the arm is found for the game
 *   to stretch up to the top of the screen.
 * - Background: converted as is; its sky and floor colours are sampled for the screen around it.
 * - Noren: the white is cut (also the holes between the loops under the rod), the rod is recoloured
 *   to the owner's mockup, and the rows the game may stretch are measured: from under the coin to
 *   above the pink band.
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
/** Piece finding: rows are scanned in bands this tall; gaps this wide split a band's pieces. */
const PIECE_BAND = 40;
const PIECE_GAP = 24;
/** The noren's rod in the owner's mockup (art-source/scene/noren-mockup.webp): a dusty rose wood. */
const NOREN_ROD = [201, 153, 128] as const;
/** Rows kept plain above the pink band and below the coin when stretching, px. */
const NOREN_SLICE_MARGIN = 14;

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
  cornerRadius: number;
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

interface NorenData {
  file: string;
  width: number;
  height: number;
  left: number;
  right: number;
  hem: number;
  sliceTop: number;
  sliceBottom: number;
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
  const noren = await buildNoren(await findSource(SOURCE_DIR, 'noren'));
  await writeFile(DATA_FILE, dataModule(jar, paw, background, noren));
  console.log(`Wrote the scene to ${OUT_DIR} and ${DATA_FILE}`);
}

async function buildJar(path: string): Promise<JarData> {
  const image = await loadRgba(path);
  const { width, height } = image;
  cutBackground(image);
  clearRegion(image, width / 2, height / 2);

  const ink = (x: number, y: number): boolean =>
    alphaAt(image, x, y) > 128 && (pixel(image, x, y)[0] ?? 255) < INK_MAX_RED;
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

  // The corner radius that best fits the outline where the wall turns into the floor.
  const corner: [number, number][] = [];
  for (let y = Math.round(floor - 300); y < floor; y++) {
    corner.push([scan(cx, 0, (x) => ink(x, y)) + 0.5, y]);
  }
  for (let x = Math.round(left); x < left + 300; x++) {
    corner.push([x, scan(Math.round(height / 2), height - 1, (y) => ink(x, y)) - 0.5]);
  }
  let best = { error: Infinity, radius: 0 };
  for (let r = 40; r < 300; r++) {
    const ox = left + r;
    const oy = floor - r;
    const errors = corner
      .filter(([x, y]) => x < ox && y > oy)
      .map(([x, y]) => Math.abs(Math.hypot(x - ox, y - oy) - r));
    if (errors.length < 30) continue;
    const error = errors.reduce((a, b) => a + b, 0) / errors.length;
    if (error < best.error) best = { error, radius: r };
  }
  const radius = best.radius;

  // Inside the opening (and the column above it, where the rail is) goes behind the cats.
  const inside = (x: number, y: number): boolean => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (px < left || px > right || py > floor) return false;
    if (py < floor - radius) return true;
    const ox = Math.min(Math.max(px, left + radius), right - radius);
    return Math.hypot(px - ox, py - (floor - radius)) <= radius;
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
    cornerRadius: radius,
    backPieces: pieces(back),
    frontPieces: pieces(front),
  };
  console.log(
    `${path}: opening x ${left}–${right}, rim ${rim} (rail from ${railTop}), floor ${floor} ` +
      `(1 : ${round((floor - rim) / (right - left))}), corners r=${radius} ` +
      `(fit ${round(best.error)} px), ${data.backPieces.length} back and ` +
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

async function buildNoren(path: string): Promise<NorenData> {
  const source = await loadRgba(path);
  cutBackground(source);
  const { width, height } = source;
  const hsv = (x: number, y: number): { max: number; sat: number } => {
    const [r = 0, g = 0, b = 0] = pixel(source, x, y);
    const max = Math.max(r, g, b);
    return { max, sat: max > 0 ? (max - Math.min(r, g, b)) / max : 0 };
  };
  // The rod: the rows in the top third where most of the width is tan wood.
  const wood = (x: number, y: number): boolean => {
    const { max, sat } = hsv(x, y);
    return alphaAt(source, x, y) > 128 && max > 150 && sat > 0.2;
  };
  const rodRows: number[] = [];
  for (let y = 0; y < height / 3; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if (wood(x, y)) count++;
    if (count > width * 0.3) rodRows.push(y);
  }
  const rodTop = rodRows[0] ?? 0;
  const rodBottom = rodRows[rodRows.length - 1] ?? 0;
  // Each wood pixel takes the mockup's colour, keeping its light and shade.
  const woodSamples: number[][] = [];
  for (let y = rodTop; y <= rodBottom; y++) {
    for (let x = 0; x < width; x += 3) if (wood(x, y)) woodSamples.push(pixel(source, x, y));
  }
  const base = median(woodSamples)
    .slice(1)
    .match(/../g)
    ?.map((h) => parseInt(h, 16)) ?? [255, 255, 255];
  for (let y = Math.max(0, rodTop - 3); y <= rodBottom + 3; y++) {
    for (let x = 0; x < width; x++) {
      if (!wood(x, y)) continue;
      const i = 4 * (y * width + x);
      for (let c = 0; c < 3; c++) {
        source.data[i + c] = ((source.data[i + c] ?? 0) * NOREN_ROD[c]!) / Math.max(1, base[c]!);
      }
    }
  }
  // The white holes between the rod, its loops and the fabric's top edge.
  for (let x = 0; x < width; x++) {
    for (let y = rodBottom + 1; y < rodBottom + 30; y++) {
      const [r = 0, g = 0, b = 0] = pixel(source, x, y);
      if (alphaAt(source, x, y) > 0 && Math.min(r, g, b) >= 236) clearRegion(source, x, y);
    }
  }
  const box = opaqueBox(source);
  const image = crop(source, box);
  const cx = Math.round(image.width / 2);
  // The coin: gold pixels near the middle, under the rod.
  let coinBottom = 0;
  for (let y = rodBottom - box.y + 8; y < image.height / 2; y++) {
    for (let x = cx - 90; x < cx + 90; x++) {
      const [r = 0, g = 0, b = 0] = pixel(image, x, y);
      if (r > 200 && g > 130 && r - b > 90 && alphaAt(image, x, y) > 128) coinBottom = y;
    }
  }
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
  const [left, right] = span(Math.round(image.height * 0.6));
  // The pink band: from each panel's middle up from the hem to the first row that isn't pink.
  const hem = image.height;
  let bandTop = hem;
  for (let k = 0; k < 4; k++) {
    const x = Math.round(left + ((right - left) * (2 * k + 1)) / 8);
    let y = hem - 8;
    while (y > hem / 2) {
      const [r = 0, g = 0, b = 0] = pixel(image, x, y);
      if (!(r - g > 25 && r - b > 25) || alphaAt(image, x, y) < 128) break;
      y--;
    }
    bandTop = Math.min(bandTop, y);
  }
  await saveWebp(image, join(OUT_DIR, 'noren.webp'));
  const data: NorenData = {
    file: 'noren.webp',
    width: image.width,
    height: image.height,
    left,
    right: right + 1,
    hem,
    sliceTop: coinBottom + NOREN_SLICE_MARGIN,
    sliceBottom: bandTop - NOREN_SLICE_MARGIN,
  };
  console.log(
    `${path}: ${image.width}×${image.height}, rod rows ${rodTop}–${rodBottom} ` +
      `(was ${median(woodSamples)}), panels ${left}–${right}, stretch ${data.sliceTop}–${data.sliceBottom}`,
  );
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

function dataModule(jar: JarData, paw: PawData, bg: BackgroundData, noren: NorenData): string {
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/scene/: do not edit by hand.
 * Image pixels of the sprites in public/assets/scene/ (see sceneSprites.ts for each field).
 */
import type { BackgroundSprite, JarSprite, NorenSprite, PawSprite } from './sceneSprites';

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
  cornerRadius: ${jar.cornerRadius},
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

export const NOREN_SPRITE: NorenSprite = {
  file: '${noren.file}',
  width: ${noren.width},
  height: ${noren.height},
  left: ${noren.left},
  right: ${noren.right},
  hem: ${noren.hem},
  sliceTop: ${noren.sliceTop},
  sliceBottom: ${noren.sliceBottom},
};
`;
}
