/**
 * The main-menu part of the art pipeline (TECH_SPEC §14, docs/ART_ASSETS.md phase 4): pieces of the
 * owner's menu images from `art-source/menu/` (all cut from the chosen mockup, `mockup.jpg`),
 * written to `public/assets/menu/` with their measurements in `src/config/menuSpriteData.ts`.
 *
 * - Background: converted as is; its sky colour is sampled for the screen above it.
 * - Logo: cut out, its cream rim lifted to the mockup's lighter cream.
 * - Hero: the golden cat on its cushion, cut out; the cushion turned from peach to the mockup's
 *   pink.
 * - Buttons: PLAY, UPGRADES and the coins pill become short three-slice strips (left cap, a plain
 *   middle, right cap) that CSS stretches to any width; the coins pill is cut off by the sheet's
 *   edge, so its right cap is the left one mirrored. The gear button is cropped.
 * - Record card: a nine-slice frame with the well painted out, and the well as its own strip.
 * - Icons: the torii, coin, arrow and two sparkles, each cropped (the sheet's petals and pink gear
 *   are unused).
 * Everything outside a piece's dark outline (the sheet's soft drop shadows, stray light pixels) is
 * cleared; the game draws its own shadows.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  alphaAt,
  clamp01,
  components,
  crop,
  cutBackground,
  findSource,
  isolate,
  loadRgba,
  median,
  pixel,
  saveWebp,
} from './artImage.ts';
import type { Component, Rect, Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/menu';
const OUT_DIR = 'public/assets/menu';
const DATA_FILE = 'src/config/menuSpriteData.ts';
const MARGIN = 2;
/** The art's dark outlines: red channel below this. */
const INK_MAX_RED = 120;
/** Light pixels this far outside the outline keep some alpha (its anti-aliased edge). */
const EDGE_PX = 3;
/** Pieces smaller than this (px) are specks, not pieces. */
const MIN_AREA = 200;

interface Sprite {
  file: string;
  width: number;
  height: number;
}

/** A three-slice strip: `cap` px on each side stay, the middle stretches. */
interface StripSprite extends Sprite {
  cap: number;
}

/** A nine-slice frame: `slice` px on every side stay, the middle stretches. */
interface FrameSprite extends Sprite {
  slice: number;
}

interface BackgroundSprite extends Sprite {
  sky: string;
}

interface MenuData {
  background: BackgroundSprite;
  logo: Sprite;
  hero: Sprite;
  gear: Sprite;
  play: StripSprite;
  upgrades: StripSprite;
  coinsPill: StripSprite;
  card: FrameSprite;
  well: StripSprite;
  coin: Sprite;
  torii: Sprite;
  arrow: Sprite;
  sparkle: Sprite;
  sparkleSmall: Sprite;
}

