/**
 * Merge resolution (GAME_DESIGN §5, TECH_SPEC §5). It runs after a physics step, on the
 * same-tier contacts that step collected, so the world never changes in the middle of a step.
 *
 * 1. Candidate pairs are ordered by (older cat id, younger cat id): the oldest cats merge first.
 *    The order comes from our own ids, not from matter-js internals.
 * 2. A cat takes part in at most one merge per step: a pair whose cat is already used is
 *    skipped. Three touching cats give one merge; the third can merge on a later step.
 * 3. Two of the stage's last cat (the cap tier) make a Jackpot and vanish. Otherwise both
 *    vanish and a cat of the next tier is born at rest exactly at their midpoint, and grows from
 *    the old size into its own over MERGE_GROW_MS. When one of them is golden (GAME_DESIGN §15.4)
 *    the new cat is two tiers up, never above the cap. It is never golden itself.
 * 4. The new cat starts to turn, as if another cat had clipped it (`mergeSpinDirection`).
 * 5. Every boulder within BOULDER_HIT_REACH of one of a merge's two cats takes a hit, once per merge
 *    (GAME_DESIGN §15.3); a Jackpot counts as a merge. The caller applies the hits.
 *
 * New cats aren't in this step's contacts, so a chain continues on the next step at the earliest.
 * Scores, coins, events and the hits' effect are the caller's job (RunController).
 */
import { MERGE_SPIN_MIN_SLIDE, MERGE_SPIN_RIM_SPEED } from '../config/physics';
import { BOULDER_HIT_REACH } from '../config/picks';
import { sizeRadius } from '../config/tiers';
import type { Ball } from './balls';
import type { PhysicsWorld } from './PhysicsWorld';

export interface MergeOutcome {
  readonly kind: 'merge' | 'jackpot';
  /** The tier of the two cats that met. */
  readonly tier: number;
  /** The merged cat's tier: tier + 1, or tier + 2 when a golden cat merged (the tier for a Jackpot). */
  readonly newTier: number;
  /** One of the two cats was golden. */
  readonly golden: boolean;
  /** Their midpoint, in world units. */
  readonly x: number;
  readonly y: number;
  /** The merged cat; null for a Jackpot. */
  readonly ball: Ball | null;
}

const byAge = (p: readonly [Ball, Ball], q: readonly [Ball, Ball]): number =>
  p[0].id - q[0].id || p[1].id - q[1].id;

/**
 * Which way a cat born from `older` and `younger` turns: 1 clockwise on screen, −1 the other way.
 * Two cats that slide past each other drag each other's rims along, which turns both the same
 * way, so the new cat turns that way too. Cats that meet head-on keep turning the way they
 * already did, and cats that don't turn at all take a side from their ids.
 */
export function mergeSpinDirection(older: Ball, younger: Ball): 1 | -1 {
  const dx = younger.x - older.x;
  const dy = younger.y - older.y;
  const d = Math.hypot(dx, dy);
  if (d > 0) {
    // How fast the younger cat slides past the older one, across the line between them.
    const slide = (dx * (younger.vy - older.vy) - dy * (younger.vx - older.vx)) / d;
    if (Math.abs(slide) > MERGE_SPIN_MIN_SLIDE) return slide > 0 ? 1 : -1;
  }
  const spin = older.spin + younger.spin;
  if (spin !== 0) return spin > 0 ? 1 : -1;
  return (older.id + younger.id) % 2 === 0 ? 1 : -1;
}

export class MergeResolver {
  private readonly pairs: [Ball, Ball][] = [];
  private readonly used = new Set<Ball>();
  private readonly outcomes: MergeOutcome[] = [];
  /** Which merge (index into `outcomes`) each merged cat took part in. */
  private readonly mergeOf = new Map<Ball, number>();
  private readonly hitList: Ball[] = [];

  /**
   * The boulders the last `resolve` hit, once per merge that hit each (a boulder two merges hit is
   * listed twice), in the order of the boulders' ids, then the merges. Reused by the next call.
   */
  get hits(): readonly Ball[] {
    return this.hitList;
  }

  /**
   * Resolves the last step's same-tier contacts. The returned list is reused by the next call.
   */
  resolve(world: PhysicsWorld, tierCap: number): readonly MergeOutcome[] {
    const outcomes = this.outcomes;
    outcomes.length = 0;
    this.hitList.length = 0;
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
      this.mergeOf.set(a, outcomes.length);
      this.mergeOf.set(b, outcomes.length);
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      const golden = a.golden || b.golden;
      if (a.tier >= tierCap) {
        world.removeBall(a);
        world.removeBall(b);
        outcomes.push({ kind: 'jackpot', tier: a.tier, newTier: a.tier, golden, x, y, ball: null });
        continue;
      }
      const startRadius = Math.max(a.radius, b.radius);
      const tier = Math.min(a.tier + (golden ? 2 : 1), tierCap);
      const spin =
        (mergeSpinDirection(a, b) * MERGE_SPIN_RIM_SPEED) / sizeRadius(world.sizeOf(tier));
      world.removeBall(a);
      world.removeBall(b);
      // Touching cats have both landed (on each other at least); the earlier landing carries over,
      // so a pile that is over the line keeps counting.
      const landedMs = Math.min(a.landedMs, b.landedMs);
      const ball = world.addBall({ tier, x, y, spin, startRadius, landedMs });
      outcomes.push({ kind: 'merge', tier: a.tier, newTier: tier, golden, x, y, ball });
    }
    used.clear();
    this.collectHits(world.balls);
    this.mergeOf.clear();
    return outcomes;
  }

  /** The boulders this step's merges hit: once per (boulder, merge), boulders in id order. */
  private collectHits(balls: readonly Ball[]): void {
    if (this.mergeOf.size === 0) return;
    for (const boulder of balls) {
      if (boulder.kind !== 'boulder') continue;
      let last = -1;
      for (const [cat, merge] of this.mergeOf) {
        if (merge === last) continue;
        const gap = Math.hypot(cat.x - boulder.x, cat.y - boulder.y) - cat.radius - boulder.radius;
        if (gap > BOULDER_HIT_REACH) continue;
        this.hitList.push(boulder);
        last = merge;
      }
    }
  }
}
