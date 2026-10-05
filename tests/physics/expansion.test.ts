import { describe, expect, it } from 'vitest';
import { MAX_SPEED_BASE, PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { tierCoins, tierRadius, tierScore } from '../../src/config/tiers';
import { DROP_COOLDOWN_MS, EXPANSION_DURATION_MS } from '../../src/config/timings';
import { cashOutBelow, coinPayout, popCoins } from '../../src/core/economy';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { stageThreshold } from '../../src/core/progression';
import { Rng } from '../../src/core/rng';
import type { UpgradeLevels } from '../../src/core/upgrades';
import type { BallView } from '../../src/physics/balls';
import { jarGeometry } from '../../src/physics/geometry';
import { FixedStepper, PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';
import type { RunOptions } from '../../src/run/RunController';
import { inJar, maxWallPenetration, STEPS_PER_SECOND, upgrades } from './fixtures';

const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);

function setup(levels: Partial<UpgradeLevels> = {}, options: Partial<RunOptions> = {}) {
  const events = new EventBus<GameEvents>();
  const log: [keyof GameEvents, unknown][] = [];
  const types: (keyof GameEvents)[] = [
    'dropReady',
    'catPopped',
    'runCoinsChanged',
    'expansionStarted',
    'expansionRevealed',
    'expansionFinished',
    'expansionLocked',
    'jackpot',
    'merged',
    'catDropped',
  ];
  for (const type of types) events.on(type, (payload) => log.push([type, payload]));
  let banked = 0;
  const run = new RunController({
    seed: 3,
    events,
    upgrades: upgrades(levels),
    bank: (coins) => (banked += coins),
    ...options,
  });
  const of = <K extends keyof GameEvents>(type: K): GameEvents[K][] =>
    log.filter((e) => e[0] === type).map((e) => e[1] as GameEvents[K]);
  return { run, log, of, banked: () => banked };
}

function ticks(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) run.tick();
}

/** Ticks until the run plays again at `stage` (the timed expansions in between included). */
function playUntilStage(run: RunController, stage: number): void {
  for (let i = 0; i < 20 * EXPANSION_STEPS; i++) {
    if (run.stage === stage && run.state === 'playing') return;
    run.tick();
  }
  throw new Error(`Never reached stage ${stage}`);
}

/** A cat on the floor against the left (-1) or right (+1) wall of the current jar. */
function spawnAtWall(run: RunController, tier: number, side: -1 | 1, golden = false): BallView {
  const r = tierRadius(tier);
  return run.spawnBall(tier, side * (run.geometry.halfWidth - r), -r, golden);
}

