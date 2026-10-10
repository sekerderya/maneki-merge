/**
 * Ball sprites for the art pipeline (tools/build-art.ts): the cats and the special balls are round
 * bodies on a white background. Each one's white is cut, the body circle is fitted to its outline
 * (anything sticking out of the top, like ears, a fuse or a hat, is left out of the fit) and the
 * image is cropped to a square centred on that circle, so the game can scale the circle onto the
 * ball's physics radius.
 */
import { join } from 'node:path';
import { crop, cutBackground, kasa, loadRgba, median, pixel, round, saveWebp } from './artImage.ts';
import type { Circle, Rgba } from './artImage.ts';

/** Contour points above this fraction of the radius over the centre are ears, not body. */
const EAR_CUTOFF = 0.45;
/** Contour points further than this (px) from the fitted circle are dropped before refitting. */
const FIT_TOLERANCE = 4;
/** Transparent margin around the sprite, px. */
const MARGIN = 2;

export interface BallSprite {
  readonly file: string;
  readonly side: number;
  readonly radius: number;
  readonly color: string;
}

/** Cuts, fits and crops the ball in `source` (a path or an image) and writes `dir/file`. */
export async function buildBall(
  source: string | Rgba,
  dir: string,
  file: string,
): Promise<BallSprite> {
  const image = typeof source === 'string' ? await loadRgba(source) : source;
  const depth = cutBackground(image);
  const circle = fitCircle(image, depth);
  const sprite = cropAround(image, circle);
  await saveWebp(sprite, join(dir, file));
  const result: BallSprite = {
    file,
    side: sprite.width,
    radius: round(circle.r),
    color: ringColor(sprite, sprite.width / 2, circle.r),
  };
  console.log(
    `${typeof source === 'string' ? source : file}: circle r=${result.radius} ` +
      `(${round((2 * circle.r) / image.width)} of the width), sprite ${sprite.width}px, body ${result.color}`,
  );
  return result;
}

/** Least-squares circle through the silhouette's edge below the ears, refitted without outliers. */
function fitCircle(image: Rgba, depth: Uint8Array): Circle {
  const { width, height } = image;
  const edge: [number, number][] = [];
  let minX = width;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (depth[y * width + x] === 1) {
        edge.push([x, y]);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const r0 = (maxX - minX) / 2;
  let circle: Circle = { cx: (minX + maxX) / 2, cy: maxY - r0, r: r0 };
  let points = edge.filter(([, y]) => y > circle.cy - EAR_CUTOFF * circle.r);
  for (let pass = 0; pass < 4; pass++) {
    circle = kasa(points);
    const c = circle;
    points = points.filter(
      ([x, y]) => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) <= FIT_TOLERANCE * (4 - pass),
    );
  }
  return kasa(points);
}

/** A square of opaque content centred on the circle (the sprite's origin is the ball's centre). */
function cropAround(image: Rgba, circle: Circle): Rgba {
  const { data, width, height } = image;
  let half = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[4 * (y * width + x) + 3] ?? 0) > 8) {
        half = Math.max(half, Math.abs(x + 0.5 - circle.cx), Math.abs(y + 0.5 - circle.cy));
      }
    }
  }
  const side = 2 * Math.ceil(half + MARGIN);
  const x = Math.round(circle.cx - side / 2);
  const y = Math.round(circle.cy - side / 2);
  return crop(image, { x, y, w: side, h: side });
}

/** The body's colour: the median of the left and right sides of a ring inside the outline. */
function ringColor(image: Rgba, centre: number, radius: number): string {
  const samples: number[][] = [];
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    // The sides only: the top is the head between the ears, the bottom is often the belly.
    if (Math.abs(Math.cos(t)) < 0.7) continue;
    for (const f of [0.8, 0.85, 0.9]) {
      const x = Math.round(centre + Math.cos(t) * radius * f);
      const y = Math.round(centre + Math.sin(t) * radius * f);
      samples.push(pixel(image, x, y));
    }
  }
  return median(samples);
}
