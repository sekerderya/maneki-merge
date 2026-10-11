import { describe, expect, it } from 'vitest';
import { DICE_FIZZLE_CHANCE, DICE_LUCKY_CHANCE } from '../../src/config/picks';
import type { DiceRoll } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius, tierCoins } from '../../src/config/tiers';
import { coinPayout } from '../../src/core/economy';
import type { GameEvents } from '../../src/core/events';
import { diceRoll } from '../../src/core/picks';
import { Rng } from '../../src/core/rng';
import { MergeResolver } from '../../src/physics/merges';
import type { MergeRules } from '../../src/physics/merges';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';
import { botMove } from './fixtures';

const CAP = stageInfo(1).lastTier;

/** Merge rules with a die that always shows `roll`, counting its rolls. */
function rules(roll: DiceRoll, extra: Partial<MergeRules> = {}) {
  const counter = { rolls: 0 };
  const merge: MergeRules = {
    threesUpTo: 0,
    pairWaitSteps: 0,
    pairGraceSteps: 0,
    porcelain: false,
    dice: () => {
      counter.rolls++;
      return roll;
    },
    ...extra,
  };
  return { merge, counter };
}

/** Two cats of `tier` side by side on the floor, overlapping by 2 units. */
function pair(world: PhysicsWorld, tier: number, centre = 0, golden = false) {
  const r = sizeRadius(world.sizeOf(tier));
  world.addBall({ tier, x: centre - r + 1, y: -r, golden });
  world.addBall({ tier, x: centre + r - 1, y: -r });
}

/** Steps the world once and resolves its merges. */
function resolveOnce(world: PhysicsWorld, merge: MergeRules) {
  const resolver = new MergeResolver();
  world.step();
  return { outcomes: [...resolver.resolve(world, CAP, merge)], resolver };
}

/** A run with Dice on that logs its merges. */
function setup(seed = 1) {
  const run = new RunController({ seed });
  run.setPickLevel('dice', 1);
  const merges: GameEvents['merged'][] = [];
  run.events.on('merged', (e) => merges.push(e));
  return { run, merges };
}

/** Two cats of `size` (stage 1) on the floor around `centre`, merging on the next tick. */
function spawnPair(run: RunController, size: number, centre = 0, golden = false) {
  const r = sizeRadius(size);
  run.spawnBall(size, centre - r + 1, -r, { golden });
  run.spawnBall(size, centre + r - 1, -r);
}

