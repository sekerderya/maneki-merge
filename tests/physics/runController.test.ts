import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius, STAGE_ZOOM } from '../../src/config/tiers';
import {
  DANGER_TIMEOUT_MS,
  DROP_COOLDOWN_MS,
  EXPANSION_CLEAR_MS,
  EXPANSION_DURATION_MS,
  EXPANSION_ZOOM_MS,
  LUCKY_SAVE_GRACE_MS,
} from '../../src/config/timings';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { defaultUpgradeLevels } from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { RunController } from '../../src/run/RunController';
import type { RunOptions } from '../../src/run/RunController';

const EVENT_TYPES: readonly (keyof GameEvents)[] = [
  'runStarted',
  'catDropped',
  'dropReady',
  'merged',
  'jackpot',
  'catPopped',
  'scoreChanged',
  'runCoinsChanged',
  'comboChanged',
  'dangerChanged',
  'dangerTick',
  'stageCleared',
  'expansionStarted',
  'expansionRevealed',
  'expansionFinished',
  'luckySave',
  'paused',
  'resumed',
  'gameOver',
];

type Entry = { [K in keyof GameEvents]: [K, GameEvents[K]] }[keyof GameEvents] | ['bank', number];

function upgrades(levels: Partial<UpgradeLevels>): UpgradeLevels {
  return { ...defaultUpgradeLevels(), ...levels };
}

function setup(options: Partial<RunOptions> = {}) {
  const events = new EventBus<GameEvents>();
  const log: Entry[] = [];
  for (const type of EVENT_TYPES) {
    events.on(type, (payload) => log.push([type, payload] as Entry));
  }
  const run = new RunController({
    seed: 7,
    events,
    bank: (coins) => log.push(['bank', coins]),
    ...options,
  });
  const of = <K extends keyof GameEvents>(type: K): GameEvents[K][] =>
    log.filter((e) => e[0] === type).map((e) => e[1] as GameEvents[K]);
  const types = () => log.map((e) => e[0]);
  return { run, log, of, types };
}

function ticks(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) run.tick();
}

/** Two same-tier cats resting side by side on the floor, overlapping by 2 units. */
function spawnPair(run: RunController, tier: number, centre = 0) {
  const r = run.radiusOf(tier);
  run.spawnBall(tier, centre - r + 1, -r);
  run.spawnBall(tier, centre + r - 1, -r);
}

const COOLDOWN_STEPS = stepsFor(DROP_COOLDOWN_MS);
const CLEAR_STEPS = stepsFor(EXPANSION_CLEAR_MS);
const ZOOM_STEPS = stepsFor(EXPANSION_ZOOM_MS);
const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);

describe('starting a run', () => {
  it('announces the run and the first cat', () => {
    const { run, log } = setup();
    expect(log).toEqual([
      ['runStarted', { seed: 7, stage: 1 }],
      ['dropReady', { tier: 1 }],
    ]);
    expect(run.state).toBe('playing');
    expect(run.stage).toBe(1);
    expect(run.score).toBe(0);
    expect(run.coins).toBe(0);
    expect(run.combo).toBe(0);
    expect(run.canDrop).toBe(true);
    expect(run.next.tier).toBe(1);
    expect(run.luckySavesLeft).toBe(0);
    expect(run.progress).toEqual({ fraction: 0, goalTier: 10, final: false });
    expect(run.expansion).toBeNull();
  });

  it('applies the upgrades', () => {
    const { run } = setup({ upgrades: upgrades({ goldenMerge: 3, secondChance: 2 }) });
    expect(run.luckySavesLeft).toBe(2);
    expect(run.stats.goldenChance).toBeCloseTo(0.09, 10);
  });

  it('works without a bus or a bank and rejects a bad seed', () => {
    const run = new RunController({ seed: 1 });
    expect(run.events.listenerCount('merged')).toBe(0);
    spawnPair(run, 1);
    run.tick();
    expect(run.coins).toBe(1);
    expect(() => new RunController({ seed: Number.NaN })).toThrow(RangeError);
  });
});

