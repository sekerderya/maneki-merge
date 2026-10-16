/**
 * The frog (GAME_DESIGN §15.17): a ball that stays in the jar for a few meals. Each time a ball
 * leaves the paw, its tongue swallows the jar's smallest landed cats, the nearest first between
 * cats of one size. This file only decides which cats; the run removes them, pays them out and
 * counts the frog's meals.
 */
import type { BallView } from './balls';

/**
 * The `bites` cats the frog swallows now among `balls`: landed cats only (a ball still falling
 * from the paw isn't in the jar yet), the smallest size first, then the nearest to the frog
 * (centre to centre), then the oldest. Fewer when the jar has fewer.
 */
export function frogMeal<T extends BallView>(
  frog: BallView,
  balls: readonly T[],
  bites: number,
): T[] {
  const cats = balls.filter((ball) => ball.kind === 'cat' && ball.landedMs >= 0);
  const gap = (ball: T): number => Math.hypot(ball.x - frog.x, ball.y - frog.y);
  cats.sort((a, b) => a.size - b.size || gap(a) - gap(b) || a.id - b.id);
  return cats.slice(0, Math.max(0, bites));
}