describe('expanding under a pile (GAME_DESIGN §7.1)', () => {
  it('nothing escapes, jumps or launches through every expansion up to stage 5', () => {
    const { run } = setup({ shrineExpansion: 3 });
    const rng = new Rng(17);

    /** Pours `count` mixed cats in from above the rim, in rows that don't overlap. */
    const addPile = (count: number): void => {
      const pool = stageInfo(run.stage).dropPool;
      const { halfWidth, rimY } = run.geometry;
      const cell = 2 * tierRadius(pool[pool.length - 1]!) + 8;
      const perRow = Math.floor((2 * halfWidth) / cell);
      for (let i = 0; i < count; i++) {
        const tier = pool[Math.floor(rng.next() * pool.length)]!;
        const x = -halfWidth + cell / 2 + (i % perRow) * cell + (rng.next() - 0.5) * 6;
        run.spawnBall(tier, x, rimY - cell / 2 - Math.floor(i / perRow) * cell);
      }
    };

    let worstUpward = 0;
    let worstStep = 0;
    let expansions = 0;

    /** Checks every tick that nothing escapes or beats the speed limit. */
    const checkTick = (onCat?: (cat: BallView, limit: number) => void): void => {
      const { halfWidth, scale } = run.geometry;
      const limit = MAX_SPEED_BASE * scale;
      for (const cat of run.balls) {
        if (!inJar(cat, halfWidth)) throw new Error(`Cat ${cat.id} escaped at stage ${run.stage}`);
        expect(cat.speed).toBeLessThanOrEqual(limit + 1e-6);
        onCat?.(cat, limit);
      }
    };

    /**
     * An expansion has just started. From the time stop on, every cat that survives the
     * cash-out stays exactly where it was; then the pile slumps into the wider jar with no
     * launches upwards and no jumps between steps.
     */
    const followExpansion = (): void => {
      expansions++;
      const before = new Map(run.balls.map((b) => [b.id, [b.x, b.y]] as const));
      while (run.state === 'expanding') {
        run.tick();
        for (const cat of run.balls) expect([cat.x, cat.y]).toEqual(before.get(cat.id));
      }
      const last = new Map(run.balls.map((b) => [b.id, [b.x, b.y]] as const));
      for (let t = 0; t < 1.5 * STEPS_PER_SECOND && run.state === 'playing'; t++) {
        run.tick();
        checkTick((cat, limit) => {
          if (cat.landedMs >= 0) worstUpward = Math.max(worstUpward, -cat.vy / limit);
          const prev = last.get(cat.id);
          if (prev) {
            const moved = Math.hypot(cat.x - prev[0], cat.y - prev[1]);
            worstStep = Math.max(worstStep, moved / ((limit * PHYSICS_STEP_MS) / 1000));
          }
          last.set(cat.id, [cat.x, cat.y]);
        });
      }
    };

    /** Plays `seconds`; merges may reach a threshold on their own, which is followed too. */
    const play = (seconds: number): void => {
      for (let t = 0; t < seconds * STEPS_PER_SECOND; t++) {
        run.tick();
        expect(run.state).not.toBe('over');
        if (run.state === 'expanding') followExpansion();
        else checkTick();
      }
      expect(maxWallPenetration(run.balls, run.geometry.halfWidth)).toBeLessThan(0.15);
    };

    addPile(60);
    play(3);
    for (let stage = 2; stage <= STAGE_COUNT; stage++) {
      if (run.stage < stage) {
        // A tall pile leans on both walls when the jar starts to grow.
        const { halfWidth } = run.geometry;
        const atWalls = run.balls.filter((b) => Math.abs(b.x) + b.radius > halfWidth - 2);
        expect(atWalls.length).toBeGreaterThanOrEqual(3);
        run.jumpToStage(stage);
        run.tick();
        expect(run.state).toBe('expanding');
        followExpansion();
      }
      expect(run.stage).toBe(stage);
      addPile(30);
      play(2.5);
    }
    expect(run.stage).toBe(STAGE_COUNT);
    expect(expansions).toBe(STAGE_COUNT - 1);
    // Upward speeds stay far below the limit (TECH_SPEC §5). No cat moves much further in a step
    // than the speed limit allows: a cat landing at full speed gets a small extra push from the
    // position solver, as in normal play, but nothing teleports.
    expect(worstUpward).toBeLessThan(0.2);
    expect(worstStep).toBeLessThan(1.5);
  });

  it('moves the walls and scales gravity at the cash-out, never before', () => {
    const world = new PhysicsWorld();
    for (let stage = 1; stage <= STAGE_COUNT; stage++) {
      world.setStage(stage);
      const geo = jarGeometry(stage);
      expect(world.wallInnerX).toBeCloseTo(geo.halfWidth, 9);
      expect(world.gravity).toBeCloseTo(geo.scale, 12);
    }

    const { run } = setup({ shrineExpansion: 1 });
    run.jumpToStage(2);
    run.tick();
    const half = run.geometry.halfWidth;
    ticks(run, stepsFor(1000));
    expect(run.expansion?.phase).toBe('zoom');
    expect(run.geometry.halfWidth).toBe(half);
    playUntilStage(run, 2);
    // A cat against the new wall rests outside the old jar: the physics wall really moved.
    const cat = spawnAtWall(run, 3, 1);
    ticks(run, STEPS_PER_SECOND);
    expect(cat.x).toBeGreaterThan(half);
    expect(cat.x + cat.radius).toBeLessThanOrEqual(run.geometry.halfWidth + 1);
  });
});