export async function buildMenu(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const source = (base: string): Promise<string> => findSource(SOURCE_DIR, base);

  const background = await buildBackground(await source('background'));

  const logoImage = await cutOut(await source('logo'));
  liftCream(logoImage);
  const logo = await save(fitCrop(logoImage), 'logo.webp');

  const heroImage = await loadRgba(await source('hero'));
  pinkCushion(heroImage);
  cutBackground(heroImage);
  const hero = await save(fitCrop(heroImage), 'hero.webp');

  // The buttons sheet: the gear top left, the coins pill top right (cut by the edge), PLAY and
  // UPGRADES side by side in the middle row.
  const sheet = await cutOut(await source('buttons'));
  const pieces = components(sheet).filter((c) => c.area > MIN_AREA);
  const at = (test: (c: Component) => boolean): Rgba => piece(sheet, pieces, test);
  const half = sheet.width / 2;
  const gear = await save(
    trimOutline(at((c) => c.x < half && c.y + c.h < sheet.height * 0.3)),
    'gear.webp',
  );
  // The coins pill runs off the sheet's right edge, so its light inner rim reaches the edge and
  // the white cut would eat it: mirror its left end onto the right in the raw image first.
  const pillBox = pieces.find((c) => c.x > half && c.y < sheet.height * 0.15);
  if (!pillBox) throw new Error('Missing the coins pill in the buttons sheet');
  const raw = await loadRgba(await source('buttons'));
  const pillRaw = crop(raw, {
    x: pillBox.x - 10,
    y: pillBox.y - 10,
    w: pillBox.w,
    h: pillBox.h + 20,
  });
  const pillImage = mirrorLeft(pillRaw);
  cutBackground(pillImage);
  const coinsPill = await saveStrip(trimOutline(fitCrop(pillImage)), 'coins-pill.webp');
  const middleRow = (c: Component): boolean =>
    c.y > sheet.height * 0.25 && c.y + c.h < sheet.height * 0.6;
  const play = await saveStrip(trimOutline(at((c) => middleRow(c) && c.x < half)), 'play.webp');
  const upgrades = await saveStrip(
    trimOutline(at((c) => middleRow(c) && c.x > half)),
    'upgrades.webp',
  );

  const { card, well } = await buildCard(await source('record-card'));

  // The icons sheet, a 3×3 grid: petals, petals, coin; torii, a gear, sparkles; arrow, petals, petals.
  const icons = await cutOut(await source('menu-icons'));
  const iconPieces = components(icons).filter((c) => c.area > MIN_AREA);
  const cell = icons.width / 3;
  const inCell = (col: number, row: number) => (c: Component) =>
    Math.floor((c.x + c.w / 2) / cell) === col && Math.floor((c.y + c.h / 2) / cell) === row;
  const icon = (col: number, row: number, file: string, nth = 0): Promise<Sprite> => {
    const found = iconPieces.filter(inCell(col, row))[nth];
    if (!found) throw new Error(`No icon in cell ${col},${row}`);
    return save(isolate(icons, found, MARGIN), file);
  };
  const coin = await icon(2, 0, 'coin.webp');
  const torii = await icon(0, 1, 'torii.webp');
  const sparkle = await icon(2, 1, 'sparkle.webp', 0);
  const sparkleSmall = await icon(2, 1, 'sparkle-small.webp', 1);
  // The arrow's largest piece (a stray underline under it is dropped).
  const arrow = await icon(0, 2, 'arrow.webp');

  const data: MenuData = {
    background,
    logo,
    hero,
    gear,
    play,
    upgrades,
    coinsPill,
    card,
    well,
    coin,
    torii,
    arrow,
    sparkle,
    sparkleSmall,
  };
  await writeFile(DATA_FILE, dataModule(data));
  console.log(
    `Menu: logo ${logo.width}×${logo.height}, hero ${hero.width}×${hero.height}, ` +
      `PLAY ${play.width}×${play.height}, card ${card.width}×${card.height}; wrote ${DATA_FILE}`,
  );
}

async function buildBackground(path: string): Promise<BackgroundSprite> {
  const image = await loadRgba(path);
  await saveWebp(image, join(OUT_DIR, 'background.webp'), 85);
  const samples: number[][] = [];
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < image.width; x += 4) samples.push(pixel(image, x, y));
  }
  return {
    file: 'background.webp',
    width: image.width,
    height: image.height,
    sky: median(samples),
  };
}

async function cutOut(path: string): Promise<Rgba> {
  const image = await loadRgba(path);
  cutBackground(image);
  return image;
}

async function save(image: Rgba, file: string): Promise<Sprite> {
  await saveWebp(image, join(OUT_DIR, file));
  return { file, width: image.width, height: image.height };
}

/** The largest piece matching `test`, cropped with a margin. */
function piece(image: Rgba, pieces: readonly Component[], test: (c: Component) => boolean): Rgba {
  const found = pieces.find(test);
  if (!found) throw new Error('Missing piece in the buttons sheet');
  return isolate(image, found, MARGIN);
}

function pad(image: Rgba): Rgba {
  return crop(image, {
    x: -MARGIN,
    y: -MARGIN,
    w: image.width + 2 * MARGIN,
    h: image.height + 2 * MARGIN,
  });
}

/** Cropped to the opaque pixels, with a margin (small specks are ignored). */
function fitCrop(image: Rgba): Rgba {
  const pieces = components(image).filter((c) => c.area > MIN_AREA);
  const box = pieces.reduce<Rect>(
    (b, c) => {
      const x = Math.min(b.x, c.x);
      const y = Math.min(b.y, c.y);
      return {
        x,
        y,
        w: Math.max(b.x + b.w, c.x + c.w) - x,
        h: Math.max(b.y + b.h, c.y + c.h) - y,
      };
    },
    pieces[0] ?? { x: 0, y: 0, w: image.width, h: image.height },
  );
  return pad(crop(image, box));
}

const isInk = (image: Rgba, x: number, y: number): boolean =>
  alphaAt(image, x, y) > 128 && (pixel(image, x, y)[0] ?? 255) < INK_MAX_RED;

