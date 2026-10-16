import { describe, expect, it } from 'vitest';
import { FROG_FREE_DROPS, FROG_MAX_SIZE, FROG_MEALS, FROG_SIZE } from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { sizeRadius } from '../../src/config/tiers';
import { DropQueue, PLAIN_ODDS } from '../../src/core/dropQueue';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import {
  defaultPickLevels,
  dropOdds,
  frogBites,
  frogChance,
  frogMeals,
} from '../../src/core/picks';
import { Rng } from '../../src/core/rng';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { BallView } from '../../src/physics/balls';
import { countsForDanger, luckySaveVictims } from '../../src/physics/danger';
import { frogMeal } from '../../src/physics/frog';
import { RunController } from '../../src/run/RunController';

const r = sizeRadius;
const levels = (over: Partial<Record<PickId, number>> = {}) => ({
  ...defaultPickLevels(),
  ...over,
});

function setup(seed = 3) {
  const events = new EventBus<GameEvents>();
  const log: [keyof GameEvents, unknown][] = [];
  const types: (keyof GameEvents)[] = [
    'catDropped',
    'frogSwallowed',
    'frogLeft',
    'catPopped',
    'specialPopped',
    'curseEnded',
    'merged',
  ];
  for (const type of types) events.on(type, (payload) => log.push([type, payload]));
  const run = new RunController({ seed, events });
  const of = <K extends keyof GameEvents>(type: K): GameEvents[K][] =>
    log.filter((e) => e[0] === type).map((e) => e[1] as GameEvents[K]);
  return { run, of };
}

function ticks(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) run.tick();
}

/** Ticks until the dropper is ready and drops whatever it holds at `x`. */
function dropAt(run: RunController, x: number): void {
  for (let i = 0; i < 400 && !run.canDrop; i++) run.tick();
  expect(run.drop(x)).toBe(true);
}

/** A frog resting on the floor at `x` with `meals` left. */
function frogAt(run: RunController, x: number, meals = 5): BallView {
  return run.spawnBall(FROG_SIZE, x, -r(FROG_SIZE), { kind: 'frog', hits: meals });
}

describe("the frog's meal (GAME_DESIGN §15.17)", () => {
  const ball = (id: number, size: number, x: number, over: Partial<BallView> = {}): BallView =>
    ({ id, kind: 'cat', size, tier: size, x, y: 0, landedMs: 0, radius: 40, ...over }) as BallView;
  const frog = ball(1, 3, 0, { kind: 'frog' });

  it('takes the smallest landed cats, the nearest first between equals', () => {
    const balls = [
      frog,
      ball(2, 2, 50),
      ball(3, 1, 300),
      ball(4, 1, -100),
      ball(5, 1, 10, { landedMs: -1 }),
      ball(6, 1, 20, { kind: 'boulder' }),
      ball(7, 1, 30, { kind: 'hanabi' }),
    ];
    expect(frogMeal(frog, balls, 1).map((b) => b.id)).toEqual([4]);
    expect(frogMeal(frog, balls, 2).map((b) => b.id)).toEqual([4, 3]);
    expect(frogMeal(frog, balls, 9).map((b) => b.id)).toEqual([4, 3, 2]);
    expect(frogMeal(frog, [frog], 2)).toEqual([]);
  });

  it('never eats a cat bigger than size 2 (v0.56.1)', () => {
    expect(FROG_MAX_SIZE).toBe(2);
    const balls = [frog, ball(2, 3, 10), ball(3, 4, 20), ball(4, 2, 300)];
    expect(frogMeal(frog, balls, 3).map((b) => b.id)).toEqual([4]);
    expect(frogMeal(frog, [frog, ball(5, 3, 10)], 1)).toEqual([]);
  });

  it('never counts for the danger line, nor goes with a Lucky Save', () => {
    const over = ball(8, 3, 0, { kind: 'frog', y: -2000, landedMs: 0 });
    expect(countsForDanger(over, 10_000)).toBe(false);
    expect(luckySaveVictims([over], -1000)).toEqual([]);
  });
});

