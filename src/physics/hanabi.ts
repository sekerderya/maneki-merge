/**
 * The hanabi (GAME_DESIGN §15.6): a firework ball whose fuse lights at its first contact and goes
 * off HANABI_FUSE_MS later. Its blast reaches every ball whose edge is within HANABI_REACH of the
 * hanabi's centre: cats up to HANABI_MAX_POP_SIZE pop into their value, boulders break, other
 * hanabi go off too, and bigger cats and jokers get pushed straight away from it. This file only
 * decides who is hit and how; the run applies it (payouts, events, pushes).
 */
import { PHYSICS_STEP_MS } from '../config/physics';
import {
  HANABI_FUSE_MS,
  HANABI_MAX_POP_SIZE,
  HANABI_PUSH_SPEED,
  HANABI_REACH,
} from '../config/picks';
import type { BallView } from './balls';

/** A ball the blast pushes, with the velocity it adds (world units per second). */
export interface HanabiPush<T> {
  readonly ball: T;
  readonly vx: number;
  readonly vy: number;
}

export interface HanabiBlast<T> {
  /** Cats that pop into their value. */
  readonly pops: T[];
  /** Boulders that break. */
  readonly breaks: T[];
  /** Other hanabi, which go off in the same tick. */
  readonly chain: T[];
  /** Bigger cats and jokers, pushed away. */
  readonly pushes: HanabiPush<T>[];
}

/** A hanabi's fuse has burnt down: it landed HANABI_FUSE_MS ago (half a step of slack). */
export function fuseBurntOut(ball: BallView, nowMs: number): boolean {
  return (
    ball.kind === 'hanabi' &&
    ball.landedMs >= 0 &&
    nowMs - ball.landedMs >= HANABI_FUSE_MS - PHYSICS_STEP_MS / 2
  );
}

/** What the blast of `hanabi` does to `balls` (the hanabi itself is skipped). Oldest first. */
export function hanabiBlast<T extends BallView>(
  hanabi: BallView,
  balls: readonly T[],
): HanabiBlast<T> {
  const blast: HanabiBlast<T> = { pops: [], breaks: [], chain: [], pushes: [] };
  for (const ball of balls) {
    if (ball.id === hanabi.id) continue;
    const dx = ball.x - hanabi.x;
    const dy = ball.y - hanabi.y;
    const d = Math.hypot(dx, dy);
    if (d - ball.radius > HANABI_REACH) continue;
    if (ball.kind === 'boulder') blast.breaks.push(ball);
    else if (ball.kind === 'hanabi') blast.chain.push(ball);
    else if (ball.kind === 'cat' && ball.size <= HANABI_MAX_POP_SIZE) blast.pops.push(ball);
    else {
      // Straight away from the hanabi; a ball right on top of it goes up.
      const [ux, uy] = d > 0 ? [dx / d, dy / d] : [0, -1];
      blast.pushes.push({ ball, vx: ux * HANABI_PUSH_SPEED, vy: uy * HANABI_PUSH_SPEED });
    }
  }
  return blast;
}
