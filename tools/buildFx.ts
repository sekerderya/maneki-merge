/**
 * The effect sheets of Batch 18 and 19 (docs/ART_ASSETS.md §4.12–§4.13): Heavy Drop's two flames,
 * Porcelain's two crack patterns and two gold seams, the cursed bell with its ring of flames, and
 * the two dice, from `art-source/fx/`, written to `public/assets/fx/` with their measurements in
 * `src/config/fxSpriteData.ts`.
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

/** The cursed bell (Batch 19): its sprite and the blank tag's fill circle, in sprite pixels. */
interface Bell {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly tagX: number;
  readonly tagY: number;
  readonly tagR: number;
}

/** The ring of flames: a square sprite centred on the ring, its hole's and its outer radius. */
interface Ring {
  readonly file: string;
  readonly side: number;
  readonly inner: number;
  readonly outer: number;
}

/** A die: the lucky one, then the unlucky one. */
interface Die {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

export async function buildFx(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const flames = await buildFlames(await loadRgba(await findSource(SOURCE_DIR, 'fireball')));
  const { cracks, seams } = await buildPorcelain(
    await loadRgba(await findSource(SOURCE_DIR, 'porcelain')),
  );
  const { bell, ring } = await buildCurse(await loadRgba(await findSource(SOURCE_DIR, 'curse')));
  const dice = await buildDice(await loadRgba(await findSource(SOURCE_DIR, 'dice')));
  await writeFile(DATA_FILE, dataModule({ flames, cracks, seams, bell, ring, dice }));
  console.log(
    `Fx: ${flames.length} flames, ${cracks.length} cracks, ${seams.length} seams, ` +
      `the cursed bell and its ring, ${dice.length} dice`,
  );
}

/**
 * Batch 19's curse sheet (docs/ART_ASSETS.md §4.13): the cursed bell on the left, the ring of
 * flames on the right. All white goes, the ring's middle and the cord's loops too. The bell's tag
 * is measured (its cream fill) so the game can write the drops left on it; the ring is cropped to
 * a square centred on the circle through its flames' inner tips.
 */
async function buildCurse(sheet: Rgba): Promise<{ bell: Bell; ring: Ring }> {
  cutBackground(sheet, undefined, whiteRegions(sheet));
  const split = emptyColumnNear(sheet, sheet.width / 2, 'curse');
  const left = trimmed(crop(sheet, { x: 0, y: 0, w: split, h: sheet.height }));
  const right = crop(sheet, { x: split, y: 0, w: sheet.width - split, h: sheet.height });

  const tag = tagCircle(left);
  await saveWebp(left, join(OUT_DIR, 'curse-bell.webp'));
  const bell: Bell = {
    file: 'curse-bell.webp',
    width: left.width,
    height: left.height,
    tagX: round(tag.cx),
    tagY: round(tag.cy),
    tagR: round(tag.r),
  };
  console.log(
    `curse-bell.webp: ${left.width}×${left.height}, tag (${bell.tagX}, ${bell.tagY}) r=${bell.tagR}`,
  );

  const hole = innerCircle(right);
  let outer = 0;
  for (let y = 0; y < right.height; y++) {
    for (let x = 0; x < right.width; x++) {
      if ((right.data[4 * (y * right.width + x) + 3] ?? 0) > 8) {
        outer = Math.max(outer, Math.hypot(x + 0.5 - hole.cx, y + 0.5 - hole.cy));
      }
    }
  }
  outer = Math.ceil(outer);
  const side = 2 * (outer + MARGIN);
  const square = crop(right, {
    x: Math.round(hole.cx - side / 2),
    y: Math.round(hole.cy - side / 2),
    w: side,
    h: side,
  });
  await saveWebp(square, join(OUT_DIR, 'curse-ring.webp'));
  const ring: Ring = { file: 'curse-ring.webp', side, inner: round(hole.r), outer };
  console.log(`curse-ring.webp: ${side}px, hole r=${ring.inner}, outer r=${outer}`);
  return { bell, ring };
}

/** Cropped to what is drawn, with MARGIN around it. */
function trimmed(image: Rgba): Rgba {
  const box = opaqueBox(image);
  return crop(image, {
    x: box.x - MARGIN,
    y: box.y - MARGIN,
    w: box.w + 2 * MARGIN,
    h: box.h + 2 * MARGIN,
  });
}

/**
 * The bell's blank tag: its pale cream fill is the only light, warm colour on the bell, so the
 * biggest group of such pixels is the tag, and its box gives the circle the number goes in.
 */
function tagCircle(bell: Rgba): { cx: number; cy: number; r: number } {
  const { data, width, height } = bell;
  const cream = new Uint8ClampedArray(data.length);
  for (let i = 0; i < width * height; i++) {
    const r = data[4 * i] ?? 0;
    const g = data[4 * i + 1] ?? 0;
    const b = data[4 * i + 2] ?? 0;
    const light = (data[4 * i + 3] ?? 0) > 200 && r > 225 && g > 205 && b > 160 && r > b + 15;
    cream[4 * i + 3] = light ? 255 : 0;
  }
  const tag = components({ data: cream, width, height })[0];
  if (!tag) throw new Error('fx/curse: no blank tag under the bell');
  return { cx: tag.x + tag.w / 2, cy: tag.y + tag.h / 2, r: Math.min(tag.w, tag.h) / 2 };
}

/**
 * The ring's hole: from the middle of what is drawn, rays find the first opaque pixel on every
 * side (the flames' inner tips), and a circle is fitted through them.
 */
function innerCircle(ring: Rgba): { cx: number; cy: number; r: number } {
  const box = opaqueBox(ring);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const points: [number, number][] = [];
  const rays = 180;
  for (let k = 0; k < rays; k++) {
    const a = (2 * Math.PI * k) / rays;
    for (let d = 0; d < Math.max(box.w, box.h); d++) {
      const x = Math.round(cx + d * Math.cos(a));
      const y = Math.round(cy + d * Math.sin(a));
      if (x < 0 || y < 0 || x >= ring.width || y >= ring.height) break;
      if ((ring.data[4 * (y * ring.width + x) + 3] ?? 0) > 128) {
        points.push([x + 0.5, y + 0.5]);
        break;
      }
    }
  }
  const fit = kasa(points);
  // The flames' tips stand out from the circle between them; the hole is what is clear all round.
  let clear = Infinity;
  for (const [x, y] of points) clear = Math.min(clear, Math.hypot(x - fit.cx, y - fit.cy));
  return { cx: fit.cx, cy: fit.cy, r: clear };
}

/**
 * Batch 19's dice sheet (§4.13): the lucky die on the left, the unlucky one on the right. Only the
 * white round them goes: the gold die's glossy highlights are near white too.
 */
async function buildDice(sheet: Rgba): Promise<Die[]> {
  cutBackground(sheet);
  const split = emptyColumnNear(sheet, sheet.width / 2, 'dice');
  const dice: Die[] = [];
  for (const [i, half] of [
    { x: 0, y: 0, w: split, h: sheet.height },
    { x: split, y: 0, w: sheet.width - split, h: sheet.height },
  ].entries()) {
    const die = trimmed(crop(sheet, half));
    const file = `die-${i === 0 ? 'lucky' : 'unlucky'}.webp`;
    await saveWebp(die, join(OUT_DIR, file));
    console.log(`${file}: ${die.width}×${die.height}`);
    dice.push({ file, width: die.width, height: die.height });
  }
  return dice;
}

async function buildFlames(sheet: Rgba): Promise<Flame[]> {
  cutBackground(sheet);
  const split = emptyColumnNear(sheet, sheet.width / 2, 'fireball');
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
function emptyColumnNear(image: Rgba, x: number, sheet: string): number {
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
  throw new Error(`fx/${sheet}: no empty column between its two pieces`);
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

function dataModule(data: {
  flames: Flame[];
  cracks: Pattern[];
  seams: Pattern[];
  bell: Bell;
  ring: Ring;
  dice: Die[];
}): string {
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/fx/: do not edit by hand.
 * Heavy Drop's flames, Porcelain's cracks and seams, the cursed bell, its ring of flames and the
 * dice in public/assets/fx/ (see fxSprites.ts).
 */
import type { FxSprites } from './fxSprites';

export const FX_SPRITE_DATA: FxSprites = ${JSON.stringify(data, null, 2)};
`;
}
