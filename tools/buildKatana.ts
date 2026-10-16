/**
 * The Katana's art (docs/ART_ASSETS.md §4.21, GAME_DESIGN §15.16): the katana from
 * `art-source/specials/katana` and its two sheets of light from `art-source/fx/slashes` and `cut`,
 * written to `public/assets/specials/katana.webp` and `public/assets/fx/katana-*` with their
 * measurements in `src/config/katanaSpriteData.ts`. Missing images leave the data `null`, and the
 * game draws its stand-ins.
 *
 * - The katana stands on white, point down: the white is cut and the sprite cropped to the sword.
 *   `top` is the middle of the hilt's end and `tip` the point, so the game can lay the sword along
 *   its cut whatever small tilt the drawing has.
 * - `slashes`: four streaks in rows, measured like Lightning's chain bolts (tools/buildLightning.ts),
 *   so the game can stretch one along each blade's path.
 * - `cut`: a 3×2 grid: the cut flash, the glint and the burst of sparks on top, the swoosh, the
 *   strike burst (its sparks fly up from the bottom middle) and the soft flash below.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  crop,
  cutBackground,
  findSource,
  fitWithin,
  loadRgba,
  opaqueBox,
  round,
  saveWebp,
} from './artImage.ts';
import type { Rgba } from './artImage.ts';
import { bands, grid, lightToAlpha, saveBolt, saveRound } from './buildLightning.ts';
import type { BoltData, RoundData } from './buildLightning.ts';

const SPECIAL_DIR = 'art-source/specials';
const FX_DIR = 'art-source/fx';
const SPECIAL_OUT = 'public/assets/specials';
const FX_OUT = 'public/assets/fx';
const DATA_FILE = 'src/config/katanaSpriteData.ts';
/**
 * The katana's longest side, px: the game draws the falling sword about 330 world units long,
 * some 200 CSS px on a phone, so this keeps about 3.5 device pixels per CSS pixel.
 */
const KATANA_MAX_SIDE = 760;
/** Transparent margin around the katana, px. */
const MARGIN = 2;
/** A pixel this opaque is part of the sword (the cut edge is soft). */
const SOLID = 128;
/** The share of the sword's height at each end whose pixels give `top` and `tip`. */
const END_SHARE = 0.015;

interface KatanaSpriteData {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly topX: number;
  readonly topY: number;
  readonly tipX: number;
  readonly tipY: number;
}

interface KatanaData {
  readonly katana: KatanaSpriteData;
  readonly slashes: BoltData[];
  readonly flash: RoundData;
  readonly glint: RoundData;
  readonly sparks: RoundData;
  readonly swoosh: RoundData;
  readonly strike: RoundData;
  readonly glow: RoundData;
}

export async function buildKatana(): Promise<void> {
  const find = (dir: string, base: string): Promise<string | null> =>
    findSource(dir, base).catch(() => null);
  const [katana, slashes, cut] = await Promise.all([
    find(SPECIAL_DIR, 'katana'),
    find(FX_DIR, 'slashes'),
    find(FX_DIR, 'cut'),
  ]);
  if (!katana || !slashes || !cut) {
    await writeFile(DATA_FILE, dataModule(null));
    console.log('Katana: images missing, the game draws its stand-ins');
    return;
  }
  await mkdir(SPECIAL_OUT, { recursive: true });
  await mkdir(FX_OUT, { recursive: true });
  const streaks = bands(lightToAlpha(await loadRgba(slashes)), 'rows');
  const pieces = grid(lightToAlpha(await loadRgba(cut)), 3, 2);
  const [flash, glint, sparks, swoosh, strike, glow] = pieces as [
    Rgba,
    Rgba,
    Rgba,
    Rgba,
    Rgba,
    Rgba,
  ];
  const data: KatanaData = {
    katana: await saveKatana(await loadRgba(katana)),
    slashes: await Promise.all(
      streaks.map((piece, i) => saveBolt(piece, `katana-slash-${i}.webp`, 'across')),
    ),
    flash: await saveRound(flash, 'katana-flash.webp', 'reach'),
    glint: await saveRound(glint, 'katana-glint.webp', 'reach'),
    sparks: await saveRound(sparks, 'katana-sparks.webp', 'reach'),
    swoosh: await saveRound(swoosh, 'katana-swoosh.webp', 'reach'),
    strike: await saveRound(strike, 'katana-strike.webp', 'reach'),
    glow: await saveRound(glow, 'katana-glow.webp', 'reach'),
  };
  await writeFile(DATA_FILE, dataModule(data));
  console.log(
    `Katana: the sword ${data.katana.width}×${data.katana.height}, ` +
      `${data.slashes.length} slashes and 6 cut pieces; wrote ${DATA_FILE}`,
  );
}

/** The sword cut out of its white, cropped and scaled down, with its two ends. */
async function saveKatana(image: Rgba): Promise<KatanaSpriteData> {
  cutBackground(image);
  const box = opaqueBox(image);
  const full = crop(image, {
    x: box.x - MARGIN,
    y: box.y - MARGIN,
    w: box.w + 2 * MARGIN,
    h: box.h + 2 * MARGIN,
  });
  const sprite = await fitWithin(full, KATANA_MAX_SIDE);
  const k = sprite.width / full.width;
  const [topX, topY] = endOf(full, 'top');
  const [tipX, tipY] = endOf(full, 'bottom');
  await saveWebp(sprite, join(SPECIAL_OUT, 'katana.webp'));
  return {
    file: 'katana.webp',
    width: sprite.width,
    height: sprite.height,
    topX: round(topX * k),
    topY: round(topY * k),
    tipX: round(tipX * k),
    tipY: round(tipY * k),
  };
}

/** The middle of the sword's solid pixels in its top or bottom END_SHARE rows, at its edge. */
function endOf(image: Rgba, end: 'top' | 'bottom'): [number, number] {
  const { data, width, height } = image;
  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[4 * (y * width + x) + 3] ?? 0) >= SOLID) {
        rows.push(y);
        break;
      }
    }
  }
  const first = Math.min(...rows);
  const last = Math.max(...rows);
  const reach = Math.max(2, (last - first) * END_SHARE);
  let sum = 0;
  let n = 0;
  for (let y = 0; y < height; y++) {
    const inside = end === 'top' ? y <= first + reach : y >= last - reach;
    if (!inside) continue;
    for (let x = 0; x < width; x++) {
      if ((data[4 * (y * width + x) + 3] ?? 0) < SOLID) continue;
      sum += x + 0.5;
      n++;
    }
  }
  return [sum / Math.max(1, n), end === 'top' ? first : last + 1];
}

function dataModule(data: KatanaData | null): string {
  return `/**
 * Generated by tools/build-art.ts (\`npm run art\`) from art-source/specials/katana and
 * art-source/fx/ (slashes, cut): do not edit by hand. The Katana's sprites (see katanaSprites.ts
 * for each field), or null until the owner's images are in.
 */
import type { KatanaSprites } from './katanaSprites';

export const KATANA_SPRITE_DATA: KatanaSprites | null = ${JSON.stringify(data, null, 2)};
`;
}
