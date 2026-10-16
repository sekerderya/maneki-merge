import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import {
  KATANA_FALL_MS,
  KATANA_FREE_DROPS,
  KATANA_GRACE,
  KATANA_SIZE,
} from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import { DropQueue, PLAIN_ODDS } from '../../src/core/dropQueue';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { defaultPickLevels, katanaChance } from '../../src/core/picks';
import { Rng } from '../../src/core/rng';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import { jarGeometry } from '../../src/physics/geometry';
import { bladePoint, katanaBlades, katanaCuts, segmentDistance } from '../../src/physics/katana';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';

const r = sizeRadius;
const FALL_STEPS = stepsFor(KATANA_FALL_MS);
const geo = jarGeometry(1);

function setup(seed = 3) {
  const events = new EventBus<GameEvents>();
  const log: [keyof GameEvents, unknown][] = [];
  const types: (keyof GameEvents)[] = [
    'catDropped',
    'katanaDropped',
    'katanaCut',
    'katanaLanded',
    'catPopped',
    'boulderBroken',
    'hanabiExploded',
    'merged',
    'curseEnded',
  ];
  for (const type of types) events.on(type, (payload) => log.push([type, payload]));
  const run = new RunController({ seed, events });
  const of = <K extends keyof GameEvents>(type: K): GameEvents[K][] =>
    log.filter((e) => e[0] === type).map((e) => e[1] as GameEvents[K]);
  return { run, of, log };
}

function ticks(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) run.tick();
}

/** Ticks until the dropper is ready, puts a katana in it and drops it at `x`. */
function dropKatana(run: RunController, x: number): void {
  for (let i = 0; i < 200 && !run.canDrop; i++) run.tick();
  run.giveSpecial('katana');
  expect(run.drop(x)).toBe(true);
}

describe("the katana's blades (GAME_DESIGN §15.16)", () => {
  it('falls straight down from the paw to the floor, then adds a diagonal, an X and one across', () => {
    const w = geo.halfWidth;
    const rim = geo.rimY;
    expect(katanaBlades(100, -1000, 0, geo)).toEqual([{ x0: 100, y0: -1000, x1: 100, y1: 0 }]);
    // Aimed right of the middle: the first diagonal starts at the top right corner.
    expect(katanaBlades(100, -1000, 3, geo)).toEqual([
      { x0: 100, y0: -1000, x1: 100, y1: 0 },
      { x0: w, y0: rim, x1: -w, y1: 0 },
      { x0: -w, y0: rim, x1: w, y1: 0 },
      { x0: w, y0: rim / 2, x1: -w, y1: rim / 2 },
    ]);
    // Aimed left: the top left corner first, and the one across from the left.
    const left = katanaBlades(-100, -1000, 3, geo);
    expect(left[1]).toEqual({ x0: -w, y0: rim, x1: w, y1: 0 });
    expect(left[3]).toEqual({ x0: -w, y0: rim / 2, x1: w, y1: rim / 2 });
    expect(katanaBlades(0, -1000, 1, geo)).toHaveLength(2);
    expect(katanaBlades(0, -1000, 9, geo)).toHaveLength(4);
  });

  it('runs its point along its line', () => {
    const blade = { x0: 0, y0: -800, x1: 200, y1: 0 };
    expect(bladePoint(blade, 0)).toEqual({ x: 0, y: -800 });
    expect(bladePoint(blade, 0.5)).toEqual({ x: 100, y: -400 });
    expect(bladePoint(blade, 2)).toEqual({ x: 200, y: 0 });
    expect(segmentDistance(5, -400, 0, -800, 0, 0)).toBe(5);
    expect(segmentDistance(0, 30, 0, -800, 0, 0)).toBe(30);
  });

  it('cuts the small cats and the boulders the line has reached, and lets the rest through', () => {
    const world = new PhysicsWorld();
    const small = world.addBall({ tier: 4, x: 0, y: -600 });
    const low = world.addBall({ tier: 1, x: 20, y: -r(1) });
    const big = world.addBall({ tier: 6, x: 0, y: -300 });
    const boulder = world.addBall({ kind: 'boulder', tier: 5, hits: 4, x: -30, y: -r(5) - 200 });
    world.addBall({ kind: 'hanabi', tier: 2, x: 0, y: -450 });
    world.addBall({ kind: 'joker', tier: 2, x: 0, y: -800 });
    world.addBall({ kind: 'lightning', tier: 2, x: 0, y: -720 });
    // Beside the line, past its reach.
    world.addBall({ tier: 2, x: r(2) + 20, y: -150 });
    const blade = [{ x0: 0, y0: -1000, x1: 0, y1: 0 }];
    // Half way down: only the cat at −600 has been reached.
    const half = katanaCuts(blade, 0.5, world.balls, 8);
    expect(half.cats.map((c) => c.ball)).toEqual([small]);
    expect(half.boulders).toEqual([]);
    const all = katanaCuts(blade, 1, world.balls, 8);
    expect(all.cats.map((c) => c.ball)).toEqual([small, low]);
    expect(all.boulders).toEqual([{ ball: boulder, blade: 0 }]);
    expect(all.cats.map((c) => c.ball)).not.toContain(big);
  });

  it('reaches further with Wide Blade', () => {
    const world = new PhysicsWorld();
    // 20 units past a size-2 cat's edge.
    const cat = world.addBall({ tier: 2, x: r(2) + 20, y: -r(2) });
    const blade = [{ x0: 0, y0: -1000, x1: 0, y1: 0 }];
    expect(katanaCuts(blade, 1, world.balls, KATANA_GRACE[0]).cats).toEqual([]);
    expect(katanaCuts(blade, 1, world.balls, KATANA_GRACE[1]).cats).toEqual([
      { ball: cat, blade: 0 },
    ]);
  });
});

