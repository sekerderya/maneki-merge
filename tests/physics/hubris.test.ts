import { describe, expect, it } from 'vitest';
import { THREE_WAY_PAYOUT } from '../../src/config/economy';
import { BOULDER_HIT_REACH, HUBRIS_MAX_SIZE } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius, tierCoins, tierScore } from '../../src/config/tiers';
import { coinPayout } from '../../src/core/economy';
import type { GameEvents } from '../../src/core/events';
import type { Ball } from '../../src/physics/balls';
import type { MergeOutcome, MergeRules } from '../../src/physics/merges';
import { MergeResolver } from '../../src/physics/merges';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';

const CAP = stageInfo(1).lastTier;
const HUBRIS: MergeRules = { threesUpTo: HUBRIS_MAX_SIZE, porcelain: false };

/** Cats of `size` (stage 1: tier = size) side by side on the floor, each overlapping the next by 2. */
function row(world: PhysicsWorld, size: number, count: number, left = -200, golden = -1): Ball[] {
  const r = sizeRadius(size);
  return Array.from({ length: count }, (_, i) =>
    world.addBall({ tier: size, x: left + r + i * (2 * r - 2), y: -r, golden: i === golden }),
  );
}

/** Steps the world, resolving with Hubris after each step, and returns every outcome. */
function play(world: PhysicsWorld, steps: number, rules = HUBRIS): MergeOutcome[] {
  const resolver = new MergeResolver();
  const all: MergeOutcome[] = [];
  for (let i = 0; i < steps; i++) {
    world.step();
    all.push(...resolver.resolve(world, CAP, rules).map((o) => ({ ...o })));
  }
  return all;
}

describe('Hubris (GAME_DESIGN §15.11)', () => {
  it('keeps two touching small cats apart', () => {
    for (let size = 1; size <= HUBRIS_MAX_SIZE; size++) {
      const world = new PhysicsWorld();
      row(world, size, 2, -150);
      expect(play(world, 60)).toEqual([]);
      expect(world.balls).toHaveLength(2);
    }
  });

  it('merges three in a chain into a cat two sizes bigger at their centroid', () => {
    const world = new PhysicsWorld();
    const cats = row(world, 3, 3);
    // The first and the last don't touch: only through the middle one.
    expect(Math.abs(cats[2]!.x - cats[0]!.x)).toBeGreaterThan(2 * sizeRadius(3));
    const cx = (cats[0]!.x + cats[1]!.x + cats[2]!.x) / 3;
    world.step();
    const [three] = new MergeResolver().resolve(world, CAP, HUBRIS);
    expect(three).toMatchObject({ kind: 'merge', tier: 3, newTier: 5, parts: 3, golden: false });
    expect(three!.x).toBeCloseTo(cx, 6);
    expect(cats.every((c) => c.removed)).toBe(true);
    // It starts at the three's radius and grows into its own.
    expect(three!.ball!.radius).toBeCloseTo(sizeRadius(3), 0);
    expect(three!.ball!.targetRadius).toBe(sizeRadius(5));
  });

  it('goes up three sizes with a golden cat among the three', () => {
    const world = new PhysicsWorld();
    row(world, 2, 3, -200, 1);
    world.step();
    const [three] = new MergeResolver().resolve(world, CAP, HUBRIS);
    expect(three).toMatchObject({ tier: 2, newTier: 5, golden: true, parts: 3 });
  });

  it('makes one three of four in a row, and the fourth waits', () => {
    const world = new PhysicsWorld();
    const cats = row(world, 2, 4);
    world.step();
    const outcomes = new MergeResolver().resolve(world, CAP, HUBRIS);
    expect(outcomes).toHaveLength(1);
    // The three oldest.
    expect(cats.map((c) => c.removed)).toEqual([true, true, true, false]);
    // The fourth alone can't merge: it waits for two more.
    expect(play(world, 60).filter((o) => o.tier === 2)).toEqual([]);
  });

  it('still merges sizes 6 and up in pairs', () => {
    const world = new PhysicsWorld();
    row(world, 6, 2, -150);
    const outcomes = play(world, 5);
    expect(outcomes[0]).toMatchObject({ tier: 6, newTier: 7, parts: 2 });
  });

  it('lets a joker merge with one small cat, the way around it', () => {
    const world = new PhysicsWorld();
    const r = sizeRadius(2);
    const cat = world.addBall({ tier: 2, x: -r + 1, y: -r });
    world.addBall({ kind: 'joker', tier: 2, x: r - 1, y: -r });
    world.step();
    const [merge] = new MergeResolver().resolve(world, CAP, HUBRIS);
    expect(merge).toMatchObject({ tier: 2, newTier: 3, joker: true, parts: 2 });
    expect(cat.removed).toBe(true);
  });

  it("never puts a broken cat's two pieces in one three", () => {
    const world = new PhysicsWorld();
    const [a, b, c] = row(world, 2, 3);
    a!.mate = c!.id;
    c!.mate = a!.id;
    expect(play(world, 30)).toEqual([]);
    expect(b!.removed).toBe(false);
  });

  it('hits a boulder near two of the three once, as one merge', () => {
    const world = new PhysicsWorld();
    const cats = row(world, 2, 3);
    // A boulder resting on the first two cats.
    const r = sizeRadius(2);
    const boulder = world.addBall({
      kind: 'boulder',
      tier: 2,
      hits: 3,
      x: (cats[0]!.x + cats[1]!.x) / 2,
      y: -r - Math.sqrt((2 * r) ** 2 - r ** 2) + BOULDER_HIT_REACH / 2,
    });
    world.step();
    const resolver = new MergeResolver();
    resolver.resolve(world, CAP, HUBRIS);
    expect(resolver.hits).toEqual([boulder]);
  });

  it('pays a three like a merge of its size and a half, and counts once for the combo', () => {
    const run = new RunController({ seed: 5 });
    run.setPickLevel('hubris', 1);
    const merged: GameEvents['merged'][] = [];
    run.events.on('merged', (e) => merged.push(e));
    const r = sizeRadius(3);
    for (let i = 0; i < 3; i++) run.spawnBall(3, -150 + r + i * (2 * r - 2), -r);
    for (let i = 0; i < 5; i++) run.tick();
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ tier: 3, newTier: 5, parts: 3, combo: 1 });
    expect(merged[0]!.score).toBe(THREE_WAY_PAYOUT * tierScore(3));
    expect(merged[0]!.coins).toBe(coinPayout(THREE_WAY_PAYOUT * tierCoins(3), 1, 0));
    expect(run.coins).toBe(merged[0]!.coins);
  });

  it('plays the same for the same seed and inputs', () => {
    const play = () => {
      const run = new RunController({ seed: 77 });
      run.setPickLevel('hubris', 1);
      for (let i = 0; i < 3000 && run.state !== 'over'; i++) {
        if (run.canDrop) run.drop(((i * 37) % 500) - 250);
        if (run.state === 'choosing') run.choose(run.pickOffer!.options[0]!);
        run.tick();
      }
      return run.stateHash();
    };
    expect(play()).toBe(play());
  });
});
