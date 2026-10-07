/**
 * The HUD part of the art pipeline (TECH_SPEC §14): pieces of the owner's HUD images from
 * `art-source/hud/`, written to `public/assets/hud/` with their measurements in
 * `src/config/hudSpriteData.ts`. The score and coins cards themselves are CSS (v0.19.2), drawn
 * after the owner's reference image; the generator couldn't draw them in its proportions.
 *
 * - Coin: the gold coin (with its outline) cut out of the `coins` card.
 * - Paw badge: the pink paw disc (with its outline) cut out of `score`.
 * - Next bubble: the circle and the tag on its rim are measured (the cat and "NEXT" go there).
 * - Pause button: cut and cropped, its dark-brown outline recoloured to the reference's rose
 *   brown.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  alphaAt,
  crop,
  cutBackground,
  findSource,
  kasa,
  loadRgba,
  pixel,
  round,
  saveWebp,
} from './artImage.ts';
import type { Circle, Rect, Rgba } from './artImage.ts';

const SOURCE_DIR = 'art-source/hud';
const OUT_DIR = 'public/assets/hud';
const DATA_FILE = 'src/config/hudSpriteData.ts';
const MARGIN = 2;
/** The art's dark outlines: red channel below this. */
const INK_MAX_RED = 140;

interface Sprite {
  file: string;
  width: number;
  height: number;
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
  const coin = disc(coins, ...coinOnRow(coins));
  await saveWebp(coin, join(OUT_DIR, 'coin.webp'));
  const coinData: Sprite = { file: 'coin.webp', width: coin.width, height: coin.height };

  const badge = await pawBadge(await findSource(SOURCE_DIR, 'score'));
  await saveWebp(badge, join(OUT_DIR, 'paw-badge.webp'));
  const badgeData: Sprite = { file: 'paw-badge.webp', width: badge.width, height: badge.height };

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
  recolour(pause, PAUSE_OUTLINE, PAUSE_OUTLINE_TARGET);
  await saveWebp(pause, join(OUT_DIR, 'pause.webp'));
  const pauseData: Sprite = { file: 'pause.webp', width: pause.width, height: pause.height };

  await writeFile(DATA_FILE, dataModule(coinData, badgeData, bubbleData, pauseData));
  console.log(
    `HUD: coin ${coin.width}px, badge ${badge.width}px, ` +
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

/** The score image's pink paw badge, its disc and outline, on a transparent square. */
async function pawBadge(path: string): Promise<Rgba> {
  const source = await loadRgba(path);
  cutBackground(source);
  const pink = colourBox(source, isPink);
  // The pink's height is the disc's (on the right the pink can run on into the panel).
  const ring = fitRing(source, pink.x + pink.h / 2, pink.y + pink.h / 2, pink.h / 2);
  const badge = disc(source, ring.cx, ring.cy, ring.r);
  return badge;
}

/**
 * The coin on the coins card: along the card's middle row, the first dark run is the card's
 * outline, the second and third are the coin's outline on either side. Returns its centre and
 * outer radius.
 */
function coinOnRow(card: Rgba): [number, number, number] {
  const y = Math.round(card.height / 2);
  const runs: [number, number][] = [];
  for (let x = 0; x < card.width / 2; x++) {
    const dark = alphaAt(card, x, y) > 128 && (pixel(card, x, y)[0] ?? 255) < INK_MAX_RED;
    const last = runs[runs.length - 1];
    if (dark && last && last[1] === x - 1) last[1] = x;
    else if (dark) runs.push([x, x]);
  }
  const left = runs[1]?.[0] ?? 0;
  const right = (runs[2]?.[1] ?? 0) + 1;
  return [(left + right) / 2, y, (right - left) / 2];
}

/**
 * The outer edge of a disc's dark outline near a rough centre and radius: a circle fitted to the
 * dark pixels around it, plus half the ring's width.
 */
function fitRing(image: Rgba, cx: number, cy: number, r0: number): Circle {
  const points: [number, number][] = [];
  for (let y = Math.round(cy - 1.3 * r0); y < cy + 1.3 * r0; y++) {
    for (let x = Math.round(cx - 1.3 * r0); x < cx + 1.3 * r0; x++) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      // The left half only: on the right the disc overlaps the card's panel and its outline.
      const d = Math.hypot(x - cx, y - cy);
      if (x > cx || d < 0.9 * r0 || d > 1.15 * r0) continue;
      if (alphaAt(image, x, y) > 128 && (pixel(image, x, y)[0] ?? 255) < INK_MAX_RED) {
        points.push([x + 0.5, y + 0.5]);
      }
    }
  }
  const ring = kasa(points);
  const spread = points.map(([x, y]) => Math.hypot(x - ring.cx, y - ring.cy) - ring.r);
  const half = Math.max(
    ...spread
      .map(Math.abs)
      .sort((a, b) => a - b)
      .slice(0, Math.floor(spread.length * 0.9)),
  );
  return { cx: ring.cx, cy: ring.cy, r: ring.r + half };
}

/** A circle of `image` (centre and radius in px) on a transparent square. */
function disc(image: Rgba, cx: number, cy: number, radius: number): Rgba {
  const side = Math.ceil(2 * radius);
  const out = crop(image, {
    x: Math.round(cx - radius),
    y: Math.round(cy - radius),
    w: side,
    h: side,
  });
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (Math.hypot(x + 0.5 - side / 2, y + 0.5 - side / 2) > radius) {
        out.data[4 * (y * side + x) + 3] = 0;
      }
    }
  }
  return out;
}

/** The pause button's outline in the art, and the reference image's rose brown. */
const PAUSE_OUTLINE = [99, 49, 18];
const PAUSE_OUTLINE_TARGET = [146, 80, 86];

/** Shifts the colours near `from` towards `to` (anti-aliased edges by how close they are). */
function recolour(image: Rgba, from: readonly number[], to: readonly number[]): void {
  for (let i = 0; i < image.width * image.height; i++) {
    const c = [0, 1, 2].map((k) => image.data[4 * i + k] ?? 0);
    const distance = Math.hypot(...c.map((v, k) => v - (from[k] ?? 0)));
    const w = Math.max(0, 1 - distance / 140);
    if (w === 0) continue;
    for (let k = 0; k < 3; k++) {
      image.data[4 * i + k] = (c[k] ?? 0) + w * ((to[k] ?? 0) - (from[k] ?? 0));
    }
  }
}

function dataModule(coin: Sprite, badge: Sprite, bubble: BubbleData, pause: Sprite): string {
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
import type { HudBubbleSprite, HudSprite } from './hudSprites';

export const HUD_COIN_SPRITE: HudSprite = ${obj(coin)};
export const HUD_BADGE_SPRITE: HudSprite = ${obj(badge)};
export const HUD_NEXT_SPRITE: HudBubbleSprite = ${obj(bubble)};
export const HUD_PAUSE_SPRITE: HudSprite = ${obj(pause)};
`;
}