describe('dropping (GAME_DESIGN §3, §8)', () => {
  it('drops the current cat at the dropper, clamped inside the jar', () => {
    const { run, of } = setup();
    const next = run.next;
    expect(run.drop(9999)).toBe(true);
    const cat = run.balls[0]!;
    expect(cat.tier).toBe(1);
    expect(cat.x).toBe(300 - sizeRadius(1));
    expect(cat.y).toBe(run.geometry.dropY);
    expect(of('catDropped')).toEqual([{ tier: 1, x: 300 - sizeRadius(1) }]);
    expect(run.current).toEqual(next);
  });

  it('ignores drops during the 0.45 s cooldown and announces the next cat once', () => {
    const { run, of } = setup();
    run.drop(0);
    expect(run.canDrop).toBe(false);
    expect(run.cooldownRemainingMs).toBeCloseTo(DROP_COOLDOWN_MS, 6);
    expect(run.drop(50)).toBe(false);
    ticks(run, COOLDOWN_STEPS - 1);
    expect(run.drop(50)).toBe(false);
    expect(of('dropReady')).toHaveLength(1);
    run.tick();
    expect(run.canDrop).toBe(true);
    expect(run.cooldownRemainingMs).toBe(0);
    expect(of('dropReady')).toHaveLength(2);
    ticks(run, 10);
    expect(of('dropReady')).toHaveLength(2);
    expect(run.drop(50)).toBe(true);
    expect(run.balls).toHaveLength(2);
  });

  it('starts every run with the two smallest cats and rejects a non-finite x', () => {
    const { run } = setup();
    expect(run.drop(Number.NaN)).toBe(false);
    run.drop(-100);
    ticks(run, COOLDOWN_STEPS);
    run.drop(100);
    expect(run.balls.map((b) => b.tier)).toEqual([1, 1]);
  });
});

describe('merges and payouts (GAME_DESIGN §5, §9)', () => {
  it('pays a merge, banking the coins before the events fire', () => {
    const { run, log, of } = setup();
    spawnPair(run, 3, 40);
    log.length = 0;
    run.tick();
    expect(log.map((e) => e[0])).toEqual([
      'bank',
      'merged',
      'scoreChanged',
      'runCoinsChanged',
      'comboChanged',
    ]);
    const [merged] = of('merged');
    expect(merged).toMatchObject({ tier: 3, newTier: 4, golden: false, score: 8, coins: 3 });
    expect(merged!.combo).toBe(1);
    expect(merged!.at.x).toBeCloseTo(40, 0);
    expect(log[0]).toEqual(['bank', 3]);
    expect(of('scoreChanged')).toEqual([{ score: 8 }]);
    expect(of('runCoinsChanged')).toEqual([{ coins: 3 }]);
    expect(run.balls.map((b) => b.tier)).toEqual([4]);
    expect(merged!.id).toBe(run.balls[0]!.id);
    expect(run.highestTier).toBe(4);
  });

  it('makes about 3% of merges per Golden Merge level golden, paying ×3', () => {
    const goldenShare = (level: number): number => {
      let golden = 0;
      for (let seed = 0; seed < 400; seed++) {
        const run = new RunController({ seed, upgrades: upgrades({ goldenMerge: level }) });
        const merges: GameEvents['merged'][] = [];
        run.events.on('merged', (e) => merges.push(e));
        spawnPair(run, 3);
        run.tick();
        const [merge] = merges;
        expect(merge!.coins).toBe(merge!.golden ? 9 : 3); // C(3) = 3
        if (merge!.golden) golden++;
      }
      return golden / 400;
    };
    expect(goldenShare(0)).toBe(0);
    expect(goldenShare(5)).toBeGreaterThan(0.1);
    expect(goldenShare(5)).toBeLessThan(0.2);
  });

  it('rolls every merge, so Golden Merge never changes the drops of a seed', () => {
    const drops = (level: number): number[] => {
      const run = new RunController({ seed: 3, upgrades: upgrades({ goldenMerge: level }) });
      const tiers: number[] = [];
      for (let i = 0; i < 40; i++) {
        spawnPair(run, 1, (i % 2) * 200 - 100);
        tiers.push(run.current.tier);
        run.drop(0);
        ticks(run, COOLDOWN_STEPS);
      }
      return tiers;
    };
    expect(drops(5)).toEqual(drops(0));
  });

  it('applies Lucky Paw', () => {
    const lucky = setup({ upgrades: upgrades({ luckyPaw: 2 }) });
    spawnPair(lucky.run, 3);
    lucky.run.tick();
    expect(lucky.of('merged')[0]!.coins).toBe(4); // 3 × 1.3 = 3.9
  });

  it('raises the combo within 1 s and resets it after the window', () => {
    const { run, of } = setup({ upgrades: upgrades({ comboCharm: 5 }) });
    spawnPair(run, 4, -150);
    run.tick();
    ticks(run, 60);
    spawnPair(run, 4, 150);
    run.tick();
    expect(of('merged').map((m) => [m.combo, m.coins])).toEqual([
      [1, 5],
      [2, 7], // 5 × (1 + 0.4) = 7
    ]);
    expect(run.combo).toBe(2);
    ticks(run, 125);
    expect(run.combo).toBe(0);
    expect(of('comboChanged')).toEqual([{ combo: 1 }, { combo: 2 }, { combo: 0 }]);
  });

  it('makes a Jackpot from two of the stage last cat', () => {
    const { run, of } = setup();
    const last = stageInfo(1).lastTier;
    const r = sizeRadius(10);
    run.spawnBall(last, 0, -r);
    run.spawnBall(last, 0, -3 * r + 2);
    run.tick();
    expect(of('jackpot')).toEqual([
      expect.objectContaining({ tier: last, golden: false, score: 2048, coins: 595, combo: 1 }),
    ]);
    expect(run.balls).toHaveLength(0);
    expect(run.score).toBe(2048);
    expect(of('stageCleared')).toEqual([]);
  });
});