describe('Dice (GAME_DESIGN §15.14)', () => {
  it('rolls lucky and fizzles about one merge in six each', () => {
    const rng = new Rng(19);
    const counts = { lucky: 0, fizzle: 0, normal: 0 };
    const n = 60_000;
    for (let i = 0; i < n; i++) counts[diceRoll(rng) ?? 'normal']++;
    expect(counts.lucky / n).toBeCloseTo(DICE_LUCKY_CHANCE, 2);
    expect(counts.fizzle / n).toBeCloseTo(DICE_FIZZLE_CHANCE, 2);
    expect(counts.normal / n).toBeCloseTo(1 - DICE_LUCKY_CHANCE - DICE_FIZZLE_CHANCE, 2);
  });

  it('a lucky pair goes two sizes up, a golden pair three, a Hubris three three', () => {
    let world = new PhysicsWorld();
    pair(world, 3);
    expect(resolveOnce(world, rules('lucky').merge).outcomes[0]).toMatchObject({
      tier: 3,
      newTier: 5,
      dice: 'lucky',
    });
    world = new PhysicsWorld();
    pair(world, 3, 0, true);
    expect(resolveOnce(world, rules('lucky').merge).outcomes[0]).toMatchObject({ newTier: 6 });
    world = new PhysicsWorld();
    const r = sizeRadius(3);
    for (let i = 0; i < 3; i++) world.addBall({ tier: 3, x: -150 + r + i * (2 * r - 2), y: -r });
    const hubris = rules('lucky', { threesUpTo: 5, pairWaitSteps: 60, pairGraceSteps: 12 });
    expect(resolveOnce(world, hubris.merge).outcomes[0]).toMatchObject({
      parts: 3,
      newTier: 6,
      dice: 'lucky',
    });
  });

  it("is never above the stage's last size: two lucky 7s make the last cat and clear", () => {
    const { run, merges } = setup();
    run.forceDice('lucky');
    spawnPair(run, 7);
    run.tick();
    expect(merges[0]).toMatchObject({ tier: 7, newTier: 9, dice: 'lucky' });
    expect(run.state).toBe('expanding');
  });

  it("doesn't roll for a joker's merge or the merge that makes the last cat", () => {
    for (const [tier, golden] of [
      [8, false],
      [7, true],
    ] as const) {
      const world = new PhysicsWorld();
      pair(world, tier, 0, golden);
      const { merge, counter } = rules('lucky');
      expect(resolveOnce(world, merge).outcomes[0]).toMatchObject({ newTier: 9, dice: null });
      expect(counter.rolls).toBe(0);
    }
    const world = new PhysicsWorld();
    const r = sizeRadius(5);
    world.addBall({ tier: 5, x: 0, y: -r });
    world.addBall({ kind: 'joker', tier: 2, x: 0, y: -2 * r - sizeRadius(2) + 2 });
    const { merge, counter } = rules('lucky');
    const resolver = new MergeResolver();
    let joker = null;
    for (let i = 0; i < 5 && !joker; i++) {
      world.step();
      joker = resolver.resolve(world, CAP, merge)[0] ?? null;
    }
    expect(joker).toMatchObject({ joker: true, newTier: 6, dice: null });
    expect(counter.rolls).toBe(0);
  });

  it('a fizzle makes one cat of the size that met at the same spot, already grown', () => {
    const world = new PhysicsWorld();
    pair(world, 4, 30);
    const { outcomes } = resolveOnce(world, rules('fizzle').merge);
    const fizzle = outcomes[0]!;
    expect(fizzle).toMatchObject({ kind: 'merge', tier: 4, newTier: 4, dice: 'fizzle' });
    expect(fizzle.x).toBeCloseTo(30, 0);
    expect(world.balls).toHaveLength(1);
    expect(fizzle.ball).toMatchObject({ tier: 4, growing: false, golden: false });
    // A Hubris three fizzles into one cat of its size too.
    const three = new PhysicsWorld();
    const r = sizeRadius(2);
    for (let i = 0; i < 3; i++) three.addBall({ tier: 2, x: -100 + r + i * (2 * r - 2), y: -r });
    const hubris = rules('fizzle', { threesUpTo: 5, pairWaitSteps: 60, pairGraceSteps: 12 });
    expect(resolveOnce(three, hubris.merge).outcomes[0]).toMatchObject({ parts: 3, newTier: 2 });
    expect(three.balls).toHaveLength(1);
  });

  it('a fizzle still hits boulders and may crack the cats beside it', () => {
    const world = new PhysicsWorld();
    pair(world, 3);
    const r = sizeRadius(3);
    world.addBall({
      kind: 'boulder',
      tier: 2,
      hits: 2,
      x: 2 * r + sizeRadius(2),
      y: -sizeRadius(2),
    });
    world.addBall({ tier: 2, x: -2 * r - sizeRadius(2), y: -sizeRadius(2) });
    const { outcomes, resolver } = resolveOnce(world, rules('fizzle', { porcelain: true }).merge);
    expect(outcomes[0]!.dice).toBe('fizzle');
    expect(resolver.hits.map((b) => b.kind)).toEqual(['boulder']);
    expect(resolver.cracks.map((b) => b.tier)).toEqual([2]);
  });

  it('a fizzle pays like a merge, counts for the combo and never echoes', () => {
    const { run, merges } = setup();
    run.setPickLevel('echo', 1);
    let echoes = 0;
    run.events.on('echoed', () => echoes++);
    run.forceDice('fizzle');
    spawnPair(run, 5, -120);
    run.tick();
    expect(merges[0]).toMatchObject({ tier: 5, newTier: 5, dice: 'fizzle', combo: 1 });
    expect(run.coins).toBe(coinPayout(tierCoins(5), 1, 0));
    expect(echoes).toBe(0);
    // A second merge soon after raises the combo.
    spawnPair(run, 2, 150);
    run.tick();
    expect(merges[1]!.combo).toBe(2);
  });

  it('shows the roll on every merge, and normal merges show nothing', () => {
    const { run, merges } = setup();
    run.forceDice('normal');
    spawnPair(run, 2);
    run.tick();
    expect(merges[0]).toMatchObject({ newTier: 3, dice: null });
    // Without Dice nothing ever rolls.
    const plain = new RunController({ seed: 1 });
    const seen: GameEvents['merged'][] = [];
    plain.events.on('merged', (e) => seen.push(e));
    plain.forceDice('lucky');
    spawnPair(plain, 2);
    plain.tick();
    expect(seen[0]).toMatchObject({ newTier: 3, dice: null });
  });

  it('plays the same for the same seed and inputs', () => {
    const play = (): { hash: string; rolls: string } => {
      const { run, merges } = setup(23);
      const aim = new Rng(4);
      for (let t = 0; t < 4000 && run.state !== 'over'; t++) {
        botMove(run, (aim.next() * 2 - 1) * 280, aim.next());
        run.tick();
      }
      return { hash: run.stateHash(), rolls: merges.map((m) => m.dice ?? '-').join('') };
    };
    const a = play();
    expect(play()).toEqual(a);
    expect(a.rolls).toMatch(/lucky/);
    expect(a.rolls).toMatch(/fizzle/);
  });
});
