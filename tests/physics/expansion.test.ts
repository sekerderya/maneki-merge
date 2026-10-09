import { describe, expect, it } from 'vitest';
import { MAX_SPEED_BASE, PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { STAGE_COUNT, stageInfo } from '../../src/config/stages';
import { tierCoins, tierScore } from '../../src/config/tiers';
import { EXPANSION_DURATION_MS } from '../../src/config/timings';
import { coinPayout, popCoins } from '../../src/core/economy';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Rng } from '../../src/core/rng';
import type { UpgradeLevels } from '../../src/core/upgrades';
import type { BallView } from '../../src/physics/balls';
import { FixedStepper } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';
import type { RunOptions } from '../../src/run/RunController';
import {
  botMove,
  inJar,
  maxWallPenetration,
  replayInput,
  STEPS_PER_SECOND,
  upgrades,
} from './fixtures';
import type { PlayInput } from './fixtures';

const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);

function setup(levels: Partial<UpgradeLevels> = {}, options: Partial<RunOptions> = {}) {
  const events = new EventBus<GameEvents>();
  const log: [keyof GameEvents, unknown][] = [];
  const types: (keyof GameEvents)[] = [
    'dropReady',
    'catPopped',
    'runCoinsChanged',
    'stageCleared',
    'expansionStarted',
    'expansionRevealed',
    'expansionFinished',
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

/** One tick, or, while a stage clear's pick waits, its first option (GAME_DESIGN §15.5). */
function step(run: RunController): void {
  const offer = run.pickOffer;
  if (run.state === 'choosing' && offer) run.choose(offer.options[0]!);
  else run.tick();
}

/** Ticks until the run plays again at `stage` (the timed expansions and picks included). */
function playUntilStage(run: RunController, stage: number): void {
  for (let i = 0; i < 20 * EXPANSION_STEPS; i++) {
    if (run.stage === stage && run.state === 'playing') return;
    step(run);
  }
  throw new Error(`Never reached stage ${stage}`);
}

/** Two cats one below the stage's last cat, one on the other: they merge into the last cat. */
function makeLastCat(run: RunController): void {
  const stage = run.stage;
  const tier = stageInfo(stage).lastTier - 1;
  const r = run.radiusOf(tier);
  run.spawnBall(tier, 0, -r);
  run.spawnBall(tier, 0, -3 * r + 8);
  for (let i = 0; i < 120; i++) {
    run.tick();
    if (run.state !== 'playing' || run.stage !== stage) return;
    if (run.balls.some((b) => b.tier === tier + 1)) return;
  }
  throw new Error('The last cat was never made');
}

/** A cat of the stage's `size` on the floor against the left (-1) or right (+1) wall. */
function spawnAtWall(run: RunController, size: number, side: -1 | 1): BallView {
  const tier = stageInfo(run.stage).firstTier + size - 1;
  const r = run.radiusOf(tier);
  return run.spawnBall(tier, side * (run.geometry.halfWidth - r), -r);
}

describe('clearing stages under a pile (GAME_DESIGN §7.1)', () => {
  it('nothing escapes, jumps or launches through every stage clear up to stage 5', () => {
    const { run } = setup();
    const rng = new Rng(17);

    /** Pours `count` of the stage's dropped cats in from above the rim, in rows. */
    const addPile = (count: number): void => {
      const pool = stageInfo(run.stage).dropPool;
      const { halfWidth, rimY } = run.geometry;
      const cell = 2 * run.radiusOf(pool[pool.length - 1]!) + 8;
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
    const checkTick = (onCat?: (cat: BallView) => void): void => {
      const { halfWidth } = run.geometry;
      for (const cat of run.balls) {
        if (!inJar(cat, halfWidth)) throw new Error(`Cat ${cat.id} escaped at stage ${run.stage}`);
        expect(cat.speed).toBeLessThanOrEqual(MAX_SPEED_BASE + 1e-6);
        onCat?.(cat);
      }
    };

    /**
     * A stage was just cleared: only its last cat is left. It settles during the clear without
     * escaping, then pops, and the jar stays empty through the zoom and the reveal. The new stage
     * then plays on with no launches upwards and no jumps between steps.
     */
    const followExpansion = (): void => {
      expansions++;
      expect(run.balls).toHaveLength(1);
      const last = run.balls[0]!;
      expect(last.tier).toBe(stageInfo(run.stage).lastTier);
      while (run.expansion?.phase === 'clear') {
        step(run);
        checkTick();
      }
      expect(run.balls).not.toContain(last);
      expect(run.balls).toHaveLength(0);
      while (run.state === 'expanding') {
        run.tick();
        expect(run.balls).toHaveLength(0);
      }
      addPile(12);
      const prev = new Map<number, [number, number]>();
      for (let t = 0; t < 1.5 * STEPS_PER_SECOND && run.state === 'playing'; t++) {
        run.tick();
        checkTick((cat) => {
          if (cat.landedMs >= 0) worstUpward = Math.max(worstUpward, -cat.vy / MAX_SPEED_BASE);
          const p = prev.get(cat.id);
          if (p) {
            const moved = Math.hypot(cat.x - p[0], cat.y - p[1]);
            worstStep = Math.max(worstStep, moved / ((MAX_SPEED_BASE * PHYSICS_STEP_MS) / 1000));
          }
          prev.set(cat.id, [cat.x, cat.y]);
        });
      }
    };

    /** Plays `seconds` with the invariants checked on every tick. */
    const play = (seconds: number): void => {
      for (let t = 0; t < seconds * STEPS_PER_SECOND; t++) {
        run.tick();
        expect(run.state).not.toBe('over');
        expect(run.state).toBe('playing');
        checkTick();
      }
      expect(maxWallPenetration(run.balls, run.geometry.halfWidth)).toBeLessThan(0.15);
    };

    for (let stage = 1; stage < STAGE_COUNT; stage++) {
      addPile(30);
      play(2.5);
      // The last cat is made on top of the pile: the whole pile pops at once.
      makeLastCat(run);
      expect(run.state).toBe('expanding');
      followExpansion();
      expect(run.stage).toBe(stage + 1);
    }
    addPile(30);
    play(2.5);
    expect(expansions).toBe(STAGE_COUNT - 1);
    // Upward speeds stay far below the limit (TECH_SPEC §5), and nothing teleports.
    expect(worstUpward).toBeLessThan(0.2);
    expect(worstStep).toBeLessThan(1.5);
  });
});

describe('stage clear payouts (GAME_DESIGN §7)', () => {
  it("pays every other cat's value, oldest first, with multipliers, at every stage", () => {
    const luckyPaw = 4;
    const { run, log, banked } = setup({ luckyPaw });
    const multiplier = run.stats.coinMultiplier;
    expect(multiplier).toBeCloseTo(1.6, 12);

    for (let stage = 1; stage < STAGE_COUNT; stage++) {
      expect(run.stage).toBe(stage);
      // Two cats apart from each other, so they can't merge.
      spawnAtWall(run, 3, -1);
      spawnAtWall(run, 2, 1);
      ticks(run, STEPS_PER_SECOND);
      const doomed = [...run.balls];
      const coinsBefore = run.coins;
      const bankedBefore = banked();
      const logStart = log.length;

      makeLastCat(run);
      const these = log
        .slice(logStart)
        .filter((e) => e[0] === 'catPopped')
        .map((e) => e[1] as GameEvents['catPopped']);
      expect(these.map((p) => [p.id, p.tier, p.reason])).toEqual(
        doomed.map((c) => [c.id, c.tier, 'cashOut']),
      );
      const pops = doomed.reduce((sum, c) => sum + popCoins(c.tier, multiplier), 0);
      const merge = coinPayout(tierCoins(stageInfo(stage).lastTier - 1), multiplier, 0);
      expect(these.reduce((sum, p) => sum + p.coins, 0)).toBe(pops);
      expect(run.coins - coinsBefore).toBe(merge + pops);
      expect(banked() - bankedBefore).toBe(merge + pops);

      playUntilStage(run, stage + 1);
      // Order: the merge, the pops and their total, the clear, the last cat's pop once it
      // settled, then the expansion.
      const sequence = log
        .slice(logStart)
        .map((e) => e[0])
        .filter((t) => t !== 'catDropped' && t !== 'dropReady');
      expect(sequence).toEqual([
        'merged',
        'runCoinsChanged',
        ...doomed.map(() => 'catPopped'),
        'runCoinsChanged',
        'stageCleared',
        'catPopped',
        'runCoinsChanged',
        'expansionStarted',
        'expansionRevealed',
        'expansionFinished',
      ]);
    }
    // Spot checks of the rounding: tier 3 at ×1.6 → 1.5 × 1.6 = 2.4 → 2.
    expect(popCoins(3, multiplier)).toBe(2);
    expect(popCoins(21, multiplier)).toBe(32_514);
  });

  it('announces the tiers each stage adds when the zoom ends and when play resumes', () => {
    const { run, of } = setup();
    run.jumpToStage(STAGE_COUNT);
    playUntilStage(run, STAGE_COUNT);
    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => from + i);
    const expected = [range(10, 18), range(19, 27), range(28, 36), range(37, 45)];
    expect(of('expansionRevealed').map((e) => e.newTiers)).toEqual(expected);
    expect(of('expansionFinished').map((e) => e.newTiers)).toEqual(expected);
    expect(of('expansionRevealed').map((e) => e.stage)).toEqual([2, 3, 4, 5]);
  });
});

describe('time stop (GAME_DESIGN §7.1)', () => {
  it('freezes play time and the combo window during the zoom and the reveal', () => {
    const { run } = setup();
    makeLastCat(run);
    expect(run.combo).toBe(1);
    while (run.expansion?.phase === 'clear') step(run);
    // The clear took 0.5 s of the 1 s combo window; the rest waits for the picks, the zoom and the
    // reveal.
    const playTime = run.playTimeMs;
    expect(run.combo).toBe(1);
    playUntilStage(run, 2);
    expect(run.playTimeMs).toBe(playTime);
    expect(run.combo).toBe(1);
    ticks(run, 0.6 * STEPS_PER_SECOND);
    expect(run.combo).toBe(0);
  });
});

describe('every stage: Jackpots and drop pools (GAME_DESIGN §5, §7, §8)', () => {
  it.each([1, 2, 3, 4, 5])('stage %i', (stage) => {
    const { run, of } = setup({ luckyPaw: 2 }, { instantExpansion: true });
    if (stage > 1) run.jumpToStage(stage);
    run.tick();
    expect(run.stage).toBe(stage);
    const { lastTier, dropPool } = stageInfo(stage);
    const multiplier = run.stats.coinMultiplier;

    // Two last cats: a Jackpot (2 × S(last), 5 × C(last) × multipliers), both gone.
    const r = run.radiusOf(lastTier);
    run.spawnBall(lastTier, 0, -r);
    run.spawnBall(lastTier, 0, -3 * r + 8);
    for (let i = 0; i < 60 && of('jackpot').length === 0; i++) run.tick();
    expect(of('jackpot')).toEqual([
      expect.objectContaining({
        tier: lastTier,
        score: 2 * tierScore(lastTier),
        coins: coinPayout(5 * tierCoins(lastTier), multiplier, 0),
      }),
    ]);
    expect(run.balls.some((b) => b.tier === lastTier)).toBe(false);

    // Every cat the dropper hands out comes from this stage's pool.
    ticks(run, 2 * STEPS_PER_SECOND);
    const aim = new Rng(stage);
    for (let i = 0; i < 25 && run.state === 'playing'; i++) {
      while (!run.canDrop && !run.canTake && run.state === 'playing') run.tick();
      botMove(run, (aim.next() * 2 - 1) * run.geometry.halfWidth);
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
    readonly input: PlayInput | 'jump';
  }

  function record(seed: number): { inputs: Input[]; hashes: string[] } {
    const run = new RunController({ seed, upgrades: upgrades({ comboCharm: 3 }) });
    run.setPickLevel('moreMagnets', 5);
    run.setPickLevel('moreBoulders', 5);
    const frames = new Rng(seed * 7 + 1);
    const aim = new Rng(seed + 5);
    const inputs: Input[] = [];
    const hashes: string[] = [];
    let next = 400;
    let jumped = false;
    while (run.ticks < 18 * STEPS_PER_SECOND) {
      if (!jumped && run.ticks >= 3 * STEPS_PER_SECOND && run.state === 'playing') {
        jumped = true;
        run.jumpToStage(5);
        inputs.push({ tick: run.ticks, input: 'jump' });
      }
      const move = botMove(run, (aim.next() * 2 - 1) * run.geometry.halfWidth, aim.next());
      if (move) inputs.push({ tick: run.ticks, input: move });
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
    const run = new RunController({ seed: 8, upgrades: upgrades({ comboCharm: 3 }) });
    run.setPickLevel('moreMagnets', 5);
    run.setPickLevel('moreBoulders', 5);
    const hashes: string[] = [];
    let i = 0;
    while (run.ticks < Math.max(...checks)) {
      while (i < recorded.inputs.length && recorded.inputs[i]!.tick === run.ticks) {
        const { input } = recorded.inputs[i++]!;
        if (input === 'jump') run.jumpToStage(5);
        else expect(replayInput(run, input)).toBe(true);
      }
      run.tick();
      if (checks.includes(run.ticks)) hashes.push(`${run.ticks}:${run.stateHash()}`);
    }
    expect(hashes).toEqual(recorded.hashes);
  });
});
