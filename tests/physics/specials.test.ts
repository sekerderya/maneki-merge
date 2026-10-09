import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS } from '../../src/config/physics';
import { HANABI_FUSE_MS, HANABI_PUSH_SPEED, HANABI_REACH } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { decodeRunSave } from '../../src/core/runSave';
import type { BallView } from '../../src/physics/balls';
import { hanabiBlast } from '../../src/physics/hanabi';
import { MergeResolver } from '../../src/physics/merges';
import type { MergeOutcome } from '../../src/physics/merges';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';

const CAP_1 = stageInfo(1).lastTier;
const r = sizeRadius;

/** Steps the world, resolving merges after each step; returns the outcomes and the hits. */
function play(world: PhysicsWorld, steps: number) {
  const resolver = new MergeResolver();
  const outcomes: MergeOutcome[] = [];
  const hits: BallView[] = [];
  for (let i = 0; i < steps; i++) {
    world.step();
    outcomes.push(...resolver.resolve(world, CAP_1));
    hits.push(...resolver.hits);
  }
  return { outcomes, hits };
}

/** How far apart two balls of these sizes stand on the floor when they overlap by 2 units. */
function beside(a: number, b: number): number {
  const ra = r(a);
  const rb = r(b);
  return Math.sqrt((ra + rb - 2) ** 2 - (ra - rb) ** 2);
}

/** A ball of `size` resting on the floor at x (stage 1: the tier is the size). */
function onFloor(world: PhysicsWorld, size: number, x: number, kind: BallView['kind'] = 'cat') {
  return world.addBall({ kind, tier: size, x, y: -r(size) });
}

describe('joker cats (GAME_DESIGN §15.7)', () => {
  it('merges with the cat it touches, whatever its tier: the cat grows one tier where it is', () => {
    const world = new PhysicsWorld();
    const cat = onFloor(world, 5, -60);
    const joker = onFloor(world, 2, -60 + beside(5, 2), 'joker');
    const { outcomes } = play(world, 1);
    expect(outcomes).toHaveLength(1);
    const o = outcomes[0]!;
    expect(o).toMatchObject({ kind: 'merge', tier: 5, newTier: 6, golden: false, joker: true });
    // Where the cat was, not between the two.
    expect([o.x, o.y]).toEqual([cat.x, cat.y]);
    expect(cat.removed && joker.removed).toBe(true);
    expect(world.balls.map((b) => [b.kind, b.tier])).toEqual([['cat', 6]]);
    // It grows from the cat's own size.
    expect(o.ball!.radius).toBeCloseTo(r(5), 6);
  });

  it('raises a golden cat two tiers, never above the stage’s last cat', () => {
    const world = new PhysicsWorld();
    world.addBall({ tier: 3, golden: true, x: 0, y: -r(3) });
    onFloor(world, 2, beside(3, 2), 'joker');
    const { outcomes } = play(world, 1);
    expect(outcomes[0]).toMatchObject({ tier: 3, newTier: 5, golden: true, joker: true });
    expect(outcomes[0]!.ball!.golden).toBe(false);
  });

  it('makes the stage’s last cat out of a size 8, but leaves the last cat alone', () => {
    const world = new PhysicsWorld();
    onFloor(world, 8, -100);
    onFloor(world, 2, -100 + beside(8, 2), 'joker');
    expect(play(world, 1).outcomes[0]).toMatchObject({ tier: 8, newTier: CAP_1 });

    const last = new PhysicsWorld();
    onFloor(last, CAP_1, -100);
    const joker = onFloor(last, 2, -100 + beside(CAP_1, 2), 'joker');
    expect(play(last, 30).outcomes).toEqual([]);
    expect(joker.removed).toBe(false);
  });

  it('never merges with another joker, a hanabi or a boulder', () => {
    const world = new PhysicsWorld();
    onFloor(world, 2, -200, 'joker');
    onFloor(world, 2, -200 + beside(2, 2), 'joker');
    onFloor(world, 2, 40, 'joker');
    onFloor(world, 2, 40 + beside(2, 2), 'hanabi');
    onFloor(world, 2, 40 + 2 * beside(2, 2), 'boulder');
    expect(play(world, 20).outcomes).toEqual([]);
    expect(world.balls).toHaveLength(5);
  });

  it('merges with the oldest of the cats it touches first', () => {
    const world = new PhysicsWorld();
    const older = onFloor(world, 3, -r(3) - r(2) + 1);
    const younger = onFloor(world, 4, r(4) + r(2) - 1);
    onFloor(world, 2, 0, 'joker');
    const { outcomes } = play(world, 1);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ tier: 3, newTier: 4 });
    expect(older.removed).toBe(true);
    expect(younger.removed).toBe(false);
  });

  it('hits a boulder it touches once, however long it rests on it', () => {
    const world = new PhysicsWorld();
    const boulder = onFloor(world, 3, 0, 'boulder');
    const joker = world.addBall({ kind: 'joker', tier: 2, x: 0, y: -2 * r(3) - r(2) + 1 });
    const { outcomes, hits } = play(world, 120);
    expect(outcomes).toEqual([]);
    expect(hits).toEqual([boulder]);
    expect([...joker.struck]).toEqual([boulder.id]);
  });

  it('counts as a merge for the boulders next to it', () => {
    const world = new PhysicsWorld();
    const boulder = onFloor(world, 2, 0, 'boulder');
    onFloor(world, 3, -r(2) - r(3) + 1);
    onFloor(world, 2, -r(2) - 2 * r(3) - r(2) + 3, 'joker');
    const { outcomes, hits } = play(world, 1);
    expect(outcomes).toHaveLength(1);
    expect(hits).toEqual([boulder]);
  });
});

