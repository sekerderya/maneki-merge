import { describe, expect, it } from 'vitest';
import { PORCELAIN_REACH, SPAWN_START_RADIUS_SHARE } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import { MERGE_GROW_MS } from '../../src/config/timings';
import { stepsFor } from '../../src/config/physics';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import type { GameEvents } from '../../src/core/events';
import type { BallView } from '../../src/physics/balls';
import type { MergeRules } from '../../src/physics/merges';
import { MergeResolver } from '../../src/physics/merges';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';

const CAP = stageInfo(1).lastTier;
const PORCELAIN: MergeRules = { threesUpTo: 0, porcelain: true };

/** A cat of `size` (stage 1) resting on the floor at x. */
function floorCat(world: PhysicsWorld, size: number, x: number) {
  return world.addBall({ tier: size, x, y: -sizeRadius(size) });
}

/** The snapshot through JSON, as the store writes and reads it. */
function roundTrip(snapshot: RunSnapshot | null): RunSnapshot {
  if (!snapshot) throw new Error('No snapshot');
  const text = JSON.stringify({
    version: RUN_SAVE_VERSION,
    save: { run: snapshot, recordsBefore: { bestScore: 0, bestStage: 1, highestTier: 0 } },
  });
  const decoded = decodeRunSave(text);
  if (!('save' in decoded)) throw new Error(decoded.error);
  return decoded.save.run;
}

describe('Porcelain: who a merge may crack (GAME_DESIGN §15.10)', () => {
  it('reaches the cats within PORCELAIN_REACH of a merging cat, not those beyond', () => {
    const world = new PhysicsWorld();
    const r2 = sizeRadius(2);
    // A pair of 2s at x = 0, a 4 just within reach on the right, a 3 just beyond on the left.
    floorCat(world, 2, -r2 + 1);
    floorCat(world, 2, r2 - 1);
    const near = floorCat(world, 4, 2 * r2 - 1 + PORCELAIN_REACH - 2 + sizeRadius(4));
    floorCat(world, 3, -(2 * r2 - 1) - PORCELAIN_REACH - 8 - sizeRadius(3));
    world.step();
    const resolver = new MergeResolver();
    expect(resolver.resolve(world, CAP, PORCELAIN)).toHaveLength(1);
    expect(resolver.cracks).toEqual([near]);
  });

  it("spares cats of the merging size, the stage's last size, boulders and the new cat", () => {
    const world = new PhysicsWorld();
    const r3 = sizeRadius(3);
    floorCat(world, 3, -r3 + 1);
    floorCat(world, 3, r3 - 1);
    // A 3 and a 9 touching the pair on either side, a boulder resting on top.
    floorCat(world, 3, 3 * r3 - 1);
    floorCat(world, 9, -2 * r3 + 1 - sizeRadius(9) + 1);
    world.addBall({ kind: 'boulder', tier: 2, hits: 5, x: 0, y: -2 * r3 - sizeRadius(2) + 4 });
    world.step();
    const resolver = new MergeResolver();
    // The two left 3s merge (oldest first); the third 3 waits.
    expect(resolver.resolve(world, CAP, PORCELAIN)).toHaveLength(1);
    expect(resolver.cracks).toEqual([]);
  });

  it('lists a cat once per merge that reaches it, cats by id then merges', () => {
    const world = new PhysicsWorld();
    const r1 = sizeRadius(1);
    const r4 = sizeRadius(4);
    // A 4 in the middle with a pair of 1s on each side.
    const mid = floorCat(world, 4, 0);
    floorCat(world, 1, -r4 - r1 + 1);
    floorCat(world, 1, -r4 - 3 * r1 + 3);
    floorCat(world, 1, r4 + r1 - 1);
    floorCat(world, 1, r4 + 3 * r1 - 3);
    world.step();
    const resolver = new MergeResolver();
    expect(resolver.resolve(world, CAP, PORCELAIN)).toHaveLength(2);
    expect(resolver.cracks).toEqual([mid, mid]);
    // Without Porcelain it lists nothing.
    const plain = new PhysicsWorld();
    floorCat(plain, 4, 0);
    floorCat(plain, 1, -r4 - r1 + 1);
    floorCat(plain, 1, -r4 - 3 * r1 + 3);
    plain.step();
    resolver.resolve(plain, CAP);
    expect(resolver.cracks).toEqual([]);
  });
});

