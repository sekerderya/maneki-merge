/**
 * The lightning ball (GAME_DESIGN §15.15): the first cat or boulder it touches is struck, and with
 * it every ball like it in the jar: every cat of that tier, or every boulder. This file only
 * decides who is struck and how the lightning chains through them; the run holds time still,
 * then pops them (payouts, events).
 */
import type { BallView } from './balls';

/** The balls a lightning ball strikes when it touches `struck`: `struck` first, then oldest first. */
export function strikeTargets<T extends BallView>(struck: T, balls: readonly T[]): T[] {
  const targets = [struck];
  for (const ball of balls) {
    if (ball === struck) continue;
    if (struck.kind === 'boulder' ? ball.kind === 'boulder' : sameCat(ball, struck)) {
      targets.push(ball);
    }
  }
  return targets;
}

function sameCat(ball: BallView, struck: BallView): boolean {
  return ball.kind === 'cat' && struck.kind === 'cat' && ball.tier === struck.tier;
}

/** A link of the chain: from point `from` to point `to`, `depth` links away from the ball. */
export interface StrikeLink {
  readonly from: number;
  readonly to: number;
  readonly depth: number;
}

/** A circle the chain links: the lightning ball (first) or a struck ball. */
export interface ChainPoint {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * How the lightning chains from the ball (point 0) to every struck ball: each link goes from a
 * point already reached to the nearest one not yet reached, edge to edge (Prim's tree), so the
 * bolts jump between neighbours and branch where a cat has several. Ties go to the lower index.
 * One link per struck ball, in the order they are reached.
 */
export function strikeChain(points: readonly ChainPoint[]): StrikeLink[] {
  const n = points.length;
  const links: StrikeLink[] = [];
  if (n < 2) return links;
  const reached = new Array<boolean>(n).fill(false);
  const depth = new Array<number>(n).fill(0);
  // The nearest reached point of each point not yet reached, and the gap to it.
  const gap = new Array<number>(n).fill(Infinity);
  const via = new Array<number>(n).fill(0);
  reached[0] = true;
  const relax = (from: number): void => {
    const a = points[from] as ChainPoint;
    for (let i = 1; i < n; i++) {
      if (reached[i]) continue;
      const b = points[i] as ChainPoint;
      const d = Math.max(0, Math.hypot(b.x - a.x, b.y - a.y) - a.radius - b.radius);
      if (d < (gap[i] as number)) {
        gap[i] = d;
        via[i] = from;
      }
    }
  };
  relax(0);
  for (let step = 1; step < n; step++) {
    let next = -1;
    for (let i = 1; i < n; i++) {
      if (!reached[i] && (next < 0 || (gap[i] as number) < (gap[next] as number))) next = i;
    }
    const from = via[next] as number;
    reached[next] = true;
    depth[next] = (depth[from] as number) + 1;
    links.push({ from, to: next, depth: depth[next] as number });
    relax(next);
  }
  return links;
}