function setup(seed = 3) {
  const events = new EventBus<GameEvents>();
  const log: [keyof GameEvents, unknown][] = [];
  const types: (keyof GameEvents)[] = [
    'merged',
    'catDropped',
    'catPopped',
    'boulderBroken',
    'hanabiExploded',
    'specialPopped',
    'stageCleared',
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

describe('the joker in a run', () => {
  it('pays like a merge of the cat’s tier and rings a joker merge', () => {
    const { run, of } = setup();
    run.spawnBall(4, -100, -r(4));
    run.spawnBall(2, -100 + beside(4, 2), -r(2), { kind: 'joker' });
    run.tick();
    const [merged] = of('merged');
    expect(merged).toMatchObject({ tier: 4, newTier: 5, joker: true, golden: false, combo: 1 });
    expect(merged!.coins).toBeGreaterThan(0);
    expect(run.coins).toBe(merged!.coins);
  });

  it('clears the stage when it makes the last cat', () => {
    const { run, of } = setup();
    run.spawnBall(8, -100, -r(8));
    run.spawnBall(2, -100 + beside(8, 2), -r(2), { kind: 'joker' });
    run.tick();
    expect(of('stageCleared')).toEqual([{ stage: 1, tier: 9, next: 'expand' }]);
  });

  it('drops from the paw as a joker', () => {
    const { run, of } = setup();
    run.giveSpecial('joker');
    expect(run.current).toEqual({ kind: 'joker', tier: 2, golden: false, hits: 0 });
    expect(run.drop(0)).toBe(true);
    expect(of('catDropped')).toEqual([{ kind: 'joker', tier: 2, golden: false, x: 0 }]);
    expect(run.balls.at(-1)!.kind).toBe('joker');
  });

  it('vanishes with a stage clear’s pops, paying nothing', () => {
    const { run, of } = setup();
    const joker = run.spawnBall(2, 250, -r(2), { kind: 'joker' });
    ticks(run, 5);
    run.spawnBall(8, -150, -r(8));
    run.spawnBall(8, -150, -3 * r(8));
    for (let i = 0; i < 240 && of('stageCleared').length === 0; i++) run.tick();
    expect(of('specialPopped')).toEqual([
      { id: joker.id, kind: 'joker', tier: 2, at: expect.any(Object), reason: 'cashOut' },
    ]);
  });
});

describe('hanabi (GAME_DESIGN §15.6)', () => {
  it('sorts the balls in reach: small cats pop, boulders break, hanabi chain, the rest is pushed', () => {
    const world = new PhysicsWorld();
    const hanabi = onFloor(world, 2, 0, 'hanabi');
    const small = onFloor(world, 4, 150);
    const boulder = onFloor(world, 2, -150, 'boulder');
    const big = world.addBall({ tier: 5, x: 0, y: -300 });
    const other = world.addBall({ kind: 'hanabi', tier: 2, x: -100, y: -250 });
    const joker = world.addBall({ kind: 'joker', tier: 2, x: 120, y: -230 });
    const far = world.addBall({ tier: 1, x: 0, y: -2 * r(2) - HANABI_REACH - r(1) - 5 });
    const blast = hanabiBlast(hanabi, world.balls);
    expect(blast.pops).toEqual([small]);
    expect(blast.breaks).toEqual([boulder]);
    expect(blast.chain).toEqual([other]);
    expect(blast.pushes.map((p) => p.ball)).toEqual([big, joker]);
    expect(blast.pushes[0]!.vx).toBeCloseTo(0, 9);
    expect(blast.pushes[0]!.vy).toBeCloseTo(-HANABI_PUSH_SPEED, 9);
    expect(blast.pops).not.toContain(far);
  });

  it('pushes a ball right on top of it straight up', () => {
    const world = new PhysicsWorld();
    const hanabi = onFloor(world, 2, 0, 'hanabi');
    const big = world.addBall({ tier: 6, x: 0, y: hanabi.y });
    const [push] = hanabiBlast(hanabi, world.balls).pushes;
    expect(push).toEqual({ ball: big, vx: 0, vy: -HANABI_PUSH_SPEED });
  });

  it('goes off a fuse after its first contact, popping the small cats around it into coins', () => {
    const { run, of } = setup();
    const hanabi = run.spawnBall(2, 0, -r(2), { kind: 'hanabi' });
    const near = run.spawnBall(1, -110, -r(1));
    const far = run.spawnBall(1, 300, -r(1));
    const boulder = run.spawnBall(2, -220, -r(2), { kind: 'boulder', hits: 3 });
    run.tick();
    const lit = hanabi.landedMs;
    expect(lit).toBeGreaterThanOrEqual(0);
    while (of('hanabiExploded').length === 0) run.tick();
    expect(run.playTimeMs - lit).toBeCloseTo(HANABI_FUSE_MS, -1);
    expect(run.playTimeMs - lit).toBeLessThan(HANABI_FUSE_MS + PHYSICS_STEP_MS);
    expect(of('hanabiExploded')).toEqual([
      { id: hanabi.id, at: expect.any(Object), reach: HANABI_REACH },
    ]);
    expect(of('catPopped')).toEqual([
      { id: near.id, tier: 1, at: expect.any(Object), coins: 1, reason: 'hanabi' },
    ]);
    expect(of('boulderBroken')).toEqual([
      { id: boulder.id, tier: 2, at: expect.any(Object), reason: 'hanabi' },
    ]);
    expect(run.balls).toEqual([far]);
    expect(run.coins).toBe(1);
    expect(of('runCoinsChanged').at(-1)).toEqual({ coins: 1 });
  });

  it('sets off the hanabi in its reach in the same tick', () => {
    const { run, of } = setup();
    run.spawnBall(2, -120, -r(2), { kind: 'hanabi' });
    ticks(run, 60);
    run.spawnBall(2, 120, -r(2), { kind: 'hanabi' });
    while (of('hanabiExploded').length === 0) run.tick();
    expect(of('hanabiExploded')).toHaveLength(2);
    expect(run.balls).toEqual([]);
  });

  it('pushes a big cat away without popping it', () => {
    const { run, of } = setup();
    run.spawnBall(2, -200, -r(2), { kind: 'hanabi' });
    const big = run.spawnBall(6, 60, -r(6));
    while (of('hanabiExploded').length === 0) run.tick();
    expect(run.balls).toEqual([big]);
    expect(big.vx).toBeGreaterThan(HANABI_PUSH_SPEED / 2);
  });

  it('comes back from a saved run with its fuse burning, and goes off on the same tick', () => {
    const play = (save: boolean): string => {
      const { run } = setup(11);
      run.spawnBall(2, 0, -r(2), { kind: 'hanabi' });
      run.spawnBall(1, -110, -r(1));
      run.spawnBall(4, 160, -r(4));
      run.spawnBall(2, -230, -r(2), { kind: 'joker' });
      ticks(run, 50);
      let current = run;
      if (save) {
        const text = JSON.stringify({ version: 1, save: { run: run.snapshot(), recordsBefore } });
        const decoded = decodeRunSave(text);
        if (!('save' in decoded)) throw new Error(decoded.error);
        current = RunController.restore(decoded.save.run);
        current.resume();
      }
      ticks(current, 150);
      return current.stateHash();
    };
    const recordsBefore = { bestScore: 0, bestStage: 1, highestTier: 0 };
    expect(play(true)).toBe(play(false));
  });
});
