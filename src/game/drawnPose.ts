/**
 * Where a ball is drawn this frame (TECH_SPEC §5): `alpha` (the run's renderAlpha) of the way
 * from its pose at the start of the run's latest tick to its pose now. Physics runs in fixed
 * ticks of PHYSICS_STEP_MS, so a frame covers 0 to 3 of them; drawn where the latest tick left
 * it, a falling cat moved unevenly from frame to frame and looked like a low frame rate (until
 * v0.41). Alpha 1 draws the latest pose (`?interp=0`).
 */
import type { BallView } from '../physics/balls';

export function drawnX(ball: BallView, alpha: number): number {
  return ball.fromX + (ball.x - ball.fromX) * alpha;
}

export function drawnY(ball: BallView, alpha: number): number {
  return ball.fromY + (ball.y - ball.fromY) * alpha;
}

export function drawnAngle(ball: BallView, alpha: number): number {
  return ball.fromAngle + (ball.angle - ball.fromAngle) * alpha;
}