describe('cash-out (GAME_DESIGN §7.1)', () => {
  it('pops exactly the cats below the new smallest drop, oldest first, with multipliers', () => {
    const luckyPaw = 4;
    const { run, log, banked } = setup({ shrineExpansion: 3, luckyPaw });
    const multiplier = run.stats.coinMultiplier;
    expect(multiplier).toBeCloseTo(1.6, 12);

    for (let stage = 2; stage <= STAGE_COUNT; stage++) {
      const popTier = cashOutBelow(stage) - 1;
      // Two cats that pop (one golden), apart so they can't merge, and one that stays (until a
      // later stage cashes it out).
      if (popTier >= 1) {
        spawnAtWall(run, popTier, -1, true);
        spawnAtWall(run, popTier, 1);
      }
      const keeper = run.spawnBall(cashOutBelow(stage) + 1, 0, -200);
      ticks(run, STEPS_PER_SECOND);
      const doomed = run.balls.filter((b) => b.tier < cashOutBelow(stage));
      if (popTier >= 1) expect(doomed.some((b) => b.golden)).toBe(true);
      const coinsBefore = run.coins;
      const bankedBefore = banked();
      const logStart = log.length;

      run.jumpToStage(stage);
      playUntilStage(run, stage);

      const these = log
        .slice(logStart)
        .filter((e) => e[0] === 'catPopped')
        .map((e) => e[1] as GameEvents['catPopped']);
      expect(these.map((p) => [p.id, p.tier, p.golden, p.reason])).toEqual(
        doomed.map((c) => [c.id, c.tier, c.golden, 'cashOut']),
      );
      const expected = doomed.reduce((sum, c) => sum + popCoins(c.tier, c.golden, multiplier), 0);
      expect(these.reduce((sum, p) => sum + p.coins, 0)).toBe(expected);
      expect(run.coins - coinsBefore).toBe(expected);
      expect(banked() - bankedBefore).toBe(expected);
      expect(run.balls.some((b) => b.id === keeper.id)).toBe(true);
      expect(run.balls.every((b) => b.tier >= cashOutBelow(stage))).toBe(true);

      // Order inside the reveal tick: pops, the coin total, then the reveal.
      const sequence = log
        .slice(logStart)
        .map((e) => e[0])
        .filter((t) => t !== 'merged' && t !== 'catDropped');
      const start = sequence.indexOf('expansionStarted');
      expect(sequence.slice(start, start + 1)).toEqual(['expansionStarted']);
      const reveal = sequence.indexOf('expansionRevealed');
      expect(
        sequence.slice(reveal - (doomed.length > 0 ? doomed.length + 1 : 0), reveal + 3),
      ).toEqual([
        ...doomed.map(() => 'catPopped'),
        ...(doomed.length > 0 ? ['runCoinsChanged'] : []),
        'expansionRevealed',
        'expansionFinished',
        'dropReady',
      ]);
    }
    // Golden tier-1 at ×1.6 × 3 = 4.8 → 5; tier 3 C = 3 → 4.8 → 5 (spot checks of the rounding).
    expect(popCoins(1, true, multiplier)).toBe(5);
    expect(popCoins(3, false, multiplier)).toBe(5);
  });

  it('announces the new tiers when the zoom ends and again when play resumes', () => {
    const { run, of } = setup({ shrineExpansion: 3 });
    run.jumpToStage(STAGE_COUNT);
    playUntilStage(run, STAGE_COUNT);
    const expected = [
      [8, 9],
      [10, 11],
      [12, 13],
      [14, 15],
    ];
    expect(of('expansionRevealed').map((e) => e.newTiers)).toEqual(expected);
    expect(of('expansionFinished').map((e) => e.newTiers)).toEqual(expected);
    expect(of('expansionRevealed').map((e) => e.stage)).toEqual([2, 3, 4, 5]);
  });
});

describe('time stop (GAME_DESIGN §7.1)', () => {
  it('freezes the drop cooldown and the combo window', () => {
    const { run } = setup();
    // A merge starts the combo window, a drop starts the cooldown.
    const r = tierRadius(2);
    run.spawnBall(2, -r + 1, -r);
    run.spawnBall(2, r - 1, -r);
    for (let i = 0; i < 30 && run.combo === 0; i++) run.tick();
    expect(run.combo).toBe(1);
    expect(run.drop(200)).toBe(true);
    ticks(run, 10);

    // The expansion starts after the tick's physics step; from then on time stands still.
    run.setScore(500);
    run.tick();
    expect(run.state).toBe('expanding');
    const cooldown = run.cooldownRemainingMs;
    const combo = run.combo;
    const playTime = run.playTimeMs;
    expect(cooldown).toBeGreaterThan(0);
    ticks(run, EXPANSION_STEPS);
    expect(run.state).toBe('playing');
    expect(run.playTimeMs).toBe(playTime);
    expect(run.cooldownRemainingMs).toBe(cooldown);
    expect(run.combo).toBe(combo);
    expect(run.canDrop).toBe(false);

    // Then the rest of the cooldown runs out as if no time had passed.
    ticks(run, Math.round(cooldown / PHYSICS_STEP_MS));
    expect(run.canDrop).toBe(true);
    expect(cooldown).toBeLessThanOrEqual(DROP_COOLDOWN_MS);
  });
});