/**
 * Clears everything outside the dark outline of a convex piece (a drop shadow, stray light
 * pixels), scanning each column from the top and bottom and each row from the sides. The few
 * light pixels just outside the outline keep an alpha from their darkness (its soft edge).
 */
function trimOutline(image: Rgba): Rgba {
  const { width, height, data } = image;
  const ink = inkColour(image);
  const keep = new Uint8Array(width * height);
  const clearOutside = (count: number, length: number, at: (i: number, t: number) => number) => {
    for (let i = 0; i < count; i++) {
      let first = -1;
      let last = -1;
      for (let t = 0; t < length; t++) {
        const p = at(i, t);
        if (isInk(image, p % width, Math.floor(p / width))) {
          if (first < 0) first = t;
          last = t;
        }
      }
      for (let t = 0; t < length; t++) {
        const p = at(i, t);
        const outside = first < 0 ? EDGE_PX + 1 : t < first ? first - t : t > last ? t - last : 0;
        if (outside === 0) continue;
        if (outside > EDGE_PX) {
          keep[p] = 2;
        } else if (keep[p] !== 2) {
          keep[p] = 1;
        }
      }
    }
  };
  clearOutside(width, height, (x, y) => y * width + x);
  clearOutside(height, width, (y, x) => y * width + x);
  for (let p = 0; p < width * height; p++) {
    if (keep[p] === 2) {
      data[4 * p + 3] = 0;
    } else if (keep[p] === 1) {
      const lum = data[4 * p] ?? 255;
      const a = clamp01((235 - lum) / (235 - (ink[0] ?? 0)));
      data[4 * p + 3] = Math.min(data[4 * p + 3] ?? 0, Math.round(255 * a));
      for (let c = 0; c < 3; c++) data[4 * p + c] = ink[c] ?? 0;
    }
  }
  return image;
}

/** The outline's colour: the median of the ink pixels. */
function inkColour(image: Rgba): number[] {
  const samples: number[][] = [];
  for (let y = 0; y < image.height; y += 2) {
    for (let x = 0; x < image.width; x += 2) {
      if (isInk(image, x, y)) samples.push(pixel(image, x, y));
    }
  }
  const hex = median(samples);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/**
 * A three-slice strip from a horizontal pill: its left cap, a few plain columns from the middle
 * and its right cap. `cap` is a little more than half the height, so the round ends stay whole.
 */
async function saveStrip(image: Rgba, file: string): Promise<StripSprite> {
  const cap = Math.ceil(image.height * 0.6);
  const middle = 8;
  const width = 2 * cap + middle;
  const out = crop(image, { x: 0, y: 0, w: width, h: image.height });
  const mid = Math.floor(image.width / 2);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x < cap ? x : x < cap + middle ? mid + x - cap : image.width - width + x;
      for (let c = 0; c < 4; c++) {
        out.data[4 * (y * width + x) + c] = image.data[4 * (y * image.width + sx) + c] ?? 0;
      }
    }
  }
  const sprite = await save(out, file);
  return { ...sprite, cap };
}

/** The left half of `image` and its mirror image: a pill whose right end was cut off. */
function mirrorLeft(image: Rgba): Rgba {
  const { width, height } = image;
  // The cut-off end is the right edge; the left end and as much middle as the height are enough.
  const half = Math.min(Math.floor(width / 2), height);
  const out = crop(image, { x: 0, y: 0, w: 2 * half, h: height });
  for (let y = 0; y < height; y++) {
    for (let x = half; x < 2 * half; x++) {
      const sx = 2 * half - 1 - x;
      for (let c = 0; c < 4; c++) {
        out.data[4 * (y * 2 * half + x) + c] = image.data[4 * (y * width + sx) + c] ?? 0;
      }
    }
  }
  return out;
}

/**
 * The record card: the frame with its well painted out in the card's cream (a nine-slice), and
 * the well (a rounded tan strip with no outline) on its own.
 */
