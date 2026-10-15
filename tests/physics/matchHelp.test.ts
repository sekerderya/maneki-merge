import { describe, expect, it } from 'vitest';
import { MATCH_HELP_LAST_STAGE, stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import type { BallView } from '../../src/physics/balls';
import { openCats, wantedTiers } from '../../src/physics/reach';
import { RunController } from '../../src/run/RunController';

/** A landed cat (or a falling one, `landed` false) of `radius` with its centre at x, y. */
function ball(id: number, tier: number, x: number, y: number, radius: number, landed = true) {
  return {
    id,
    kind: 'cat',
    tier,
    x,
    y,
    radius,
    targetRadius: radius,
    landedMs: landed ? 0 : -1,
  } as unknown as BallView;
}

const ids = (balls: readonly BallView[]): number[] => balls.map((b) => b.id);

describe('openCats (GAME_DESIGN §8)', () => {
  it('finds the landed cats a cat of their own size, dropped straight above, would land on', () => {
    const small = ball(1, 1, 0, -41, 41);
    // A size-9 cat sitting on the small one covers it; one far to the side doesn't.
    const onTop = ball(2, 9, 0, -41 - 41 - 165, 165);
    const aside = ball(3, 2, -250, -49, 49);
    expect(ids(openCats([small, onTop, aside]))).toEqual([2, 3]);
    expect(ids(openCats([small, aside]))).toEqual([1, 3]);
  });

  it("counts a bigger neighbour's shoulder: it covers a cat tucked in right beside it", () => {
    const big = ball(1, 6, 100, -98, 98);
    // A 1 dropped above the tucked-in cat would hit the big one's shoulder first.
    const tucked = ball(2, 1, -28, -41, 41);
    expect(ids(openCats([big, tucked]))).toEqual([1]);
    const clear = ball(3, 1, -60, -41, 41);
    expect(ids(openCats([big, clear]))).toEqual([1, 3]);
  });

  it('ignores falling balls, and boulders cover but never count', () => {
    const small = ball(1, 1, 0, -41, 41);
    const falling = ball(2, 9, 0, -300, 165, false);
    expect(ids(openCats([small, falling]))).toEqual([1]);
    const boulder = { ...ball(3, 4, 0, -41 - 41 - 69, 69), kind: 'boulder' } as BallView;
    expect(ids(openCats([small, boulder]))).toEqual([]);
  });
});

describe('wantedTiers (GAME_DESIGN §8)', () => {
  const pool = [1, 2, 3, 4];

  it("wants the open cats' tiers within the pool", () => {
    expect(wantedTiers([3, 1, 7], [], pool)).toEqual([1, 3]);
    expect(wantedTiers([], [], pool)).toEqual([]);
  });

  it('lets each coming cat take a waiting partner, leaving the next tier', () => {
    // The 2 in the paw takes the open 2: a 3 is left waiting.
    expect(wantedTiers([2], [2], pool)).toEqual([3]);
    // Two open 1s: the coming 1 takes one of them, the other still waits.
    expect(wantedTiers([1, 1], [1], pool)).toEqual([1, 2]);
    // A 4 that took its partner leaves a 5, beyond the drops.
    expect(wantedTiers([4], [4], pool)).toEqual([]);
  });

  it('makes a coming cat without a partner wait for one, in order', () => {
    expect(wantedTiers([], [1], pool)).toEqual([1]);
    // The run's two opening 1s: the second takes the first.
    expect(wantedTiers([], [1, 1], pool)).toEqual([2]);
    expect(wantedTiers([4], [1, 1], pool)).toEqual([2, 4]);
  });
});

/** The size the run's third cat (NEXT after the first drop) rolls, with a 4 waiting or not. */
function thirdCat(seed: number, stage: number, waiting: boolean): number {
  const run = new RunController({ seed, stage });
  const first = stageInfo(stage).firstTier;
  if (waiting) run.spawnBall(first + 3, 200, -sizeRadius(4));
  for (let i = 0; i < 600 && !(run.canDrop && run.balls.every((b) => b.landedMs >= 0)); i++) {
    run.tick();
  }
  expect(run.drop(-250)).toBe(true);
  return run.next.tier - first + 1;
}

describe("The first stage's help in a run (GAME_DESIGN §8)", () => {
  it('leans NEXT towards a cat waiting on top of the jar at stage 1', () => {
    expect(MATCH_HELP_LAST_STAGE).toBe(1);
    let helped = 0;
    let plain = 0;
    for (let seed = 1; seed <= 400; seed++) {
      if (thirdCat(seed, 1, true) === 4) helped++;
      if (thirdCat(seed, 1, false) === 4) plain++;
    }
    // The opening 1s leave a 2 waiting either way; the 4 is wanted only with the cat there.
    expect(helped).toBeGreaterThan(2 * plain);
  });

  it('leaves the later stages to the seed alone', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(thirdCat(seed, 2, true)).toBe(thirdCat(seed, 2, false));
    }
  });
});
