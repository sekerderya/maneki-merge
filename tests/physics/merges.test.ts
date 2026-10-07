import { describe, expect, it } from 'vitest';
import {
  MAX_SPEED_BASE,
  MERGE_SPIN_MIN_SLIDE,
  MERGE_SPIN_RIM_SPEED,
  PHYSICS_STEP_MS,
} from '../../src/config/physics';
import { catRadius, stageInfo } from '../../src/config/stages';
import { SIZE_COUNT, sizeRadius } from '../../src/config/tiers';
import { MERGE_GROW_MS } from '../../src/config/timings';
import { Rng } from '../../src/core/rng';
import { floorRestY } from '../../src/physics/geometry';
import type { MergeOutcome } from '../../src/physics/merges';
import { MergeResolver, mergeSpinDirection } from '../../src/physics/merges';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';

const CAP_1 = stageInfo(1).lastTier;

/** Steps the world, resolving merges after each step, and returns every outcome. */
function play(world: PhysicsWorld, steps: number, cap = CAP_1): MergeOutcome[] {
  const resolver = new MergeResolver();
  const all: MergeOutcome[] = [];
  for (let i = 0; i < steps; i++) {
    world.step();
    all.push(...resolver.resolve(world, cap));
  }
  return all;
}

/** Steps the world until the first merge or Jackpot, and returns it as it happened. */
function firstMerge(world: PhysicsWorld, steps: number, cap = CAP_1): MergeOutcome | undefined {
  const resolver = new MergeResolver();
  for (let i = 0; i < steps; i++) {
    world.step();
    const [outcome] = resolver.resolve(world, cap);
    if (outcome) return outcome;
  }
  return undefined;
}

/** Two same-tier cats resting side by side on the floor, overlapping by 2 units. */
function pairOnFloor(world: PhysicsWorld, tier: number, centre = 0) {
  const r = sizeRadius(tier);
  return [
    world.addBall({ tier, x: centre - r + 1, y: -r }),
    world.addBall({ tier, x: centre + r - 1, y: -r }),
  ] as const;
}