describe('thresholds, locks and the debug jump (GAME_DESIGN §7, §7.2, §10)', () => {
  it('applies the Quick Growth factor to every threshold', () => {
    for (const quickGrowth of [0, 3, 5]) {
      const { run } = setup({ quickGrowth, shrineExpansion: 3 }, { instantExpansion: true });
      for (let stage = 2; stage <= STAGE_COUNT; stage++) {
        const threshold = stageThreshold(stage, 1 - 0.06 * quickGrowth);
        run.setScore(threshold - 1);
        run.tick();
        expect(run.stage).toBe(stage - 1);
        run.setScore(threshold);
        run.tick();
        expect(run.stage).toBe(stage);
      }
    }
    expect(stageThreshold(2, 1 - 0.06 * 5)).toBe(350);
  });

  it('stops at the highest stage the Shrine Expansion level opens, and says so once', () => {
    for (let level = 0; level <= 3; level++) {
      const { run, of } = setup({ shrineExpansion: level }, { instantExpansion: true });
      run.setScore(50_000);
      ticks(run, 5);
      expect(run.stage).toBe(2 + level);
      if (level < 3) {
        expect(of('expansionLocked')).toEqual([{ stage: 3 + level }]);
        expect(run.progress).toMatchObject({ locked: true, fraction: 1 });
      } else {
        expect(of('expansionLocked')).toEqual([]);
        expect(run.progress).toEqual({ fraction: 1, target: null, locked: false });
      }
    }
  });

  it('jumpToStage opens locked stages for this run and plays each expansion in turn', () => {
    const { run, of } = setup();
    run.jumpToStage(4);
    expect(run.score).toBe(stageThreshold(4, 1));
    playUntilStage(run, 4);
    expect(of('expansionStarted')).toEqual([
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ]);
    // Stage 5 stays locked: the jump only opened stages up to 4.
    expect(of('expansionLocked')).toEqual([]);
    run.setScore(40_000);
    run.tick();
    expect(of('expansionLocked')).toEqual([{ stage: 5 }]);
    expect(run.progress.locked).toBe(true);

    // Ignored: the current stage, a lower one, or one that doesn't exist.
    const score = run.score;
    run.jumpToStage(4);
    run.jumpToStage(2);
    run.jumpToStage(6);
    run.jumpToStage(4.5);
    expect(run.score).toBe(score);
  });
});

describe('every stage: caps, Jackpots and drop pools (GAME_DESIGN §5, §7, §8)', () => {
  it.each([1, 2, 3, 4, 5])('stage %i', (stage) => {
    const { run, of } = setup({ shrineExpansion: 3, luckyPaw: 2 }, { instantExpansion: true });
    if (stage > 1) run.jumpToStage(stage);
    run.tick();
    expect(run.stage).toBe(stage);
    const { tierCap, dropPool } = stageInfo(stage);
    const multiplier = run.stats.coinMultiplier;

    // Two cap-tier cats: a Jackpot (2 × S(cap), 5 × C(cap) × multipliers), both gone.
    const r = tierRadius(tierCap);
    run.spawnBall(tierCap, -r + 1, -r);
    run.spawnBall(tierCap, r - 1, -r);
    for (let i = 0; i < 60 && of('jackpot').length === 0; i++) run.tick();
    expect(of('jackpot')).toEqual([
      expect.objectContaining({
        tier: tierCap,
        score: 2 * tierScore(tierCap),
        coins: coinPayout(5 * tierCoins(tierCap), multiplier, 0, false),
      }),
    ]);
    expect(run.balls.some((b) => b.tier === tierCap)).toBe(false);

    // Two cats one below the cap merge into the cap tier.
    const below = tierCap - 1;
    const rb = tierRadius(below);
    run.spawnBall(below, -rb + 1, -rb);
    run.spawnBall(below, rb - 1, -rb);
    for (let i = 0; i < 60 && of('merged').length === 0; i++) run.tick();
    expect(of('merged')).toEqual([expect.objectContaining({ tier: below, newTier: tierCap })]);

    // Every cat the dropper hands out comes from this stage's pool.
    ticks(run, 2 * STEPS_PER_SECOND);
    const aim = new Rng(stage);
    for (let i = 0; i < 25 && run.state === 'playing'; i++) {
      while (!run.canDrop && run.state === 'playing') run.tick();
      run.drop((aim.next() * 2 - 1) * run.geometry.halfWidth);
    }
    const dropped = of('catDropped').map((d) => d.tier);
    expect(dropped.length).toBeGreaterThan(10);
    expect(dropped.every((tier) => dropPool.includes(tier))).toBe(true);
  });
});