describe('the katana in the queue (GAME_DESIGN §15.1)', () => {
  const odds = { ...PLAIN_ODDS, katanaChance: 1 };

  it('comes only after a stage’s first drops, and as a cat at a stage clear', () => {
    const queue = new DropQueue({ rng: new Rng(1), specialRng: new Rng(2), stage: 1, odds });
    const kinds: string[] = [];
    for (let i = 0; i < KATANA_FREE_DROPS + 4; i++) kinds.push(queue.take().kind);
    expect(kinds.slice(0, KATANA_FREE_DROPS + 1)).not.toContain('katana');
    expect(kinds.slice(KATANA_FREE_DROPS + 1)).toEqual(['katana', 'katana', 'katana']);
    expect(queue.current).toEqual({ kind: 'katana', tier: KATANA_SIZE, golden: false, hits: 0 });
    queue.newStage();
    expect(queue.current).toEqual({ kind: 'cat', tier: 1, golden: false, hits: 0 });
  });

  it('is rolled last, so seeds without it drop what they always did', () => {
    const base = { ...PLAIN_ODDS, jokerChance: 0.3, boulderChance: 0.2, lightningChance: 0.1 };
    const plain = new DropQueue({ rng: new Rng(5), specialRng: new Rng(6), stage: 2, odds: base });
    const withIt = new DropQueue({
      rng: new Rng(5),
      specialRng: new Rng(6),
      stage: 2,
      odds: { ...base, katanaChance: 0.1 },
    });
    for (let i = 0; i < 80; i++) {
      const a = plain.take();
      const b = withIt.take();
      if (b.kind === 'katana') expect(a.kind).toBe('cat');
      else expect(b).toEqual(a);
    }
  });

  it('comes only once the Katana is taken, more often with Quick Katana', () => {
    const levels = (over: Partial<Record<PickId, number>>) => ({ ...defaultPickLevels(), ...over });
    expect(katanaChance(levels({ quickKatana: 2 }))).toBe(0);
    expect(katanaChance(levels({ katana: 1 }))).toBeCloseTo(0.0225, 12);
    expect(katanaChance(levels({ katana: 1, quickKatana: 2 }))).toBeCloseTo(0.0675, 12);
  });
});