async function buildCard(path: string): Promise<{ card: FrameSprite; well: StripSprite }> {
  const image = trimOutline(fitCrop(await cutOut(path)));
  const { width, height } = image;
  // The well: the tan pixels in the card's inner area (the bottom edge below it is tan too, so
  // only the rows above the card's lowest fifth count).
  const isTan = ([r = 0, , b = 0]: number[]): boolean => r < 230 && r > 110 && r - b > 60;
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;
  for (let y = Math.floor(height * 0.2); y < height * 0.85; y++) {
    for (let x = Math.floor(width * 0.03); x < width * 0.97; x++) {
      if (isTan(pixel(image, x, y))) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const wellBox = { x: left - 1, y: top - 1, w: right - left + 3, h: bottom - top + 3 };
  const wellImage = crop(image, wellBox);
  // Outside the well's rounded shape the crop holds card cream: clear it.
  const r = wellImage.height / 2;
  for (let y = 0; y < wellImage.height; y++) {
    for (let x = 0; x < wellImage.width; x++) {
      const dx =
        x < r ? r - x - 0.5 : x > wellImage.width - r ? x + 0.5 - (wellImage.width - r) : 0;
      const d = Math.hypot(dx, y + 0.5 - r);
      const a = clamp01(r - d + 0.5);
      const i = 4 * (y * wellImage.width + x) + 3;
      wellImage.data[i] = Math.round((wellImage.data[i] ?? 0) * a);
    }
  }
  const well = await saveStrip(wellImage, 'well.webp');

  // Paint the well out: each row takes the cream just left of the well.
  const cream = (y: number): number[] => pixel(image, wellBox.x - 6, y);
  for (let y = wellBox.y - 3; y < wellBox.y + wellBox.h + 3; y++) {
    const c = cream(y);
    for (let x = wellBox.x - 3; x < wellBox.x + wellBox.w + 3; x++) {
      for (let k = 0; k < 3; k++) image.data[4 * (y * width + x) + k] = c[k] ?? 0;
    }
  }
  // The frame's slice: the corner's rounding plus the outline (a sixth of the height).
  const slice = Math.ceil(height / 6);
  const card = await save(image, 'card.webp');
  return { card: { ...card, slice }, well };
}

/** Lifts the logo's cream rim to the mockup's lighter, whiter cream. */
function liftCream(image: Rgba): void {
  const target = [255, 251, 239];
  for (let i = 0; i < image.width * image.height; i++) {
    if ((image.data[4 * i + 3] ?? 0) === 0) continue;
    const c = [0, 1, 2].map((k) => image.data[4 * i + k] ?? 0);
    const low = Math.min(...c);
    if ((c[0] ?? 0) < 232 || low < 190) continue;
    const w = clamp01((low - 190) / 25);
    for (let k = 0; k < 3; k++) {
      image.data[4 * i + k] = (c[k] ?? 0) + w * ((target[k] ?? 0) - (c[k] ?? 0));
    }
  }
}

/**
 * Turns the hero's peach cushion to the mockup's pink: a hue shift of the warm reds in the image's
 * lower part (the cushion; the red collar sits higher up), leaving the dark outline, the gold
 * tassels and the cat's yellow alone.
 */
function pinkCushion(image: Rgba): void {
  const SHIFT = -22;
  for (let y = Math.floor(image.height * 0.55); y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = 4 * (y * image.width + x);
      const [h, s, l] = toHsl(image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0);
      const hue = h > 180 ? h - 360 : h;
      if (hue < -15 || hue > 25 || s < 0.25 || l < 0.2 || l > 0.97) continue;
      const w = clamp01((25 - hue) / 6) * clamp01((s - 0.25) / 0.1) * clamp01((l - 0.2) / 0.1);
      const rgb = fromHsl(
        (h + SHIFT * w + 360) % 360,
        Math.min(1, s * (1 + 0.1 * w)),
        l + 0.025 * w,
      );
      for (let k = 0; k < 3; k++) image.data[i + k] = rgb[k] ?? 0;
    }
  }
}

function toHsl(r8: number, g8: number, b8: number): [number, number, number] {
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): number[] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r, g, b].map((v) => (v + m) * 255);
}

function dataModule(data: MenuData): string {
  const obj = (o: object): string =>
    '{ ' +
    Object.entries(o)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
      .join(', ') +
    ' }';
  const lines = Object.entries(data).map(([key, value]) =>
    Array.isArray(value)
      ? `  ${key}: [\n${value.map((v: object) => `    ${obj(v)},`).join('\n')}\n  ],`
      : `  ${key}: ${obj(value as object)},`,
  );
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/menu/: do not edit by hand.
 * The main menu's sprites in public/assets/menu/ (see menuSprites.ts for each field).
 */
import type { MenuSprites } from './menuSprites';

export const MENU_SPRITE_DATA: MenuSprites = {
${lines.join('\n')}
};
`;
}