describe('the frog in the queue (GAME_DESIGN §15.1)', () => {
  const odds = { ...PLAIN_ODDS, frogChance: 1, frogMeals: 7 };

  it('comes only after a stage’s first drops with its meals, and as a cat at a stage clear', () => {
    const queue = new DropQueue({ rng: new Rng(1), specialRng: new Rng(2), stage: 1, odds });
    const kinds: string[] = [];
    for (let i = 0; i < FROG_FREE_DROPS + 3; i++) kinds.push(queue.take().kind);
    expect(kinds.slice(0, FROG_FREE_DROPS + 1)).not.toContain('frog');
    expect(kinds.slice(FROG_FREE_DROPS + 1)).toEqual(['frog', 'frog']);
    expect(queue.current).toEqual({ kind: 'frog', tier: FROG_SIZE, golden: false, hits: 7 });
    queue.newStage();
    expect(queue.current).toEqual({ kind: 'cat', tier: 1, golden: false, hits: 0 });
  });

  it('is rolled last, so seeds without it drop what they always did', () => {
    const base = { ...PLAIN_ODDS, jokerChance: 0.3, boulderChance: 0.2, katanaChance: 0.1 };
    const plain = new DropQueue({ rng: new Rng(5), specialRng: new Rng(6), stage: 2, odds: base });
    const withIt = new DropQueue({
      rng: new Rng(5),
      specialRng: new Rng(6),
      stage: 2,
      odds: { ...base, frogChance: 0.1 },
    });
    for (let i = 0; i < 80; i++) {
      const a = plain.take();
      const b = withIt.take();
      if (b.kind === 'frog') expect(a.kind).toBe('cat');
      else expect(b).toEqual(a);
    }
  });

  it('comes once the Frog is taken, more often with Quick Frog; Long Stay and Big Gulp', () => {
    expect(frogChance(levels({ quickFrog: 2 }))).toBe(0);
    expect(frogChance(levels({ frog: 1 }))).toBeCloseTo(0.0225, 12);
    expect(frogChance(levels({ frog: 1, quickFrog: 2 }))).toBeCloseTo(0.0675, 12);
    expect([0, 1, 2].map((longStay) => frogMeals(levels({ longStay })))).toEqual([...FROG_MEALS]);
    expect(frogBites(levels())).toBe(1);
    expect(frogBites(levels({ bigGulp: 1 }))).toBe(2);
    expect(dropOdds(levels({ frog: 1, longStay: 1 }), 1, 0).frogMeals).toBe(7);
  });
});