describe('Porcelain: cracking and breaking (GAME_DESIGN §15.10)', () => {
  it('cracks an intact cat, and breaks a cracked one into two of the size below', () => {
    const run = new RunController({ seed: 1 });
    run.setPickLevel('porcelain', 1);
    const cracked: GameEvents['catCracked'][] = [];
    const broken: GameEvents['catBroken'][] = [];
    run.events.on('catCracked', (e) => cracked.push(e));
    run.events.on('catBroken', (e) => broken.push(e));
    const cat = run.spawnBall(4, 50, -sizeRadius(4));
    for (let i = 0; i < 30; i++) run.tick();
    expect(run.crackCat(cat.id)).toBe(true);
    expect(cat.cracked).toBe(true);
    expect(cracked).toEqual([{ id: cat.id, tier: 4, at: { x: cat.x, y: cat.y } }]);
    const { x, y } = cat;
    expect(run.crackCat(cat.id)).toBe(true);
    expect(run.balls.find((b) => b.id === cat.id)).toBeUndefined();
    const pieces = run.balls.filter((b) => broken[0]!.pieces.includes(b.id));
    expect(pieces.map((p) => p.tier)).toEqual([3, 3]);
    const r3 = sizeRadius(3);
    expect(pieces.map((p) => p.x)).toEqual([x - r3, x + r3]);
    expect(pieces.every((p) => p.y === y && !p.cracked && !p.golden && p.landedMs >= 0)).toBe(true);
    // Shard mates, growing in from small.
    expect(pieces[0]!.mate).toBe(pieces[1]!.id);
    expect(pieces[1]!.mate).toBe(pieces[0]!.id);
    expect(pieces[0]!.radius).toBeCloseTo(SPAWN_START_RADIUS_SHARE * r3, 6);
    for (let i = 0; i < stepsFor(MERGE_GROW_MS); i++) run.tick();
    expect(pieces.every((p) => p.radius === r3)).toBe(true);
    // Breaking pays nothing.
    expect(run.coins).toBe(0);
  });

  it("keeps a broken cat's pieces inside the walls", () => {
    const run = new RunController({ seed: 1 });
    const r6 = sizeRadius(6);
    const cat = run.spawnBall(7, 300, -sizeRadius(7), { cracked: true });
    run.crackCat(cat.id);
    const pieces = run.balls.filter((b) => b.tier === 6);
    expect(pieces).toHaveLength(2);
    expect(Math.max(...pieces.map((p) => p.x)) + r6).toBeLessThanOrEqual(run.geometry.halfWidth);
  });

  it('shatters a cracked size 1', () => {
    const run = new RunController({ seed: 1 });
    const broken: GameEvents['catBroken'][] = [];
    run.events.on('catBroken', (e) => broken.push(e));
    const cat = run.spawnBall(1, 0, -sizeRadius(1), { cracked: true });
    run.crackCat(cat.id);
    expect(run.balls).toHaveLength(0);
    expect(broken[0]!.pieces).toEqual([]);
  });

  it("never merges a broken cat's two pieces with each other, but each with a third cat", () => {
    const run = new RunController({ seed: 1 });
    const cat = run.spawnBall(4, 0, -sizeRadius(4), { cracked: true });
    run.crackCat(cat.id);
    for (let i = 0; i < 120; i++) run.tick();
    expect(run.balls.map((b) => b.tier)).toEqual([3, 3]);
    // A third 3 dropped on them merges with one.
    run.spawnBall(3, 0, -400);
    for (let i = 0; i < 240; i++) run.tick();
    expect(run.balls.map((b) => b.tier).sort()).toEqual([3, 4]);
  });

  it('makes a whole cat of a cracked one that merges, with a flash of gold', () => {
    const run = new RunController({ seed: 1 });
    const merged: GameEvents['merged'][] = [];
    run.events.on('merged', (e) => merged.push(e));
    const r = sizeRadius(3);
    run.spawnBall(3, -r + 1, -r, { cracked: true });
    run.spawnBall(3, r - 1, -r);
    for (let i = 0; i < 5; i++) run.tick();
    expect(merged[0]).toMatchObject({ tier: 3, kintsugi: true });
    expect(run.balls[0]!.cracked).toBe(false);
  });

  it('never cracks boulders, hanabi or jokers', () => {
    const run = new RunController({ seed: 1 });
    const boulder = run.spawnBall(2, 0, -50, { kind: 'boulder', cracked: true });
    expect(boulder.cracked).toBe(false);
    expect(run.crackCat(boulder.id)).toBe(false);
  });

  it('cracks with its chance per level, the same for the same seed', () => {
    // A 3 between two pairs of 1s: each merge reaches it once. Over many seeds at 40%, about a
    // third of the 3s end up cracked or broken (1 − 0.6² = 64% are hit at least once).
    const outcome = (seed: number): string => {
      const run = new RunController({ seed });
      run.setPickLevel('porcelain', 2);
      const r1 = sizeRadius(1);
      const r3 = sizeRadius(3);
      const mid = run.spawnBall(3, 0, -r3);
      for (const side of [-1, 1]) {
        run.spawnBall(1, side * (r3 + r1 - 1), -r1);
        run.spawnBall(1, side * (r3 + 3 * r1 - 3), -r1);
      }
      for (let i = 0; i < 3; i++) run.tick();
      const gone = !run.balls.some((b) => b.id === mid.id);
      return gone ? 'broken' : mid.cracked ? 'cracked' : 'whole';
    };
    const results = Array.from({ length: 200 }, (_, seed) => outcome(seed));
    const count = (r: string) => results.filter((x) => x === r).length / results.length;
    // 0.4 × 0.4 = 16% break, 2 × 0.4 × 0.6 = 48% crack, 36% whole.
    expect(count('broken')).toBeGreaterThan(0.08);
    expect(count('broken')).toBeLessThan(0.26);
    expect(count('cracked')).toBeGreaterThan(0.36);
    expect(count('cracked')).toBeLessThan(0.6);
    expect(outcome(7)).toBe(outcome(7));
  });

  it('keeps cracks and shard mates through a save', () => {
    const run = new RunController({ seed: 1 });
    run.setPickLevel('porcelain', 3);
    const cat = run.spawnBall(5, 0, -sizeRadius(5), { cracked: true });
    run.crackCat(cat.id);
    run.spawnBall(2, 200, -sizeRadius(2), { cracked: true });
    for (let i = 0; i < 4; i++) run.tick();
    run.pause();
    const saved = roundTrip(run.snapshot());
    const back = RunController.restore(saved);
    const view = (b: BallView) => [b.id, b.tier, b.cracked, b.mate];
    expect(back.balls.map(view)).toEqual(run.balls.map(view));
    expect(back.stateHash()).toBe(run.stateHash());
  });
});