/**
 * Two cats one tier below the stage's last cat, one on the other in the middle of the jar: they
 * merge into the last cat within a few steps.
 */
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

describe('stage clears (GAME_DESIGN §7)', () => {
  it('pops every other cat into its value when the last cat is made, then grows the jar', () => {
    const { run, log, of, types } = setup();
    run.spawnBall(1, -270, -28);
    run.spawnBall(3, 260, -42);
    ticks(run, 60);
    const small = run.balls.map((b) => b.id);
    log.length = 0;
    makeLastCat(run);

    // The merge pays, then the others pop oldest first, then the stage is cleared.
    expect(types()).toEqual([
      'bank',
      'merged',
      'scoreChanged',
      'runCoinsChanged',
      'comboChanged',
      'bank',
      'catPopped',
      'bank',
      'catPopped',
      'runCoinsChanged',
      'stageCleared',
    ]);
    expect(of('merged')).toEqual([
      expect.objectContaining({ tier: 9, newTier: 10, newSize: 10, score: 512, coins: 70 }),
    ]);
    // Their value is half of C(t): tier 1 → 0.5, paid as the 1-coin minimum; tier 3 → 1.5 → 2.
    expect(of('catPopped').map((p) => [p.id, p.tier, p.coins, p.reason])).toEqual([
      [small[0], 1, 1, 'cashOut'],
      [small[1], 3, 2, 'cashOut'],
    ]);
    expect(of('stageCleared')).toEqual([{ stage: 1, tier: 10, next: 'expand' }]);
    expect(run.coins).toBe(70 + 3);
    expect(run.balls.map((b) => b.tier)).toEqual([10]);
    expect(run.progress.fraction).toBe(1);
    expect(run.state).toBe('expanding');
    expect(run.expansion).toMatchObject({ from: 1, to: 2, phase: 'clear', zoomProgress: 0 });
    expect(run.canDrop).toBe(false);
    expect(run.drop(0)).toBe(false);
  });

  it('lets the last cat settle, stops time for the zoom, then rescales the world', () => {
    const { run, of, types } = setup();
    makeLastCat(run);
    const last = run.balls[0]!;
    expect(last.tier).toBe(10);
    const queue = [run.current, run.next];

    // The stage clear: physics runs (the last cat finishes growing and falls), nothing else.
    const playTime = run.playTimeMs;
    ticks(run, CLEAR_STEPS - 1);
    expect(run.expansion?.phase).toBe('clear');
    expect(run.playTimeMs).toBeGreaterThan(playTime);
    expect(last.radius).toBe(sizeRadius(10));
    expect(of('expansionStarted')).toEqual([]);
    run.tick();
    expect(run.expansion?.phase).toBe('zoom');
    expect(of('expansionStarted')).toEqual([{ from: 1, to: 2 }]);

    // The zoom: time stands still.
    const frozen = [last.x, last.y];
    const time = run.playTimeMs;
    ticks(run, ZOOM_STEPS / 2);
    expect([last.x, last.y]).toEqual(frozen);
    expect(run.playTimeMs).toBe(time);
    expect(run.expansion!.zoomProgress).toBeCloseTo(0.5, 9);
    expect(run.expansion!.elapsedMs).toBeCloseTo(EXPANSION_CLEAR_MS + EXPANSION_ZOOM_MS / 2, 6);
    expect(run.stage).toBe(1);

    // The reveal: the jar has grown more than sevenfold, so the world shrinks by as much.
    ticks(run, ZOOM_STEPS / 2);
    expect(run.expansion).toMatchObject({ phase: 'reveal', zoomProgress: 1 });
    expect(run.stage).toBe(2);
    expect(run.geometry.width).toBe(600);
    expect(last.size).toBe(1);
    expect(last.radius).toBeCloseTo(sizeRadius(1), 9);
    expect(last.x).toBeCloseTo(frozen[0]! / STAGE_ZOOM, 9);
    expect(last.y).toBeCloseTo(frozen[1]! / STAGE_ZOOM, 9);
    // Queued cats keep their size: a 1 becomes a 10, a 3 a 12.
    expect([run.current, run.next]).toEqual(queue.map((d) => ({ tier: d.tier + 9 })));
    const newTiers = [11, 12, 13, 14, 15, 16, 17, 18, 19];
    expect(of('expansionRevealed')).toEqual([{ stage: 2, newTiers }]);
    expect(run.progress).toEqual({ fraction: 0, goalTier: 19, final: false });

    ticks(run, EXPANSION_STEPS - CLEAR_STEPS - ZOOM_STEPS - 1);
    expect(run.state).toBe('expanding');
    run.tick();
    expect(run.state).toBe('playing');
    expect(run.expansion).toBeNull();
    expect(of('expansionFinished')).toEqual([{ stage: 2, newTiers }]);
    expect(types().slice(-2)).toEqual(['expansionFinished', 'dropReady']);
    expect(run.canDrop).toBe(true);
    // Stage 2 plays like stage 1: the 10 lands like a tier-1 cat did.
    ticks(run, 240);
    expect(last.y).toBeCloseTo(-sizeRadius(1), 0);
  });

  it('opens every stage: each clear grows the jar into the next one', () => {
    const { run, of } = setup({ instantExpansion: true });
    for (let stage = 1; stage < 5; stage++) {
      expect(run.stage).toBe(stage);
      makeLastCat(run);
    }
    expect(run.stage).toBe(5);
    expect(of('stageCleared').map((e) => e.next)).toEqual(['expand', 'expand', 'expand', 'expand']);
    expect(of('expansionFinished').map((e) => e.stage)).toEqual([2, 3, 4, 5]);
    // Each last cat became the next stage's first.
    expect(run.balls.map((b) => b.tier)).toEqual([37]);
    expect(run.progress).toEqual({ fraction: 0, goalTier: 46, final: true });
  });

  it('plays on after clearing the last stage, again and again', () => {
    const { run, of } = setup({ instantExpansion: true });
    run.jumpToStage(5);
    expect(run.stage).toBe(5);
    makeLastCat(run);
    expect(of('stageCleared').at(-1)).toEqual({ stage: 5, tier: 46, next: 'final' });
    expect(run.state).toBe('playing');
    expect(run.stage).toBe(5);
    expect(run.progress).toEqual({ fraction: 1, goalTier: 46, final: true });
    // A second 46: its clear pops the first one, so it stays alone in the jar.
    makeLastCat(run);
    expect(
      of('stageCleared')
        .map((e) => e.next)
        .slice(-2),
    ).toEqual(['final', 'final']);
    expect(run.balls.map((b) => b.tier)).toEqual([46]);
    expect(of('jackpot')).toEqual([]);
  });

  it('jumps (debug) through the stages, one expansion at a time', () => {
    const { run, of } = setup();
    run.jumpToStage(4);
    expect(run.state).toBe('expanding');
    for (let i = 0; i < 4 * EXPANSION_STEPS; i++) {
      if (run.stage === 4 && run.state === 'playing') break;
      run.tick();
    }
    expect(run.stage).toBe(4);
    expect(of('expansionStarted')).toEqual([
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ]);
    expect(run.balls.map((b) => b.tier)).toEqual([28]);

    // Ignored: the current stage, a lower one, or one that doesn't exist.
    const hash = run.stateHash();
    run.jumpToStage(4);
    run.jumpToStage(2);
    run.jumpToStage(6);
    run.jumpToStage(4.5);
    expect(run.stateHash()).toBe(hash);
    expect(() => run.spawnBall(27, 0)).toThrow(RangeError);

    // Stage 5 is open like every other.
    makeLastCat(run);
    expect(run.expansion).toMatchObject({ from: 4, to: 5 });
  });

  it('sets the score for records only', () => {
    const { run, of } = setup();
    run.setScore(1_000_000);
    ticks(run, 10);
    expect(run.stage).toBe(1);
    expect(of('scoreChanged')).toEqual([{ score: 1_000_000 }]);
  });
});