describe('MergeResolver (GAME_DESIGN §5)', () => {
  it('merges two touching cats into one of the next tier at their midpoint', () => {
    const world = new PhysicsWorld();
    const [a, b] = pairOnFloor(world, 2, 40);
    world.step();
    const outcomes = new MergeResolver().resolve(world, CAP_1);
    expect(outcomes).toHaveLength(1);
    const merge = outcomes[0]!;
    expect(merge.kind).toBe('merge');
    expect(merge.tier).toBe(2);
    expect(merge.x).toBeCloseTo(40, 0);
    expect(a.removed && b.removed).toBe(true);
    const cat = merge.ball!;
    expect(world.balls).toEqual([cat]);
    expect(cat.tier).toBe(3);
    expect(cat.x).toBe(merge.x);
    expect(cat.y).toBe(merge.y);
  });

  it('is born at rest exactly between its parents, however fast they met', () => {
    const world = new PhysicsWorld();
    const a = world.addBall({ tier: 2, x: -32, y: -300, vx: 1000, vy: 300 });
    const b = world.addBall({ tier: 2, x: 32, y: -300, vx: -200, vy: 900 });
    world.step();
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const [merge] = new MergeResolver().resolve(world, CAP_1);
    const cat = merge!.ball!;
    expect(cat.x).toBe(middle.x);
    expect(cat.y).toBe(middle.y);
    expect(cat.speed).toBe(0);
  });

  it('turns the new cat as if another cat had clipped it, the same at every stage', () => {
    // A cat falls onto the right shoulder of a resting one: their rims drag clockwise.
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    world.addBall({ tier: 2, x: 0, y: -r });
    world.addBall({ tier: 2, x: r, y: -3 * r, vy: 1200 });
    const cat = firstMerge(world, 60)!.ball!;
    expect(cat.spin).toBeGreaterThan(0);
    expect(cat.spin * cat.targetRadius).toBeCloseTo(MERGE_SPIN_RIM_SPEED, 6);

    // Stage 4 starts at tier 28: tier 33 is size 6 there, as big as a stage-1 tier 6.
    const big = new PhysicsWorld({ stage: 4 });
    big.addBall({ tier: 32, x: 0, y: -sizeRadius(5) });
    big.addBall({ tier: 32, x: -sizeRadius(5), y: -3 * sizeRadius(5), vy: 1200 });
    const left = firstMerge(big, 60, stageInfo(4).lastTier)!.ball!;
    expect(left.size).toBe(6);
    expect(left.spin * sizeRadius(6)).toBeCloseTo(-MERGE_SPIN_RIM_SPEED, 6);
  });

  it('takes the turn from the slide, else from the parents turning, else from their ids', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    const below = world.addBall({ tier: 2, x: 0, y: -r });
    const right = world.addBall({ tier: 2, x: r, y: -3 * r, vy: 900 });
    const left = world.addBall({ tier: 2, x: -r, y: -3 * r, vy: 900 });
    expect(mergeSpinDirection(below, right)).toBe(1);
    expect(mergeSpinDirection(below, left)).toBe(-1);

    // Head-on: no slide, so the parents' own turn wins, then their ids (odd sum: −1).
    const still = new PhysicsWorld();
    const a = still.addBall({ tier: 2, x: -40, y: -r, vx: 300 });
    const b = still.addBall({ tier: 2, x: 40, y: -r, vx: -300 });
    const c = still.addBall({ tier: 2, x: 120, y: -r });
    const rolling = still.addBall({ tier: 2, x: 200, y: -r, spin: -4 });
    expect(mergeSpinDirection(a, b)).toBe(-1); // ids 1 + 2
    expect(mergeSpinDirection(a, c)).toBe(1); // ids 1 + 3
    expect(mergeSpinDirection(c, rolling)).toBe(-1);
    expect(mergeSpinDirection(rolling, a)).toBe(-1);
    // A slide too slow to tell: the ids decide.
    const slow = still.addBall({ tier: 2, x: 120, y: -3 * r, vx: MERGE_SPIN_MIN_SLIDE / 2 });
    expect(mergeSpinDirection(c, slow)).toBe(1); // ids 3 + 5
  });

  it('does not merge different tiers', () => {
    const world = new PhysicsWorld();
    world.addBall({ tier: 2, x: -32, y: -33 });
    world.addBall({ tier: 3, x: 38, y: -40 });
    expect(play(world, 120)).toEqual([]);
    expect(world.balls).toHaveLength(2);
  });

  it('merges a cat at most once per step: three touching give one merge, oldest first', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    // A triangle: a and b on the floor, c resting on both.
    const a = world.addBall({ tier: 2, x: -r + 1, y: -r });
    const b = world.addBall({ tier: 2, x: r - 1, y: -r });
    const c = world.addBall({ tier: 2, x: 0, y: -r - Math.sqrt((2 * r) ** 2 - r ** 2) + 1 });
    world.step();
    expect(world.sameTierContacts).toHaveLength(6);
    const outcomes = new MergeResolver().resolve(world, CAP_1);
    expect(outcomes).toHaveLength(1);
    expect(a.removed && b.removed).toBe(true);
    expect(c.removed).toBe(false);
  });

  it('resolves separate pairs in the same step', () => {
    const world = new PhysicsWorld();
    pairOnFloor(world, 1, -150);
    pairOnFloor(world, 3, 150);
    world.step();
    const outcomes = new MergeResolver().resolve(world, CAP_1);
    expect(outcomes.map((o) => o.tier)).toEqual([1, 3]);
    expect(world.balls.map((b) => b.tier)).toEqual([2, 4]);
  });

  it('makes a Jackpot from two cap-tier cats (or bigger)', () => {
    const world = new PhysicsWorld();
    pairOnFloor(world, 3, -150);
    pairOnFloor(world, 4, 150);
    world.step();
    const outcomes = new MergeResolver().resolve(world, 3);
    expect(outcomes.map((o) => [o.kind, o.tier, o.ball])).toEqual([
      ['jackpot', 3, null],
      ['jackpot', 4, null],
    ]);
    expect(world.balls).toHaveLength(0);

    // Two of stage 1's last cat, one on the other.
    const big = new PhysicsWorld();
    const r = sizeRadius(SIZE_COUNT);
    big.addBall({ tier: CAP_1, x: 0, y: -r });
    big.addBall({ tier: CAP_1, x: 0, y: -3 * r + 2 });
    big.step();
    expect(new MergeResolver().resolve(big, CAP_1).map((o) => o.kind)).toEqual(['jackpot']);
    expect(big.balls).toHaveLength(0);
  });

  it('inherits the earliest landing, so a pile over the line keeps counting', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    world.addBall({ tier: 2, x: -r + 1, y: -r, landedMs: 40 });
    world.addBall({ tier: 2, x: r - 1, y: -r, landedMs: 10 });
    world.step();
    expect(new MergeResolver().resolve(world, CAP_1)[0]!.ball!.landedMs).toBe(10);

    // Two falling cats that meet in the air have landed on each other.
    const air = new PhysicsWorld();
    air.addBall({ tier: 2, x: -r + 1, y: -600 });
    air.addBall({ tier: 2, x: r - 1, y: -600 });
    air.step();
    expect(new MergeResolver().resolve(air, CAP_1)[0]!.ball!.landedMs).toBe(PHYSICS_STEP_MS);
  });

  it('grows the merged cat from the old size over MERGE_GROW_MS', () => {
    const world = new PhysicsWorld();
    pairOnFloor(world, 4);
    world.step();
    const cat = new MergeResolver().resolve(world, CAP_1)[0]!.ball!;
    expect(cat.radius).toBe(sizeRadius(4));
    for (let i = 0; i < Math.ceil(MERGE_GROW_MS / PHYSICS_STEP_MS); i++) world.step();
    expect(cat.radius).toBe(sizeRadius(5));
  });

  it('chains: the grown cat merges with its new neighbour on a later step', () => {
    const world = new PhysicsWorld();
    const r2 = sizeRadius(2);
    const r3 = sizeRadius(3);
    pairOnFloor(world, 2);
    // A tier-3 cat resting in the dip between them: the merged cat grows into it.
    const rise = Math.sqrt((r2 + r3) ** 2 - r2 ** 2);
    world.addBall({ tier: 3, x: 0, y: -r2 - rise + 1 });
    const outcomes = play(world, 60);
    expect(outcomes.map((o) => o.tier)).toEqual([2, 3]);
    expect(world.balls.map((b) => b.tier)).toEqual([4]);
  });

  it('reuses its outcome list and survives an empty step', () => {
    const world = new PhysicsWorld();
    const resolver = new MergeResolver();
    world.step();
    const first = resolver.resolve(world, CAP_1);
    expect(first).toHaveLength(0);
    expect(resolver.resolve(world, CAP_1)).toBe(first);
  });
});

