/**
 * The HUD part of the art pipeline (TECH_SPEC §14): the coins card, the score card, the next-cat
 * bubble and the pause button from `art-source/hud/`, written to `public/assets/hud/` with their
 * measurements in `src/config/hudSpriteData.ts`.
 *
 * - Coins card: the white is cut; the gold coin on its left end is found, and the text goes to
 *   its right.
 * - Score card: the coins card with the pink paw badge of `score` pasted over its coin, so both
 *   cards have the same panel (the generator drew the score panel in another style).
 * - Next bubble: the circle and the tag on its rim are measured (the cat and "NEXT" go there).
 * - Pause button: cut and cropped.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  alphaAt,
  crop,
  cutBackground,
  findSource,
  loadRgba,
  pixel,
  round,
  saveWebp,
} from './artImage.ts';
import type { Rect, Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/hud';
const OUT_DIR = 'public/assets/hud';
const DATA_FILE = 'src/config/hudSpriteData.ts';
const MARGIN = 2;

interface Sprite {
  file: string;
  width: number;
  height: number;
}

interface CardData extends Sprite {
  /** The text area, as fractions of the width: from the coin's (or badge's) right to the end. */
  textLeft: number;
  textRight: number;
  /** The coin's (or badge's) centre, as fractions of the width and height. */
  iconX: number;
  iconY: number;
}

interface BubbleData extends Sprite {
  /** The circle's centre and radius, and the tag's centre, as fractions of the sprite's size. */
  cx: number;
  cy: number;
  r: number;
  tagY: number;
}

export async function buildHud(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const coins = await cutAndCrop(await findSource(SOURCE_DIR, 'coins'));
  // The coin sits in the middle of the card's height; its gold's width is its size (the card's
  // bottom edge is goldish too, so the gold's height isn't).
  const gold = colourBox(coins, isGold);
  const coin = { x: gold.x, y: Math.round(coins.height / 2 - gold.w / 2), w: gold.w, h: gold.w };
  const coinsData = await saveCard(coins, coin, 'coins.webp');

  const score = await scoreCard(coins, coin, await findSource(SOURCE_DIR, 'score'));
  const scoreData = await saveCard(score, coin, 'score.webp');

  const bubble = await cutAndCrop(await findSource(SOURCE_DIR, 'next'));
  await saveWebp(bubble, join(OUT_DIR, 'next.webp'));
  const box = opaqueRows(bubble);
  const r = bubble.width / 2;
  const cy = box.bottom - r;
  // The tag: the first run of rows from the top that are largely cream (not the bubble's blue).
  const creamRow = (y: number): boolean => {
    let n = 0;
    for (let x = 0; x < bubble.width; x++) {
      const [red = 0, , blue = 0] = pixel(bubble, x, y);
      if (alphaAt(bubble, x, y) > 128 && red > 235 && red - blue > 12) n++;
    }
    return n > bubble.width * 0.1;
  };
  let tagTop = 0;
  while (tagTop < bubble.height / 3 && !creamRow(tagTop)) tagTop++;
  let tagBottom = tagTop;
  while (tagBottom < bubble.height / 3 && creamRow(tagBottom)) tagBottom++;
  const bubbleData: BubbleData = {
    file: 'next.webp',
    width: bubble.width,
    height: bubble.height,
    cx: 0.5,
    cy: round(cy / bubble.height),
    r: round(r / bubble.width),
    tagY: round((tagTop + tagBottom) / 2 / bubble.height),
  };

  const pause = await cutAndCrop(await findSource(SOURCE_DIR, 'pause'));
  await saveWebp(pause, join(OUT_DIR, 'pause.webp'));
  const pauseData: Sprite = { file: 'pause.webp', width: pause.width, height: pause.height };

  await writeFile(DATA_FILE, dataModule(coinsData, scoreData, bubbleData, pauseData));
  console.log(
    `HUD: cards ${coins.width}×${coins.height} (text from ${coinsData.textLeft}), ` +
      `bubble ${bubble.width}×${bubble.height}, pause ${pause.width}×${pause.height}; wrote ${DATA_FILE}`,
  );
}

