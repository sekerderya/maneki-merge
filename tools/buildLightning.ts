/**
 * The Lightning blessing's effect sheets (docs/ART_ASSETS.md §4.16, GAME_DESIGN §15.15), from
 * `art-source/fx/bolts`, `skybolts`, `zap` and `shock`, written to `public/assets/fx/lightning-*`
 * with their measurements in `src/config/lightningSpriteData.ts`. Missing sheets leave the data
 * `null`, and the game draws its stand-ins (game/fx/lightningFrames.ts).
 *
 * The sheets are light on plain black, so the black becomes transparency: a pixel's alpha is its
 * brightest channel (above a small floor, so JPEG noise in the black goes) and its colour is divided
 * by it, so the sprite over black looks as the sheet did. Then:
 *
 * - `bolts`: six chain bolts in rows, split at the empty bands between them. Each bolt's two ends
 *   (`a` on the left, `b` on the right) are where its bright core starts and stops, and its band is
 *   its height, so the game can stretch it between two balls.
 * - `skybolts`: three bolts in columns: `a` where the core leaves the top, `b` the centre of the
 *   flash at its tip.
 * - `zap`: a 3×2 grid: the impact flash, the shock ring and the burst of sparks on top (each with
 *   the radius of the circle it fills: the ring's line, the others' reach), three small arcs below
 *   (bolts like the chain's, from one end of the core to the other).
 * - `shock`: a 2×2 grid of crackle patterns, each cropped to a square centred on its pattern with
 *   the radius of its outermost bright lines.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crop, findSource, loadRgba, opaqueBox, round, saveWebp } from './artImage.ts';
import type { Rect, Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/fx';
const OUT_DIR = 'public/assets/fx';
const DATA_FILE = 'src/config/lightningSpriteData.ts';
/** Brightness at or below this is black (JPEG noise); above it the alpha rises to 1 at white. */
const BLACK_FLOOR = 14;
/** A pixel this opaque belongs to a bolt's bright core (its ends are measured on the core). */
const CORE_ALPHA = 200;
/** A row or column with less alpha than this in all is empty: pieces are split there. */
const EMPTY_LINE = 2 * 255;
/** Transparent margin around a sprite, px. */
const MARGIN = 2;

interface BoltData {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly band: number;
}

interface RoundData {
  readonly file: string;
  readonly side: number;
  readonly radius: number;
}

interface LightningData {
  readonly bolts: BoltData[];
  readonly sky: BoltData[];
  readonly flash: RoundData;
  readonly ring: RoundData;
  readonly sparks: RoundData;
  readonly arcs: BoltData[];
  readonly shocks: RoundData[];
}

export async function buildLightning(): Promise<void> {
  const sheet = async (base: string): Promise<Rgba | null> => {
    const path = await findSource(SOURCE_DIR, base).catch(() => null);
    return path ? lightToAlpha(await loadRgba(path)) : null;
  };
  const [bolts, sky, zap, shock] = await Promise.all(
    ['bolts', 'skybolts', 'zap', 'shock'].map(sheet),
  );
  if (!bolts || !sky || !zap || !shock) {
    await writeFile(DATA_FILE, dataModule(null));
    console.log('Lightning: sheets missing, the game draws its stand-ins');
    return;
  }
  await mkdir(OUT_DIR, { recursive: true });
  const data: LightningData = {
    bolts: await Promise.all(
      bands(bolts, 'rows').map((piece, i) => saveBolt(piece, `lightning-bolt-${i}.webp`, 'across')),
    ),
    sky: await Promise.all(
      bands(sky, 'columns').map((piece, i) => saveBolt(piece, `lightning-sky-${i}.webp`, 'down')),
    ),
    ...(await zapPieces(zap)),
    shocks: await Promise.all(
      grid(shock, 2, 2).map((piece, i) => saveRound(piece, `lightning-shock-${i}.webp`, 'edge')),
    ),
  };
  await writeFile(DATA_FILE, dataModule(data));
  console.log(
    `Lightning: ${data.bolts.length} bolts, ${data.sky.length} sky bolts, ` +
      `${data.arcs.length} arcs, ${data.shocks.length} crackles`,
  );
}

/** Light on black → straight alpha: alpha from the brightest channel, the colour un-blended. */
function lightToAlpha(image: Rgba): Rgba {
  const data = new Uint8ClampedArray(image.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b);
    if (max <= BLACK_FLOOR) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    const k = 255 / max;
    data[i] = r * k;
    data[i + 1] = g * k;
    data[i + 2] = b * k;
    data[i + 3] = (255 * (max - BLACK_FLOOR)) / (255 - BLACK_FLOOR);
  }
  return { data, width: image.width, height: image.height };
}

/** The pieces of a sheet laid out in rows or columns, split at empty bands, each trimmed. */
function bands(image: Rgba, along: 'rows' | 'columns'): Rgba[] {
  const { data, width, height } = image;
  const count = along === 'rows' ? height : width;
  const sums = new Float64Array(count);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const line = along === 'rows' ? y : x;
      sums[line] = (sums[line] ?? 0) + (data[4 * (y * width + x) + 3] ?? 0);
    }
  }
  const pieces: Rgba[] = [];
  let start = -1;
  for (let i = 0; i <= count; i++) {
    const full = i < count && (sums[i] ?? 0) > EMPTY_LINE;
    if (full && start < 0) start = i;
    if (!full && start >= 0) {
      const rect: Rect =
        along === 'rows'
          ? { x: 0, y: start, w: width, h: i - start }
          : { x: start, y: 0, w: i - start, h: height };
      // Specks of noise make thin bands: a piece is at least 2% of the sheet.
      if (i - start > count * 0.02) pieces.push(trim(crop(image, rect)));
      start = -1;
    }
  }
  return pieces;
}

