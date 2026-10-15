/**
 * The first stage's quiet help (GAME_DESIGN §8): the sizes a cat newly queued leans towards, the
 * ones waiting on top of the jar for a partner.
 */
import type { BallView } from './balls';

/**
 * The landed cats on top of the jar: a cat of a cat's own size, dropped straight above it, would
 * land on it rather than on another ball first. Falling balls neither count nor cover.
 */
export function openCats(balls: readonly BallView[]): BallView[] {
  const landed = balls.filter((ball) => ball.landedMs >= 0);
  return landed.filter((cat) => {
    if (cat.kind !== 'cat') return false;
    const r = cat.targetRadius;
    // Where the dropped cat's centre is when it touches this one.
    const touch = cat.y - cat.radius - r;
    return landed.every((ball) => {
      if (ball === cat) return true;
      const reach = ball.radius + r;
      const dx = Math.abs(ball.x - cat.x);
      return dx >= reach || ball.y - Math.sqrt(reach * reach - dx * dx) >= touch;
    });
  });
}

/**
 * The tiers of `pool` that will wait for a partner when the cat queued now comes: the open cats'
 * tiers, after each cat still coming before it (`coming`, in order) took a waiting partner of its
 * tier, leaving a cat of the next tier, or, finding none, waits for a partner itself.
 */
export function wantedTiers(
  open: readonly number[],
  coming: readonly number[],
  pool: readonly number[],
): number[] {
  const waiting = new Map<number, number>();
  const add = (tier: number, n: number): void => {
    waiting.set(tier, (waiting.get(tier) ?? 0) + n);
  };
  for (const tier of open) add(tier, 1);
  for (const tier of coming) {
    if ((waiting.get(tier) ?? 0) > 0) {
      add(tier, -1);
      add(tier + 1, 1);
    } else add(tier, 1);
  }
  return pool.filter((tier) => (waiting.get(tier) ?? 0) > 0);
}