async function cutAndCrop(path: string): Promise<Rgba> {
  const image = await loadRgba(path);
  cutBackground(image);
  const b = opaqueRows(image);
  return crop(image, {
    x: b.left - MARGIN,
    y: b.top - MARGIN,
    w: b.right - b.left + 2 * MARGIN,
    h: b.bottom - b.top + 2 * MARGIN,
  });
}

/** The opaque content's edges (exclusive right and bottom). */
function opaqueRows(image: Rgba): { left: number; top: number; right: number; bottom: number } {
  let left = image.width;
  let top = image.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (alphaAt(image, x, y) > 128) {
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }
  return { left, top, right, bottom };
}

const isGold = ([r = 0, g = 0, b = 0]: number[]): boolean => r > 200 && g > 140 && b < 120;
const isPink = ([r = 0, g = 0, b = 0]: number[]): boolean =>
  r > 200 && r - g > 50 && b > 110 && b < 200;

/** The box around the pixels of a colour in the left third of the image (the coin, the badge). */
function colourBox(image: Rgba, test: (c: number[]) => boolean): Rect {
  let minX = image.width;
  let minY = image.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width / 3; x++) {
      if (alphaAt(image, x, y) > 128 && test(pixel(image, x, y))) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** The coins card with the score image's paw badge (and its outline) over the coin. */
async function scoreCard(coins: Rgba, coin: Rect, path: string): Promise<Rgba> {
  const source = await loadRgba(path);
  cutBackground(source);
  const pink = colourBox(source, isPink);
  // The badge is the pink disc plus its outline. Its height is its diameter: on the right the
  // pink can run on where the disc overlaps the panel.
  const outline = Math.round(pink.h * 0.04);
  const radius = pink.h / 2 + outline;
  const cx = pink.x + pink.h / 2;
  const cy = pink.y + pink.h / 2;
  const side = Math.ceil(2 * radius);
  const badge = crop(source, {
    x: Math.round(cx - radius),
    y: Math.round(cy - radius),
    w: side,
    h: side,
  });
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (Math.hypot(x + 0.5 - side / 2, y + 0.5 - side / 2) > radius)
        badge.data[4 * (y * side + x) + 3] = 0;
    }
  }
  // As big as the coin with its outline, centred on it.
  const coinOutline = Math.round(coin.w * 0.05);
  const target = Math.round(coin.w + 2 * coinOutline);
  const scaled = await sharp(
    Buffer.from(badge.data.buffer, badge.data.byteOffset, badge.data.length),
    {
      raw: { width: side, height: side, channels: 4 },
    },
  )
    .resize(target, target)
    .png()
    .toBuffer();
  const { data } = await sharp(
    Buffer.from(coins.data.buffer, coins.data.byteOffset, coins.data.length),
    {
      raw: { width: coins.width, height: coins.height, channels: 4 },
    },
  )
    .composite([
      {
        input: scaled,
        left: Math.round(coin.x + coin.w / 2 - target / 2),
        top: Math.round(coin.y + coin.h / 2 - target / 2),
      },
    ])
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    width: coins.width,
    height: coins.height,
  };
}

async function saveCard(image: Rgba, icon: Rect, file: string): Promise<CardData> {
  await saveWebp(image, join(OUT_DIR, file));
  return {
    file,
    width: image.width,
    height: image.height,
    textLeft: round((icon.x + icon.w * 1.12) / image.width + 0.02),
    textRight: 0.93,
    iconX: round((icon.x + icon.w / 2) / image.width),
    iconY: round((icon.y + icon.h / 2) / image.height),
  };
}

function dataModule(coins: CardData, score: CardData, bubble: BubbleData, pause: Sprite): string {
  const obj = (o: object): string =>
    '{ ' +
    Object.entries(o)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
      .join(', ') +
    ' }';
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/hud/: do not edit by hand.
 * The HUD sprites in public/assets/hud/ (see hudSprites.ts for each field).
 */
import type { HudBubbleSprite, HudCardSprite, HudSprite } from './hudSprites';

export const HUD_COINS_SPRITE: HudCardSprite = ${obj(coins)};
export const HUD_SCORE_SPRITE: HudCardSprite = ${obj(score)};
export const HUD_NEXT_SPRITE: HudBubbleSprite = ${obj(bubble)};
export const HUD_PAUSE_SPRITE: HudSprite = ${obj(pause)};
`;
}
