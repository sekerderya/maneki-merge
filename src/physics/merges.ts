/**
 * Merge resolution (GAME_DESIGN §5, TECH_SPEC §5). It runs after a physics step, on the
 * same-tier contacts that step collected, so the world never changes in the middle of a step.
 *
 * 1. Candidate pairs are ordered by (older cat id, younger cat id): the oldest cats merge first.
 *    The order comes from our own ids, not from matter-js internals.
 * 2. A cat takes part in at most one merge per step: a pair whose cat is already used is
 *    skipped. Three touching cats give one merge; the third can merge on a later step.
 * 3. Two of the stage's last cat (the cap tier) make a Jackpot and vanish. Otherwise both
 *    vanish and a cat of the next tier is born at their midpoint with their average velocity
 *    (capped), and grows from the old size into its own over MERGE_GROW_MS.
 *
 * New cats aren't in this step's contacts, so a chain continues on the next step at the earliest.
 * Scores, coins and events are the caller's job (RunController).
 */
import { MERGE_MAX_SPEED_BASE } from '../config/physics';
import type { Ball } from './balls';
import type { PhysicsWorld } from './PhysicsWorld';

export interface MergeOutcome {
  readonly kind: 'merge' | 'jackpot';
  /** The tier of the two cats that met. */
  readonly tier: number;
  /** True when either cat was golden (the merged cat itself is a normal one). */
  readonly golden: boolean;
  /** Their midpoint, in world units. */
  readonly x: number;
  readonly y: number;
  /** The merged cat; null for a Jackpot. */
  readonly ball: Ball | null;
}

const byAge = (p: readonly [Ball, Ball], q: readonly [Ball, Ball]): number =>
  p[0].id - q[0].id || p[1].id - q[1].id;

export class MergeResolver {
  private readonly pairs: [Ball, Ball][] = [];
  private readonly used = new Set<Ball>();
  private readonly outcomes: MergeOutcome[] = [];

  /**
   * Resolves the last step's same-tier contacts. The returned list is reused by the next call.
   */
  resolve(world: PhysicsWorld, tierCap: number): readonly MergeOutcome[] {
    const outcomes = this.outcomes;
    outcomes.length = 0;
    const contacts = world.sameTierContacts;
    if (contacts.length === 0) return outcomes;

    const pairs = this.pairs;
    pairs.length = 0;
    for (let i = 0; i < contacts.length; i += 2) {
      const a = contacts[i] as Ball;
      const b = contacts[i + 1] as Ball;
      pairs.push(a.id < b.id ? [a, b] : [b, a]);
    }
    pairs.sort(byAge);

    const used = this.used;
    used.clear();
    for (const [a, b] of pairs) {
      if (a.removed || b.removed || used.has(a) || used.has(b)) continue;
      used.add(a);
      used.add(b);
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const golden = a.golden || b.golden;
      if (a.tier >= tierCap) {
        world.removeBall(a);
        world.removeBall(b);
        outcomes.push({ kind: 'jackpot', tier: a.tier, golden, x, y, ball: null });
        continue;
      }
      const vx = (a.vx + b.vx) / 2;
      const vy = (a.vy + b.vy) / 2;
      const startRadius = Math.max(a.radius, b.radius);
      world.removeBall(a);
      world.removeBall(b);
      // Touching cats have both landed (on each other at least); the earlier landing carries over,
      // so a pile that is over the line keeps counting.
      const landedMs = Math.min(a.landedMs, b.landedMs);
      const ball = world.addBall({ tier: a.tier + 1, x, y, vx, vy, startRadius, landedMs });
      world.capSpeed(ball, MERGE_MAX_SPEED_BASE);
      outcomes.push({ kind: 'merge', tier: a.tier, golden, x, y, ball });
    }
    used.clear();
    return outcomes;
  }
}
