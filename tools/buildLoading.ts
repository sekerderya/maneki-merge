/**
 * The loading screen's bar (docs/ART_ASSETS.md §4.17): `art-source/loading/bar` (the long score
 * card with an empty caramel well) and `bar-full` (the same picture, an edit with the well full of
 * gold), written to `public/assets/loading/` with their measurements in
 * `src/config/loadingSpriteData.ts`.
 *
 * - bar.webp: the empty bar, its white cut and cropped.
 * - fill.webp: the gold alone. It is where the two pictures differ (the frames match pixel for
 *   pixel): every pixel that differs clearly, the specks between them filled in, and a soft edge
 *   whose alpha follows the difference, so laid over the bar it gives back the full picture. Its
 *   place on the bar is `x`, `y`.
 * Both are three-slice strips with matching caps: `left` covers the paw's slanted end, `right` the
 * round ends (the well's and the bar's), so the gold grows from the paw with the loading and, full,
 * lies exactly on the well (ui/loadingScreen.ts).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crop, cutBackground, findSource, loadRgba, opaqueBox, saveWebp } from './artImage.ts';
import type { Rect, Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/loading';
const OUT_DIR = 'public/assets/loading';
const DATA_FILE = 'src/config/loadingSpriteData.ts';
/** A pixel is gold when the full picture differs from the empty one by more than this. */
const GOLD_DIFF = 24;
/** Below this difference a pixel is the same in both pictures (JPEG noise). */
const SAME_DIFF = 8;
/** The soft edge reaches this far (px) out of the gold. */
const EDGE = 3;
/** Columns this much shorter than the strip's plain middle belong to a cap. */
const CAP_SLACK = 3;
/** Extra columns each cap keeps past where its shape ends. */
const CAP_MARGIN = 6;

interface Strip {
  file: string;
  width: number;
  height: number;
  left: number;
  right: number;
}

export async function buildLoading(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const empty = await loadRgba(await findSource(SOURCE_DIR, 'bar'));
  const full = await loadRgba(await findSource(SOURCE_DIR, 'bar-full'));
  if (empty.width !== full.width || empty.height !== full.height) {
    throw new Error('loading/bar and loading/bar-full must be the same size');
  }

  const fillImage = goldOf(empty, full);
  const fillBox = opaqueBox(fillImage);
  cutBackground(empty);
  const barBox = opaqueBox(empty);

  // The caps: wide enough for both shapes' ends, and the same columns on both strips.
  const [fillStart, fillEnd] = plainColumns(fillImage, fillBox);
  const [barStart, barEnd] = plainColumns(empty, barBox);
  const capStart = Math.max(fillStart, barStart) + CAP_MARGIN;
  const capEnd = Math.min(fillEnd, barEnd) - CAP_MARGIN;
  if (capEnd <= capStart) throw new Error('The loading bar has no plain middle');

  const bar: Strip = {
    ...(await save(crop(empty, barBox), 'bar.webp')),
    left: capStart - barBox.x,
    right: barBox.x + barBox.w - capEnd,
  };
  const fill: Strip & { x: number; y: number } = {
    ...(await save(crop(fillImage, fillBox), 'fill.webp')),
    x: fillBox.x - barBox.x,
    y: fillBox.y - barBox.y,
    left: capStart - fillBox.x,
    right: fillBox.x + fillBox.w - capEnd,
  };
  await writeFile(DATA_FILE, dataModule(bar, fill));
  console.log(
    `Loading: bar ${bar.width}×${bar.height} (caps ${bar.left}, ${bar.right}), gold ` +
      `${fill.width}×${fill.height} at ${fill.x},${fill.y} (caps ${fill.left}, ${fill.right}); ` +
      `wrote ${DATA_FILE}`,
  );
}

/** The full picture's pixels where it differs from the empty one, transparent elsewhere. */
function goldOf(empty: Rgba, full: Rgba): Rgba {
  const { width, height } = full;
  const n = width * height;
  const diff = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) {
      d = Math.max(d, Math.abs((full.data[4 * i + c] ?? 0) - (empty.data[4 * i + c] ?? 0)));
    }
    diff[i] = d;
  }
  // The gold: the largest region that clearly differs, with what it encloses.
  const solid = largestRegion(diff, width, height);
  fillHoles(solid, width, height);
  // Its soft edge: the pixels just outside, as opaque as they differ.
  const near = grow(solid, width, height, EDGE);
  const out = { data: new Uint8ClampedArray(n * 4), width, height };
  for (let i = 0; i < n; i++) {
    const alpha = solid[i]
      ? 255
      : near[i]
        ? Math.round((255 * Math.max(0, (diff[i] ?? 0) - SAME_DIFF)) / (GOLD_DIFF - SAME_DIFF))
        : 0;
    if (alpha === 0) continue;
    for (let c = 0; c < 3; c++) out.data[4 * i + c] = full.data[4 * i + c] ?? 0;
    out.data[4 * i + 3] = Math.min(255, alpha);
  }
  return out;
}