describe('render interpolation', () => {
  it('reports how far the frame is between two ticks, without moving the run', () => {
    const stepper = new FixedStepper();
    expect(stepper.alpha).toBe(0);
    let n = 0;
    stepper.advance(PHYSICS_STEP_MS * 2.25, () => n++);
    expect(n).toBe(2);
    expect(stepper.alpha).toBeCloseTo(0.25, 9);
    stepper.advance(PHYSICS_STEP_MS * 0.5, () => n++);
    expect(n).toBe(2);
    expect(stepper.alpha).toBeCloseTo(0.75, 9);
    stepper.reset();
    expect(stepper.alpha).toBe(0);
    // A long frame drops its leftover time.
    stepper.advance(1000, () => n++);
    expect(stepper.alpha).toBe(0);

    const { run } = setup();
    const hash = run.stateHash();
    run.update(PHYSICS_STEP_MS * 0.6);
    expect(run.ticks).toBe(0);
    expect(run.renderAlpha).toBeCloseTo(0.6, 9);
    expect(run.stateHash()).toBe(hash);
  });
});

describe('determinism through every expansion', () => {
  interface Input {
    readonly tick: number;
    readonly x: number | 'jump';
  }

  function record(seed: number): { inputs: Input[]; hashes: string[] } {
    const run = new RunController({ seed, upgrades: upgrades({ goldenTouch: 3 }) });
    const frames = new Rng(seed * 7 + 1);
    const aim = new Rng(seed + 5);
    const inputs: Input[] = [];
    const hashes: string[] = [];
    let next = 400;
    let jumped = false;
    while (run.ticks < 18 * STEPS_PER_SECOND) {
      if (!jumped && run.ticks >= 3 * STEPS_PER_SECOND) {
        jumped = true;
        run.jumpToStage(5);
        inputs.push({ tick: run.ticks, x: 'jump' });
      }
      if (run.canDrop) {
        const x = (aim.next() * 2 - 1) * run.geometry.halfWidth;
        if (run.drop(x)) inputs.push({ tick: run.ticks, x });
      }
      run.update(3 + frames.next() * 30);
      if (run.ticks >= next) {
        hashes.push(`${run.ticks}:${run.stateHash()}`);
        next += 400;
      }
    }
    expect(run.stage).toBe(5);
    return { inputs, hashes };
  }

  it('replays a jump to stage 5 tick by tick with matching hashes', () => {
    const recorded = record(8);
    const checks = recorded.hashes.map((h) => Number(h.split(':')[0]));
    const run = new RunController({ seed: 8, upgrades: upgrades({ goldenTouch: 3 }) });
    const hashes: string[] = [];
    let i = 0;
    while (run.ticks < Math.max(...checks)) {
      while (i < recorded.inputs.length && recorded.inputs[i]!.tick === run.ticks) {
        const input = recorded.inputs[i++]!;
        if (input.x === 'jump') run.jumpToStage(5);
        else expect(run.drop(input.x)).toBe(true);
      }
      run.tick();
      if (checks.includes(run.ticks)) hashes.push(`${run.ticks}:${run.stateHash()}`);
    }
    expect(hashes).toEqual(recorded.hashes);
  });
});