describe('a katana in a run (GAME_DESIGN §15.16)', () => {
  it('falls for 0.24 s, cutting the small cats in its line into their value as it reaches them', () => {
    const { run, of } = setup();
    const top = run.spawnBall(3, 0, -500);
    const bottom = run.spawnBall(2, 10, -r(2));
    const big = run.spawnBall(6, -200, -r(6));
    const side = run.spawnBall(1, 220, -r(1));
    ticks(run, 2);
    dropKatana(run, 0);
    expect(of('catDropped').at(-1)).toMatchObject({ kind: 'katana' });
    expect(of('katanaDropped')).toEqual([
      {
        x: 0,
        blades: [expect.objectContaining({ x0: 0, x1: 0, y1: 0 })],
        fallMs: FALL_STEPS * PHYSICS_STEP_MS,
      },
    ]);
    expect(run.katana).toMatchObject({ x: 0, elapsedMs: 0, fallMs: FALL_STEPS * PHYSICS_STEP_MS });
    // The katana is no ball: the jar holds what it held.
    expect(run.balls).toHaveLength(4);
    ticks(run, Math.ceil(FALL_STEPS * 0.55));
    // The upper cat first.
    expect(of('katanaCut').map((c) => c.id)).toEqual([top.id]);
    ticks(run, FALL_STEPS);
    expect(run.katana).toBeNull();
    expect(of('katanaCut').map((c) => c.id)).toEqual([top.id, bottom.id]);
    expect(of('katanaCut')[0]).toMatchObject({ kind: 'cat', tier: 3, blade: 0 });
    expect(of('katanaCut')[0]?.angle).toBeCloseTo(Math.PI / 2, 12);
    expect(of('katanaLanded')).toHaveLength(1);
    // Popped into their value: coins, no score, no merge.
    expect(of('catPopped')).toEqual([
      { id: top.id, tier: 3, at: expect.any(Object), coins: 2, reason: 'katana' },
      { id: bottom.id, tier: 2, at: expect.any(Object), coins: 1, reason: 'katana' },
    ]);
    expect(run.coins).toBe(3);
    expect(run.score).toBe(0);
    expect(run.balls.map((b) => b.id).sort()).toEqual([big.id, side.id].sort());
  });

  it('goes through a big cat, breaks a banded boulder at once and lets a hanabi through', () => {
    const { run, of } = setup();
    const big = run.spawnBall(7, 0, -r(7));
    const boulder = run.spawnBall(3, 0, -2 * r(7) - r(3), { kind: 'boulder', hits: 4 });
    const hanabi = run.spawnBall(2, 0, -2 * r(7) - 2 * r(3) - r(2) - 30, { kind: 'hanabi' });
    dropKatana(run, 0);
    ticks(run, FALL_STEPS + 1);
    expect(of('boulderBroken')).toEqual([
      { id: boulder.id, tier: 3, at: expect.any(Object), reason: 'katana' },
    ]);
    expect(of('hanabiExploded')).toEqual([]);
    expect(run.balls.map((b) => b.id)).toContain(big.id);
    expect(run.balls.map((b) => b.id)).toContain(hanabi.id);
  });

  it('cuts along its X with More Blades', () => {
    const { run, of } = setup();
    run.setPickLevel('katana', 1);
    run.setPickLevel('moreBlades', 2);
    // In the bottom corners, on the diagonals, and one under the aim.
    const left = run.spawnBall(1, -260, -r(1));
    const right = run.spawnBall(1, 260, -r(1));
    const middle = run.spawnBall(1, 0, -r(1));
    dropKatana(run, 0);
    expect(run.katana?.blades).toHaveLength(3);
    ticks(run, FALL_STEPS + 1);
    // Aimed right of the middle: the first diagonal runs from the top right to the bottom left.
    const blade = Object.fromEntries(of('katanaCut').map((c) => [c.id, c.blade]));
    expect(blade).toEqual({ [middle.id]: 0, [left.id]: 1, [right.id]: 2 });
    expect(of('katanaLanded')[0]?.blades).toHaveLength(3);
  });

  it('cuts a cursed small cat like any other, and the curse ends with it', () => {
    const { run, of } = setup();
    const cursed = run.spawnBall(2, 0, -r(2));
    run.spawnBall(2, 200, -r(2));
    ticks(run, 2);
    expect(run.curseCat(cursed.id, 5)).toBe(true);
    dropKatana(run, 0);
    ticks(run, FALL_STEPS + 1);
    expect(of('katanaCut').map((c) => c.id)).toEqual([cursed.id]);
    expect(of('curseEnded')).toEqual([{ id: cursed.id, reason: 'gone', bonus: 0 }]);
  });

  it('is swept away by a stage clear', () => {
    const { run } = setup();
    dropKatana(run, 200);
    ticks(run, 3);
    expect(run.katana).not.toBeNull();
    run.jumpToStage(2);
    expect(run.katana).toBeNull();
  });

  it('comes back from a saved run in the middle of its fall, and plays on the same', () => {
    const recordsBefore = { bestScore: 0, bestStage: 1, highestTier: 0 };
    const play = (save: boolean): string => {
      const { run } = setup(11);
      run.spawnBall(3, -10, -r(3));
      run.spawnBall(2, 0, -400);
      run.spawnBall(4, 200, -r(4), { kind: 'boulder', hits: 2 });
      ticks(run, 2);
      run.setPickLevel('katana', 1);
      run.setPickLevel('moreBlades', 3);
      dropKatana(run, 30);
      ticks(run, 8);
      expect(run.katana).not.toBeNull();
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
        expect(current.katana).toEqual(run.katana);
      }
      ticks(current, 150);
      return current.stateHash();
    };
    expect(play(true)).toBe(play(false));
  });

  it('pays out by the stage it is played in', () => {
    const { run, of } = setup();
    run.jumpToStage(2);
    for (let i = 0; i < 2000 && run.state !== 'playing'; i++) run.tick();
    const first = stageInfo(2).firstTier;
    run.spawnBall(first + 3, 0, -r(4));
    dropKatana(run, 0);
    ticks(run, FALL_STEPS + 1);
    expect(of('catPopped').at(-1)).toMatchObject({ tier: first + 3, reason: 'katana' });
  });
});
