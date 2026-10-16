import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { LIGHTNING_FREE_DROPS, LIGHTNING_HOLD_MS, LIGHTNING_SIZE } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import { DropQueue } from '../../src/core/dropQueue';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Rng } from '../../src/core/rng';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import { strikeChain, strikeTargets } from '../../src/physics/lightning';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';

const r = sizeRadius;
const HOLD_STEPS = stepsFor(LIGHTNING_HOLD_MS);

/** How far apart two balls of these sizes stand on the floor when they overlap by 2 units. */
function beside(a: number, b: number): number {
  const ra = r(a);
  const rb = r(b);
  return Math.sqrt((ra + rb - 2) ** 2 - (ra - rb) ** 2);
}

function setup(seed = 3) {
  const events = new EventBus<GameEvents>();
  const log: [keyof GameEvents, unknown][] = [];
  const types: (keyof GameEvents)[] = [
    'merged',
    'catPopped',
    'boulderBroken',
    'lightningStruck',
    'lightningDischarged',
    'specialPopped',
    'curseEnded',
    'runCoinsChanged',
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

describe('who a lightning ball strikes (GAME_DESIGN §15.15)', () => {
  it('strikes every cat of the tier it touched, golden ones too, the touched one first', () => {
    const world = new PhysicsWorld();
    const a = world.addBall({ tier: 3, x: -200, y: -r(3) });
    const other = world.addBall({ tier: 4, x: 0, y: -r(4) });
    const golden = world.addBall({ tier: 3, golden: true, x: 200, y: -r(3) });
    const touched = world.addBall({ tier: 3, x: 0, y: -300 });
    world.addBall({ kind: 'boulder', tier: 3, hits: 1, x: 100, y: -400 });
    expect(strikeTargets(touched, world.balls)).toEqual([touched, a, golden]);
    expect(strikeTargets(touched, world.balls)).not.toContain(other);
  });

  it('strikes every boulder when it touched a boulder, whatever its size', () => {
    const world = new PhysicsWorld();
    const big = world.addBall({ kind: 'boulder', tier: 5, hits: 3, x: -200, y: -r(5) });
    world.addBall({ tier: 2, x: 0, y: -r(2) });
    const touched = world.addBall({ kind: 'boulder', tier: 2, hits: 1, x: 200, y: -r(2) });
    expect(strikeTargets(touched, world.balls)).toEqual([touched, big]);
  });

  it('chains from the ball to each next-nearest struck ball, branching where it must', () => {
    // The ball, the cat it touches, two cats to its right in a row and one far to its left.
    const points = [
      { x: 0, y: 0, radius: 10 },
      { x: 25, y: 0, radius: 10 },
      { x: 50, y: 0, radius: 10 },
      { x: 75, y: 0, radius: 10 },
      { x: -100, y: 0, radius: 10 },
    ];
    expect(strikeChain(points)).toEqual([
      { from: 0, to: 1, depth: 1 },
      { from: 1, to: 2, depth: 2 },
      { from: 2, to: 3, depth: 3 },
      { from: 0, to: 4, depth: 1 },
    ]);
    expect(strikeChain(points.slice(0, 1))).toEqual([]);
  });

  it('measures the jump edge to edge, so a big cat close by is reached before a small one', () => {
    const points = [
      { x: 0, y: 0, radius: 10 },
      { x: 100, y: 0, radius: 10 },
      { x: -150, y: 0, radius: 120 },
    ];
    expect(strikeChain(points).map((l) => l.to)).toEqual([2, 1]);
  });
});

describe('the lightning ball in the queue (GAME_DESIGN §15.1)', () => {
  const odds = {
    tiltLevel: 0,
    magnetChance: 0,
    boulderChance: 0,
    goldenChance: 0,
    hanabiChance: 0,
    jokerChance: 0,
    lightningChance: 1,
    katanaChance: 0,
    boulderSize: 2,
    boulderHits: 1,
  };

  it('comes only after a stage’s first drops, and as a cat at a stage clear', () => {
    const queue = new DropQueue({ rng: new Rng(1), specialRng: new Rng(2), stage: 1, odds });
    const kinds: string[] = [];
    for (let i = 0; i < LIGHTNING_FREE_DROPS + 4; i++) kinds.push(queue.take().kind);
    // None until the stage's 20th drop is out: the first that can be one is the 22nd ball.
    expect(kinds.slice(0, LIGHTNING_FREE_DROPS + 1)).not.toContain('lightning');
    expect(kinds.slice(LIGHTNING_FREE_DROPS + 1)).toEqual(['lightning', 'lightning', 'lightning']);
    expect(queue.current).toEqual({
      kind: 'lightning',
      tier: LIGHTNING_SIZE,
      golden: false,
      hits: 0,
    });
    queue.newStage();
    expect(queue.current).toEqual({ kind: 'cat', tier: 1, golden: false, hits: 0 });
    expect(queue.next.kind).toBe('cat');
  });

  it('is rolled after the joker, so seeds without it drop what they always did', () => {
    const plain = new DropQueue({
      rng: new Rng(5),
      specialRng: new Rng(6),
      stage: 2,
      odds: { ...odds, lightningChance: 0, katanaChance: 0, jokerChance: 0.3, boulderChance: 0.2 },
    });
    const withIt = new DropQueue({
      rng: new Rng(5),
      specialRng: new Rng(6),
      stage: 2,
      odds: {
        ...odds,
        lightningChance: 0.1,
        katanaChance: 0,
        jokerChance: 0.3,
        boulderChance: 0.2,
      },
    });
    for (let i = 0; i < 60; i++) {
      const a = plain.take();
      const b = withIt.take();
      if (b.kind === 'lightning') expect(a.kind).toBe('cat');
      else expect(b).toEqual(a);
    }
  });
});

describe('a lightning strike in a run (GAME_DESIGN §15.15)', () => {
  it('holds time still, then pops every cat of the size it touched into its value', () => {
    const { run, of } = setup();
    const a = run.spawnBall(3, -250, -r(3));
    const b = run.spawnBall(3, 250, -r(3));
    const keep = run.spawnBall(4, 100, -r(4));
    const touched = run.spawnBall(3, -100, -r(3));
    ticks(run, 2);
    const bolt = run.spawnBall(LIGHTNING_SIZE, -100, -2 * r(3) - r(2) + 1, { kind: 'lightning' });
    run.tick();
    expect(of('lightningStruck')).toEqual([
      {
        id: bolt.id,
        struck: touched.id,
        kind: 'cat',
        tier: 3,
        targets: [touched.id, a.id, b.id],
        at: expect.any(Object),
        holdMs: HOLD_STEPS * PHYSICS_STEP_MS,
      },
    ]);
    expect(run.lightning).toMatchObject({ id: bolt.id, kind: 'cat', tier: 3, elapsedMs: 0 });
    // Nothing moves and nothing can drop while it holds.
    const time = run.playTimeMs;
    const where = run.balls.map((ball) => [ball.x, ball.y]);
    ticks(run, HOLD_STEPS - 1);
    expect(run.playTimeMs).toBe(time);
    expect(run.balls.map((ball) => [ball.x, ball.y])).toEqual(where);
    expect(run.canDrop).toBe(false);
    expect(of('catPopped')).toEqual([]);
    run.tick();
    expect(run.lightning).toBeNull();
    const coins = 2; // C(3) / 2 = 1.5, rounded up.
    expect(of('catPopped')).toEqual(
      [touched, a, b].map((cat) => ({
        id: cat.id,
        tier: 3,
        at: expect.any(Object),
        coins,
        reason: 'lightning',
      })),
    );
    expect(of('lightningDischarged')).toEqual([
      { id: bolt.id, tier: 3, at: expect.any(Object), count: 3 },
    ]);
    expect(run.balls).toEqual([keep]);
    expect(run.coins).toBe(3 * coins);
    expect(run.score).toBe(0);
    expect(of('merged')).toEqual([]);
    expect(run.canDrop).toBe(true);
  });

  it('breaks every boulder when it touches one, paying nothing', () => {
    const { run, of } = setup();
    const near = run.spawnBall(2, 0, -r(2), { kind: 'boulder', hits: 3 });
    const far = run.spawnBall(5, 200, -r(5), { kind: 'boulder', hits: 1 });
    const cat = run.spawnBall(2, -200, -r(2));
    ticks(run, 2);
    run.spawnBall(LIGHTNING_SIZE, 0, -3 * r(2) + 1, { kind: 'lightning' });
    ticks(run, 1 + HOLD_STEPS);
    expect(of('boulderBroken')).toEqual([
      { id: near.id, tier: 2, at: expect.any(Object), reason: 'lightning' },
      { id: far.id, tier: 5, at: expect.any(Object), reason: 'lightning' },
    ]);
    expect(run.balls).toEqual([cat]);
    expect(run.coins).toBe(0);
  });

  it('waits on the floor until a cat touches it', () => {
    const { run, of } = setup();
    const bolt = run.spawnBall(LIGHTNING_SIZE, 0, -r(2), { kind: 'lightning' });
    ticks(run, 30);
    expect(bolt.landedMs).toBeGreaterThanOrEqual(0);
    expect(of('lightningStruck')).toEqual([]);
    expect(run.takeable(bolt)).toBe(true);
    const cat = run.spawnBall(1, 0, -2 * r(2) - r(1) - 40);
    for (let i = 0; i < 120 && of('lightningStruck').length === 0; i++) run.tick();
    expect(of('lightningStruck')[0]).toMatchObject({ struck: cat.id, tier: 1 });
  });

  it('leaves hanabi, jokers and other lightning balls alone', () => {
    const { run, of } = setup();
    run.spawnBall(LIGHTNING_SIZE, -60, -r(2), { kind: 'lightning' });
    run.spawnBall(LIGHTNING_SIZE, -60 + beside(2, 2), -r(2), { kind: 'lightning' });
    run.spawnBall(2, 60 + beside(2, 2), -r(2), { kind: 'joker' });
    ticks(run, 30);
    expect(of('lightningStruck')).toEqual([]);
    expect(of('merged')).toEqual([]);
  });

  it('ends a curse on a cat it strikes', () => {
    const { run, of } = setup();
    const cursed = run.spawnBall(2, -100, -r(2));
    run.spawnBall(2, 150, -r(2));
    ticks(run, 2);
    expect(run.curseCat(cursed.id, 5)).toBe(true);
    run.spawnBall(LIGHTNING_SIZE, -100, -3 * r(2) + 1, { kind: 'lightning' });
    ticks(run, 1 + HOLD_STEPS);
    expect(of('curseEnded')).toEqual([{ id: cursed.id, reason: 'gone', bonus: 0 }]);
    expect(run.curse).toBeNull();
  });

  it('freezes with a pause and goes on where it was', () => {
    const { run } = setup();
    run.spawnBall(1, 0, -r(1));
    ticks(run, 2);
    run.spawnBall(LIGHTNING_SIZE, 0, -2 * r(1) - r(2) + 1, { kind: 'lightning' });
    ticks(run, 5);
    run.pause();
    ticks(run, HOLD_STEPS * 2);
    expect(run.lightning).not.toBeNull();
    run.resume();
    ticks(run, HOLD_STEPS);
    expect(run.lightning).toBeNull();
    expect(run.balls).toEqual([]);
  });

  it('vanishes with a stage clear’s pops, paying nothing', () => {
    const { run, of } = setup();
    const bolt = run.spawnBall(LIGHTNING_SIZE, 250, -r(2), { kind: 'lightning' });
    ticks(run, 5);
    run.spawnBall(8, -150, -r(8));
    run.spawnBall(8, -150, -3 * r(8));
    const last = stageInfo(1).lastTier;
    for (let i = 0; i < 240 && !of('merged').some((m) => m.newTier === last); i++) run.tick();
    expect(of('specialPopped')).toEqual([
      { id: bolt.id, kind: 'lightning', tier: 2, at: expect.any(Object), reason: 'cashOut' },
    ]);
  });

  it('can be put in the paw and dropped', () => {
    const { run } = setup();
    ticks(run, 60);
    run.giveSpecial('lightning');
    expect(run.current).toEqual({
      kind: 'lightning',
      tier: LIGHTNING_SIZE,
      golden: false,
      hits: 0,
    });
    expect(run.drop(0)).toBe(true);
    expect(run.balls.at(-1)?.kind).toBe('lightning');
  });

  it('comes back from a saved run in the middle of a strike, and plays on the same', () => {
    const recordsBefore = { bestScore: 0, bestStage: 1, highestTier: 0 };
    const play = (save: boolean): string => {
      const { run } = setup(11);
      run.spawnBall(3, -200, -r(3));
      run.spawnBall(3, 200, -r(3));
      run.spawnBall(3, 0, -r(3));
      run.spawnBall(2, 120, -r(2), { kind: 'boulder', hits: 2 });
      ticks(run, 2);
      run.spawnBall(LIGHTNING_SIZE, 0, -2 * r(3) - r(2) + 1, { kind: 'lightning' });
      ticks(run, 10);
      expect(run.lightning).not.toBeNull();
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
        expect(current.lightning).toEqual(run.lightning);
      }
      ticks(current, 150);
      return current.stateHash();
    };
    expect(play(true)).toBe(play(false));
  });

  it('refuses a saved strike whose balls are gone', () => {
    const { run } = setup();
    run.spawnBall(1, 0, -r(1));
    ticks(run, 2);
    run.spawnBall(LIGHTNING_SIZE, 0, -2 * r(1) - r(2) + 1, { kind: 'lightning' });
    ticks(run, 3);
    const snapshot = run.snapshot()!;
    const broken = { ...snapshot, lightning: { ...snapshot.lightning!, id: 999 } };
    expect(() => RunController.restore(broken)).toThrow(RangeError);
  });
});
