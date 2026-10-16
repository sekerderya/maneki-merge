/**
 * The Katana (GAME_DESIGN §15.16): where its blades fall and what they cut. A katana isn't a ball:
 * each blade is a straight line from where it starts to where it ends, and over KATANA_FALL_MS its
 * point runs along that line. A ball is cut once the line from the start to the point comes within
 * its radius plus the grace of its centre. This file only decides the lines and who is cut; the run
 * times the fall, pops the cats and breaks the boulders.
 */
import { KATANA_MAX_CUT_SIZE } from '../config/picks';
import type { BladeLine } from '../config/picks';
import type { BallView } from './balls';
import type { JarGeometry } from './geometry';

export type { BladeLine };

/**
 * The blades of a katana dropped at `x` from `startY`, with More Blades at `extra`: first the one
 * straight down from the paw to the floor; then, one per level, a diagonal from the jar's top corner
 * on the aim's side to the opposite bottom corner, the other diagonal (an X), and one straight
 * across the middle of the jar from the aim's side. The aim's side is the right from the middle on.
 */
export function katanaBlades(
  x: number,
  startY: number,
  extra: number,
  geometry: JarGeometry,
): BladeLine[] {
  const { halfWidth: w, rimY } = geometry;
  const side = x >= 0 ? 1 : -1;
  const blades: BladeLine[] = [{ x0: x, y0: startY, x1: x, y1: 0 }];
  const more: BladeLine[] = [
    { x0: side * w, y0: rimY, x1: -side * w, y1: 0 },
    { x0: -side * w, y0: rimY, x1: side * w, y1: 0 },
    { x0: side * w, y0: rimY / 2, x1: -side * w, y1: rimY / 2 },
  ];
  return [...blades, ...more.slice(0, Math.max(0, Math.min(more.length, extra)))];
}

/** How far along its line a blade's point is at `t` (0 at the start, 1 at the end). */
export function bladePoint(
  blade: BladeLine,
  t: number,
): { readonly x: number; readonly y: number } {
  const k = Math.max(0, Math.min(1, t));
  return { x: blade.x0 + (blade.x1 - blade.x0) * k, y: blade.y0 + (blade.y1 - blade.y0) * k };
}

/** The distance from (px, py) to the segment from (ax, ay) to (bx, by). */
export function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const u = length2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0;
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}

/** A ball a blade reached, and which blade (its index in the katana's blades). */
export interface KatanaHit<T> {
  readonly ball: T;
  readonly blade: number;
}

export interface KatanaCuts<T> {
  /** Cats up to KATANA_MAX_CUT_SIZE: they pop into their value. */
  readonly cats: KatanaHit<T>[];
  /** Boulders: they break at once, whatever their bands. */
  readonly boulders: KatanaHit<T>[];
}

/**
 * What the blades have reached by `t` among `balls`, oldest first: every cat up to
 * KATANA_MAX_CUT_SIZE and every boulder within its radius plus `grace` of the line a blade's point
 * has run along. Everything else (bigger cats, hanabi, jokers, lightning balls) lets them through.
 * The first blade that reaches a ball takes it.
 */
export function katanaCuts<T extends BallView>(
  blades: readonly BladeLine[],
  t: number,
  balls: readonly T[],
  grace: number,
): KatanaCuts<T> {
  const cuts: KatanaCuts<T> = { cats: [], boulders: [] };
  for (const ball of balls) {
    const cuttable =
      ball.kind === 'boulder' || (ball.kind === 'cat' && ball.size <= KATANA_MAX_CUT_SIZE);
    if (!cuttable) continue;
    const blade = blades.findIndex((line) => {
      const point = bladePoint(line, t);
      const d = segmentDistance(ball.x, ball.y, line.x0, line.y0, point.x, point.y);
      return d <= ball.radius + grace;
    });
    if (blade < 0) continue;
    (ball.kind === 'boulder' ? cuts.boulders : cuts.cats).push({ ball, blade });
  }
  return cuts;
}