describe('a frog in a run (GAME_DESIGN §15.17)', () => {
  it('swallows the smallest cat each time a ball leaves the paw, paying its value', () => {
    const { run, of } = setup();
    const frog = frogAt(run, -150);
    const small = run.spawnBall(1, 200, -r(1));
    const bigger = run.spawnBall(3, 60, -r(3));
    ticks(run, 3);
    dropAt(run, 250);
    expect(of('frogSwallowed')).toEqual([
      { id: frog.id, cat: small.id, tier: 1, at: expect.any(Object), mealsLeft: 4 },
    ]);
    // Popped into its value: coins, no score.
    expect(of('catPopped')).toEqual([
      { id: small.id, tier: 1, at: expect.any(Object), coins: run.coins, reason: 'frog' },
    ]);
    expect(run.score).toBe(0);
    expect(run.balls.map((b) => b.id)).not.toContain(small.id);
    expect(run.balls.find((b) => b.id === frog.id)?.hitsLeft).toBe(4);
    // The cat just dropped is still falling and the size 3 is too big (GAME_DESIGN §15.17, v0.56.1):
    // no meal, and none counted.
    dropAt(run, -250);
    expect(of('frogSwallowed')).toHaveLength(1);
    expect(run.balls.map((b) => b.id)).toContain(bigger.id);
    expect(run.balls.find((b) => b.id === frog.id)?.hitsLeft).toBe(4);
  });

  it("doesn't eat at its own drop, and a jar with no landed cat feeds nothing", () => {
    const { run, of } = setup();
    for (let i = 0; i < 400 && !run.canDrop; i++) run.tick();
    run.giveSpecial('frog');
    dropAt(run, 0);
    expect(of('catDropped').at(-1)).toMatchObject({ kind: 'frog' });
    expect(run.balls.find((b) => b.kind === 'frog')?.hitsLeft).toBe(FROG_MEALS[0]);
    expect(of('frogSwallowed')).toEqual([]);
    // The next drop: nothing else has landed, so the meal waits and isn't counted.
    dropAt(run, 200);
    expect(of('frogSwallowed')).toEqual([]);
    expect(run.balls.find((b) => b.kind === 'frog')?.hitsLeft).toBe(FROG_MEALS[0]);
  });

  it('falls asleep and goes after its last meal', () => {
    const { run, of } = setup();
    const frog = frogAt(run, 0, 2);
    for (const x of [-250, -150, 150, 250]) run.spawnBall(1, x, -r(1));
    ticks(run, 3);
    dropAt(run, 260);
    dropAt(run, -260);
    expect(of('frogSwallowed').map((m) => m.mealsLeft)).toEqual([1, 0]);
    expect(of('frogLeft')).toEqual([{ id: frog.id, tier: FROG_SIZE, at: expect.any(Object) }]);
    expect(run.balls.some((b) => b.id === frog.id)).toBe(false);
  });

  it('swallows two cats at a meal with Big Gulp, counting one meal', () => {
    const { run, of } = setup();
    run.setPickLevel('frog', 1);
    run.setPickLevel('bigGulp', 1);
    const frog = frogAt(run, 0);
    const a = run.spawnBall(1, -250, -r(1));
    const b = run.spawnBall(1, 250, -r(1));
    run.spawnBall(4, -120, -r(4));
    ticks(run, 3);
    dropAt(run, 200);
    expect(
      of('frogSwallowed')
        .map((m) => m.cat)
        .sort(),
    ).toEqual([a.id, b.id].sort());
    expect(run.balls.find((x) => x.id === frog.id)?.hitsLeft).toBe(4);
  });

  it('gives a frog dropped from the paw its Long Stay meals', () => {
    const { run } = setup();
    run.setPickLevel('frog', 1);
    run.setPickLevel('longStay', 2);
    for (let i = 0; i < 400 && !run.canDrop; i++) run.tick();
    run.giveSpecial('frog');
    expect(run.current).toMatchObject({ kind: 'frog', hits: 9 });
  });

  it('ends a curse whose cat it swallows', () => {
    const { run, of } = setup();
    frogAt(run, 0);
    const cursed = run.spawnBall(1, 200, -r(1));
    run.spawnBall(3, -200, -r(3));
    ticks(run, 3);
    expect(run.curseCat(cursed.id, 5)).toBe(true);
    dropAt(run, -250);
    expect(of('frogSwallowed').map((m) => m.cat)).toEqual([cursed.id]);
    expect(of('curseEnded')).toEqual([{ id: cursed.id, reason: 'gone', bonus: 0 }]);
  });

  it('goes with a stage clear, paying nothing', () => {
    const { run, of } = setup();
    const frog = frogAt(run, 200);
    ticks(run, 3);
    run.jumpToStage(2);
    expect(of('specialPopped')).toContainEqual(
      expect.objectContaining({ id: frog.id, kind: 'frog', reason: 'cashOut' }),
    );
  });

  it('keeps its meals left when the magnet takes it', () => {
    const { run } = setup();
    const frog = frogAt(run, 0, 3);
    ticks(run, 3);
    for (let i = 0; i < 400 && !run.canDrop; i++) run.tick();
    run.giveSpecial('magnet');
    ticks(run, 2);
    expect(run.take(frog.id)).toBe(true);
    expect(run.current).toMatchObject({ kind: 'frog', hits: 3 });
  });

  it('comes back from a saved run with its meals, and plays on the same', () => {
    const recordsBefore = { bestScore: 0, bestStage: 1, highestTier: 0 };
    const play = (save: boolean): string => {
      const { run } = setup(11);
      frogAt(run, -100, 4);
      for (const x of [-250, 150, 250]) run.spawnBall(1, x, -r(1));
      ticks(run, 3);
      dropAt(run, 200);
      let current = run;
      if (save) {
        const text = JSON.stringify({
          version: RUN_SAVE_VERSION,
          save: { run: run.snapshot(), recordsBefore },
        });
        const decoded = decodeRunSave(text);
        if (!('save' in decoded)) throw new Error(decoded.error);
        current = RunController.restore(decoded.save.run);
        current.resume();
        expect(current.balls.find((b) => b.kind === 'frog')?.hitsLeft).toBe(3);
      }
      dropAt(current, -200);
      ticks(current, 100);
      return current.stateHash();
    };
    expect(play(true)).toBe(play(false));
  });
});