describe('growth without launches (TECH_SPEC §5)', () => {
  /**
   * The biggest pair (size 9) side by side on the floor, wedged between the curved corners,
   * under a pile of the stage's dropped tiers, settled without merges. Then every merge resolves at once:
   * the big one grows into the stage's last cat, wider than half the jar, while the pile
   * chain-reacts on top.
   */
  it.each([
    [9, 1, 1],
    [18, 2, 2],
    [36, 4, 3],
  ])('a tier-%i merge at stage %i (seed %i) pushes but never launches', (big, stage, seed) => {
    const world = new PhysicsWorld({ stage });
    const { geometry } = world;
    const { halfWidth } = geometry;
    const pool = stageInfo(stage).dropPool;
    const rng = new Rng(seed);
    const r = catRadius(big, stage);
    // Side by side, touching: the curves wedge them together.
    for (const x of [-(r - 1), r - 1])
      world.addBall({ tier: big, x, y: floorRestY(x, r, geometry) });
    const top = -2 * r;
    for (let i = 0; i < 30; i++) {
      const x = (rng.next() * 2 - 1) * (halfWidth - 120);
      const tier = pool[rng.int(0, pool.length - 1)]!;
      world.addBall({ tier, x, y: top - 150 - Math.floor(i / 4) * 230 });
    }
    for (let i = 0; i < 120 * 5; i++) world.step();

    const resolver = new MergeResolver();
    let bigMerged = false;
    let maxUp = 0;
    for (let i = 0; i < 120 * 2; i++) {
      world.step();
      for (const o of resolver.resolve(world, stageInfo(stage).lastTier)) {
        bigMerged ||= o.tier === big;
      }
      for (const cat of world.balls) {
        maxUp = Math.max(maxUp, -cat.vy);
        expect(Math.abs(cat.x)).toBeLessThan(halfWidth);
        expect(cat.y).toBeLessThan(0);
      }
    }
    expect(bigMerged).toBe(true);
    // Upward speed stays a small fraction of the speed limit.
    expect(maxUp).toBeLessThan(0.2 * MAX_SPEED_BASE);
  });
});