function largestRegion(diff: Uint8Array, width: number, height: number): Uint8Array {
  const n = width * height;
  const label = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let best = -1;
  let bestSize = 0;
  for (let start = 0; start < n; start++) {
    if (label[start] !== -1 || (diff[start] ?? 0) <= GOLD_DIFF) continue;
    let head = 0;
    let tail = 0;
    label[start] = start;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++] ?? 0;
      for (const j of neighbours(i, width, n)) {
        if (label[j] === -1 && (diff[j] ?? 0) > GOLD_DIFF) {
          label[j] = start;
          queue[tail++] = j;
        }
      }
    }
    if (tail > bestSize) {
      bestSize = tail;
      best = start;
    }
  }
  const region = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (label[i] === best) region[i] = 1;
  return region;
}

/** Marks everything `region` encloses (what the picture's border can't reach). */
function fillHoles(region: Uint8Array, width: number, height: number): void {
  const n = width * height;
  const outside = new Uint8Array(n);
  const queue: number[] = [];
  for (let x = 0; x < width; x++) queue.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) queue.push(y * width, y * width + width - 1);
  for (const i of queue) outside[i] = 1;
  while (queue.length > 0) {
    const i = queue.pop() ?? 0;
    for (const j of neighbours(i, width, n)) {
      if (!outside[j] && !region[j]) {
        outside[j] = 1;
        queue.push(j);
      }
    }
  }
  for (let i = 0; i < n; i++) if (!outside[i]) region[i] = 1;
}

/** `region` grown by `steps` px (4-connected). */
function grow(region: Uint8Array, width: number, height: number, steps: number): Uint8Array {
  const n = width * height;
  let current = region;
  for (let s = 0; s < steps; s++) {
    const next = current.slice();
    for (let i = 0; i < n; i++) {
      if (!current[i]) continue;
      for (const j of neighbours(i, width, n)) next[j] = 1;
    }
    current = next;
  }
  return current;
}

function neighbours(i: number, width: number, n: number): number[] {
  const x = i % width;
  return [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width].filter(
    (j) => j >= 0 && j < n,
  );
}

/**
 * The first and last column (picture x) of the strip's plain middle: where a column is as tall as
 * the middle's (the caps' slanted and round ends are shorter).
 */
function plainColumns(image: Rgba, box: Rect): [number, number] {
  const tall = (x: number): number => {
    let count = 0;
    for (let y = box.y; y < box.y + box.h; y++) {
      if ((image.data[4 * (y * image.width + x) + 3] ?? 0) > 128) count++;
    }
    return count;
  };
  const middle = tall(box.x + Math.floor(box.w / 2));
  let start = box.x;
  while (start < box.x + box.w && tall(start) < middle - CAP_SLACK) start++;
  let end = box.x + box.w - 1;
  while (end > start && tall(end) < middle - CAP_SLACK) end--;
  return [start, end];
}

async function save(
  image: Rgba,
  file: string,
): Promise<{ file: string; width: number; height: number }> {
  await saveWebp(image, join(OUT_DIR, file));
  return { file, width: image.width, height: image.height };
}

function dataModule(bar: Strip, fill: Strip & { x: number; y: number }): string {
  // One field per line, as Prettier writes it.
  const object = (fields: Record<string, string | number>): string => {
    const lines = Object.entries(fields).map(
      ([key, value]) => `  ${key}: ${typeof value === 'string' ? `'${value}'` : value},`,
    );
    return `{\n${lines.join('\n')}\n}`;
  };
  return `/**
 * Generated by tools/buildLoading.ts (\`npm run art\`) from art-source/loading/: do not edit by hand.
 * The loading screen's bar and its gold (public/assets/loading/), in source pixels: \`left\` and
 * \`right\` are the three-slice caps; the gold sits at \`x\`, \`y\` on the bar.
 */
import type { LoadingBarSprite, LoadingFillSprite } from './loadingSprites';

export const LOADING_BAR_SPRITE: LoadingBarSprite = ${object({ ...bar })};
export const LOADING_FILL_SPRITE: LoadingFillSprite = ${object({ ...fill })};
`;
}