/** A stack of big, different-tier cats (so none merge) that pokes over the stage-1 rim. */
function buildTower(run: RunController): void {
  run.spawnBall(10, 0, -168);
  run.spawnBall(9, 0, -480);
  run.spawnBall(8, 0, -740);
  run.spawnBall(7, 0, -950);
  run.spawnBall(6, 0, -1120);
}

describe('danger, Lucky Save and game over (GAME_DESIGN §6)', () => {
  it('ends the run after a cat stays over the line for 2.5 s', () => {
    const { run, of } = setup();
    buildTower(run);
    let steps = 0;
    while (run.state === 'playing' && steps < 120 * 10) {
      run.tick();
      steps++;
    }
    expect(run.state).toBe('over');
    const danger = of('dangerChanged');
    expect(danger[0]!.active).toBe(true);
    expect(danger[0]!.remainingMs).toBeCloseTo(DANGER_TIMEOUT_MS - PHYSICS_STEP_MS, 6);
    // The countdown ticks once per whole second: 3, 2, 1 for a 2.5 s timeout.
    expect(of('dangerTick').map((t) => t.secondsLeft)).toEqual([3, 2, 1]);
    expect(of('gameOver')).toEqual([{ score: 0, stage: 1, coins: 0, highestTier: 0 }]);

    // Physics stops and input is ignored.
    const time = run.playTimeMs;
    ticks(run, 60);
    run.update(1000);
    expect(run.playTimeMs).toBe(time);
    expect(run.drop(0)).toBe(false);
    run.pause();
    expect(run.state).toBe('over');
    run.forceGameOver();
    expect(of('gameOver')).toHaveLength(1);
  });

  it('replaces the game over with a Lucky Save that pops cats into coins', () => {
    const { run, of } = setup({ upgrades: upgrades({ secondChance: 1 }) });
    buildTower(run);
    run.spawnBall(1, -250, -27);
    let steps = 0;
    while (of('luckySave').length === 0 && steps < 120 * 10) {
      run.tick();
      steps++;
    }
    expect(of('luckySave')).toEqual([{ savesLeft: 0 }]);
    expect(run.luckySavesLeft).toBe(0);
    const popped = of('catPopped');
    expect(popped.every((p) => p.reason === 'luckySave')).toBe(true);
    // Fewer than 6 other cats: the whole jar pops.
    expect(popped.map((p) => p.tier).sort((a, b) => a - b)).toEqual([1, 6, 7, 8, 9, 10]);
    expect(run.balls).toHaveLength(0);
    // Each pays its value, half of C(t): 0.5 → 1, 7, 12, 20.5 → 21, 35, 59.5 → 60.
    expect(run.coins).toBe(1 + 7 + 12 + 21 + 35 + 60);
    expect(of('dangerChanged').at(-1)).toEqual({ active: false, remainingMs: DANGER_TIMEOUT_MS });
    expect(run.state).toBe('playing');

    // The danger check stays off for 2 s.
    buildTower(run);
    ticks(run, stepsFor(LUCKY_SAVE_GRACE_MS));
    expect(run.dangerActive).toBe(false);
  });

  it('can be forced (debug)', () => {
    const { run, of } = setup();
    spawnPair(run, 2);
    run.tick();
    run.forceGameOver();
    expect(run.state).toBe('over');
    expect(of('gameOver')).toEqual([{ score: 4, stage: 1, coins: 2, highestTier: 3 }]);
  });
});

