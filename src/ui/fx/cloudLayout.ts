/**
 * Where and when the growth clouds go (GAME_DESIGN §7.1): a wall of overlapping clouds in rows
 * that covers a play area of any size, in three layers. Pure math with a fixed seed, so it is unit-tested and the
 * wall is the same every time.
 */
import { CLOUD_SPRITES } from '../../config/cloudSprites';
import {
  CLOUD_COLUMN_STEP,
  CLOUD_HOLD_MS,
  CLOUD_JITTER,
  CLOUD_LAYER_SCALES,
  CLOUD_LAYOUT_SEED,
  CLOUD_PART_MS,
  CLOUD_PART_STAGGER_MS,
  CLOUD_RISE_JITTER_MS,
  CLOUD_RISE_MS,
  CLOUD_ROW_STEP,
  CLOUD_WIDTH_RATIO,
} from '../../config/view';
import { Rng } from '../../core/rng';

/** When every cloud is up (the background changes halfway through the hold), ms. */
export const CLOUDS_COVER_MS = CLOUD_RISE_MS + CLOUD_RISE_JITTER_MS + CLOUD_HOLD_MS / 2;
/** When the clouds start parting, ms. */
export const CLOUDS_PART_MS = CLOUD_RISE_MS + CLOUD_RISE_JITTER_MS + CLOUD_HOLD_MS;
/** The whole transition, ms. */
export const CLOUDS_TOTAL_MS = CLOUDS_PART_MS + CLOUD_PART_STAGGER_MS + CLOUD_PART_MS;

/** The big clouds come first in the sheet; the rest are this much smaller. */
const BIG_CLOUDS = 3;
const SMALL_CLOUD_SCALE = 0.88;

export interface CloudPlace {
  /** Index into CLOUD_SPRITES. */
  readonly sprite: number;
  /** Its centre at rest (covering the screen), in CSS pixels of the play area. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 0 is the back layer. */
  readonly layer: number;
  /** Which way it parts: −1 left, 1 right. */
  readonly side: -1 | 1;
  /** How late it starts rising and parting, ms. */
  readonly riseDelayMs: number;
  readonly partDelayMs: number;
}

/** The clouds for a `width` × `height` play area, back layer first (the order to draw them). */
export function cloudLayout(width: number, height: number): CloudPlace[] {
  if (width <= 0 || height <= 0 || CLOUD_SPRITES.length === 0) return [];
  const rng = new Rng(CLOUD_LAYOUT_SEED);
  const baseWidth = width * CLOUD_WIDTH_RATIO;
  const sprite0 = CLOUD_SPRITES[0];
  const baseHeight = sprite0 ? (baseWidth * sprite0.height) / sprite0.width : baseWidth * 0.66;
  const colStep = baseWidth * CLOUD_COLUMN_STEP;
  const rowStep = baseHeight * CLOUD_ROW_STEP;
  const places: CloudPlace[] = [];
  const middle = width / 2;
  for (let row = 0, y = 0; y < height + rowStep; row++, y += rowStep) {
    for (let x = row % 2 === 0 ? 0 : -colStep / 2; x < width + colStep / 2; x += colStep) {
      const sprite = Math.floor(rng.next() * CLOUD_SPRITES.length);
      const art = CLOUD_SPRITES[sprite] ?? sprite0;
      if (!art) continue;
      const layer = Math.floor(rng.next() * CLOUD_LAYER_SCALES.length);
      const scale =
        (CLOUD_LAYER_SCALES[layer] ?? 1) * (sprite < BIG_CLOUDS ? 1 : SMALL_CLOUD_SCALE);
      const w = baseWidth * scale;
      const cx = x + (rng.next() * 2 - 1) * CLOUD_JITTER * colStep;
      const cy = y + (rng.next() * 2 - 1) * CLOUD_JITTER * rowStep;
      const side = cx < middle || (cx === middle && row % 2 === 0) ? -1 : 1;
      places.push({
        sprite,
        x: cx,
        y: cy,
        width: w,
        height: (w * art.height) / art.width,
        layer,
        side,
        riseDelayMs: rng.next() * CLOUD_RISE_JITTER_MS,
        // The middle opens first, the sides last.
        partDelayMs: Math.min(1, Math.abs(cx - middle) / middle) * CLOUD_PART_STAGGER_MS,
      });
    }
  }
  return places.sort((a, b) => a.layer - b.layer);
}
