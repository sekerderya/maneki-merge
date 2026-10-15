/**
 * Where a time of day's background lies over its day picture (tools/buildScene.ts, GAME_DESIGN
 * §7.3). The owner's sunset and night are edits of the day picture, but the image tool zooms an
 * edit in by a percent or two (and may hand it back at another size), so its rug and the jar's
 * spot sit a little off. Rather than resample the owner's pixels, the fit is measured and the game
 * places the image by it.
 *
 * The outlines are the same in both pictures, whatever the light: patches beside the calm middle
 * are matched by their edges, and a straight line through the matches across and down gives the
 * fit.
 */
import sharp from 'sharp';
import type { Rgba } from './artImage.ts';

/** The day picture's pixel (u, v) lies at (u · sx + x, v · sy + y) in this image. */
export interface BackgroundFit {
  sx: number;
  sy: number;
  x: number;
  y: number;
}

/** The patches' centres, as shares of the day picture: beside the jar, from the sky to the rug. */
const COLUMNS = [0.2, 0.8];
const ROWS = [0.3, 0.47, 0.65, 0.8, 0.91];
/** A patch's half size and how far it is searched, px of the day picture. */
const HALF_WIDTH = 110;
const HALF_HEIGHT = 70;
const SEARCH = 30;
/** Every this many pixels of a patch are compared (enough for outlines a few px thick). */
const STEP = 3;

/**
 * `path`'s fit onto `day`, and how far (px of `path`) the worst patch lies off it. The match is
 * made at the day picture's size; the fit is given in `path`'s own pixels.
 */
export async function measureFit(
  day: Rgba,
  path: string,
): Promise<{ fit: BackgroundFit; worst: number }> {
  const meta = await sharp(path).metadata();
  const width = meta.width ?? day.width;
  const height = meta.height ?? day.height;
  const { data } = await sharp(path)
    .resize(day.width, day.height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const a = edges(day.data, day.width, day.height);
  const b = edges(data, day.width, day.height);
  const across: [number, number][] = [];
  const down: [number, number][] = [];
  for (const row of ROWS) {
    for (const column of COLUMNS) {
      const cx = Math.round(column * day.width);
      const cy = Math.round(row * day.height);
      const [dx, dy] = bestShift(a, b, day.width, day.height, cx, cy);
      across.push([cx, cx + dx]);
      down.push([cy, cy + dy]);
    }
  }
  const fx = line(across);
  const fy = line(down);
  const kx = width / day.width;
  const ky = height / day.height;
  const worst = Math.max(
    ...across.map(([u, x]) => Math.abs(fx.slope * u + fx.offset - x) * kx),
    ...down.map(([v, y]) => Math.abs(fy.slope * v + fy.offset - y) * ky),
  );
  return {
    fit: {
      sx: round4(fx.slope * kx),
      sy: round4(fy.slope * ky),
      x: round2(fx.offset * kx),
      y: round2(fy.offset * ky),
    },
    worst: round2(worst),
  };
}

/** Each pixel's brightness gradient: strong on the outlines, nothing on flat colour. */
function edges(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  const grey = new Float32Array(width * height);
  for (let i = 0; i < grey.length; i++) {
    grey[i] =
      0.3 * (rgba[4 * i] ?? 0) + 0.59 * (rgba[4 * i + 1] ?? 0) + 0.11 * (rgba[4 * i + 2] ?? 0);
  }
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = (grey[i + 1] ?? 0) - (grey[i - 1] ?? 0);
      const gy = (grey[i + width] ?? 0) - (grey[i - width] ?? 0);
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

/** The shift (dx, dy) that lays the patch round (cx, cy) of `a` best onto `b`. */
function bestShift(
  a: Float32Array,
  b: Float32Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
): [number, number] {
  const x0 = Math.max(SEARCH, cx - HALF_WIDTH);
  const x1 = Math.min(width - SEARCH, cx + HALF_WIDTH);
  const y0 = Math.max(SEARCH, cy - HALF_HEIGHT);
  const y1 = Math.min(height - SEARCH, cy + HALF_HEIGHT);
  let best: [number, number] = [0, 0];
  let bestScore = -1;
  for (let dy = -SEARCH; dy <= SEARCH; dy++) {
    for (let dx = -SEARCH; dx <= SEARCH; dx++) {
      let score = 0;
      for (let y = y0; y < y1; y += STEP) {
        const row = y * width;
        const shifted = (y + dy) * width + dx;
        for (let x = x0; x < x1; x += STEP) score += (a[row + x] ?? 0) * (b[shifted + x] ?? 0);
      }
      if (score > bestScore) {
        bestScore = score;
        best = [dx, dy];
      }
    }
  }
  return best;
}

/** The least-squares line through the points (from, to): to = from · slope + offset. */
function line(points: readonly [number, number][]): { slope: number; offset: number } {
  const n = points.length;
  const mx = points.reduce((s, [u]) => s + u, 0) / n;
  const my = points.reduce((s, [, v]) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const [u, v] of points) {
    sxy += (u - mx) * (v - my);
    sxx += (u - mx) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 1;
  return { slope, offset: my - slope * mx };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