describe('pause and frame timing', () => {
  it('pauses and resumes, also in the middle of an expansion', () => {
    const { run, of } = setup();
    run.pause();
    expect(run.state).toBe('paused');
    expect(run.drop(0)).toBe(false);
    run.update(1000);
    ticks(run, 10);
    expect(run.ticks).toBe(0);
    run.resume();
    run.resume();
    expect(run.state).toBe('playing');
    expect(of('paused')).toHaveLength(1);
    expect(of('resumed')).toHaveLength(1);

    run.jumpToStage(2);
    run.tick();
    run.pause();
    run.pause();
    ticks(run, 500);
    run.resume();
    expect(run.state).toBe('expanding');
    expect(of('paused')).toHaveLength(2);
  });

  it('turns frame time into fixed ticks, at most 5 per frame', () => {
    const { run } = setup();
    run.update(1000 / 60);
    expect(run.ticks).toBe(2);
    run.update(1000);
    expect(run.ticks).toBe(7);
    expect(run.playTimeMs).toBeCloseTo(7 * PHYSICS_STEP_MS, 9);
  });

  it('spawns debug cats at the dropper by default', () => {
    const { run } = setup();
    const cat = run.spawnBall(5, 0);
    expect(cat.y).toBe(run.geometry.dropY);
    expect(run.stateHash()).toMatch(/^[0-9a-f]{8}$/);
  });
});