/** A `cols` × `rows` grid of equal cells, left to right and top to bottom, each trimmed. */
function grid(image: Rgba, cols: number, rows: number): Rgba[] {
  const w = Math.floor(image.width / cols);
  const h = Math.floor(image.height / rows);
  const cells: Rgba[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++)
      cells.push(trim(crop(image, { x: col * w, y: row * h, w, h })));
  }
  return cells;
}

/** Cropped to its opaque box with MARGIN round it. */
function trim(image: Rgba): Rgba {
  const box = opaqueBox(image);
  return crop(image, {
    x: box.x - MARGIN,
    y: box.y - MARGIN,
    w: box.w + 2 * MARGIN,
    h: box.h + 2 * MARGIN,
  });
}

/** The core's pixels (alpha at least CORE_ALPHA) as [x, y]. */
function corePixels(image: Rgba): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[4 * (y * image.width + x) + 3] ?? 0) >= CORE_ALPHA) out.push([x, y]);
    }
  }
  return out;
}

/** The mean of some points. */
function mean(points: readonly (readonly [number, number])[]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  return [sx / points.length, sy / points.length];
}

/**
 * A bolt and its ends. `across`: from the core's left end to its right end (a chain bolt, an
 * arc); `down`: from where the core leaves the top to the flash at its tip (a sky bolt).
 */
async function saveBolt(image: Rgba, file: string, way: 'across' | 'down'): Promise<BoltData> {
  const core = corePixels(image);
  const ends = way === 'across' ? acrossEnds(core) : downEnds(core);
  await saveWebp(image, join(OUT_DIR, file));
  const [[ax, ay], [bx, by]] = ends;
  return {
    file,
    width: image.width,
    height: image.height,
    ax: round(ax),
    ay: round(ay),
    bx: round(bx),
    by: round(by),
    band: way === 'across' ? image.height : image.width,
  };
}

/** The core's two ends along its longest stretch: its leftmost and rightmost few columns. */
function acrossEnds(core: readonly [number, number][]): [[number, number], [number, number]] {
  const xs = core.map(([x]) => x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const reach = Math.max(2, (max - min) * 0.01);
  return [
    mean(core.filter(([x]) => x <= min + reach)),
    mean(core.filter(([x]) => x >= max - reach)),
  ];
}

/** Where the core leaves the top, and the centre of the flash at its tip (its lowest rows). */
function downEnds(core: readonly [number, number][]): [[number, number], [number, number]] {
  const ys = core.map(([, y]) => y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const tip = (max - min) * 0.03;
  return [mean(core.filter(([, y]) => y <= min + 2)), mean(core.filter(([, y]) => y >= max - tip))];
}

/** The zap sheet: the flash, the ring and the sparks on top, the three arcs below. */
async function zapPieces(zap: Rgba) {
  const [flash, ring, sparks, ...arcs] = grid(zap, 3, 2) as [Rgba, Rgba, Rgba, ...Rgba[]];
  return {
    flash: await saveRound(flash, 'lightning-flash.webp', 'reach'),
    ring: await saveRound(ring, 'lightning-ring.webp', 'line'),
    sparks: await saveRound(sparks, 'lightning-sparks.webp', 'reach'),
    arcs: await Promise.all(
      arcs.map((arc, i) => saveBolt(arc, `lightning-arc-${i}.webp`, 'across')),
    ),
  };
}

/**
 * A round piece, squared round its centre. Its radius: `reach`, half its box; `line`, the mean
 * distance of its core from the centre (a ring's line); `edge`, how far its outermost core reaches
 * (the crackles' rim).
 */
async function saveRound(
  image: Rgba,
  file: string,
  measure: 'reach' | 'line' | 'edge',
): Promise<RoundData> {
  const side = Math.max(image.width, image.height);
  const square = crop(image, {
    x: Math.floor((image.width - side) / 2),
    y: Math.floor((image.height - side) / 2),
    w: side,
    h: side,
  });
  const c = side / 2;
  let radius = side / 2 - MARGIN;
  if (measure !== 'reach') {
    const distances = corePixels(square)
      .map(([x, y]) => Math.hypot(x + 0.5 - c, y + 0.5 - c))
      .sort((a, b) => a - b);
    radius =
      measure === 'line'
        ? distances.reduce((sum, d) => sum + d, 0) / distances.length
        : (distances[Math.floor(distances.length * 0.98)] ?? radius);
  }
  await saveWebp(square, join(OUT_DIR, file));
  return { file, side, radius: round(radius) };
}

function dataModule(data: LightningData | null): string {
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/fx/ (bolts, skybolts, zap,
 * shock): do not edit by hand. The Lightning blessing's effect sprites in public/assets/fx/ (see
 * lightningSprites.ts for each field), or null until the owner's sheets are in.
 */
import type { LightningSprites } from './lightningSprites';

export const LIGHTNING_SPRITE_DATA: LightningSprites | null = ${JSON.stringify(data, null, 2)};
`;
}
