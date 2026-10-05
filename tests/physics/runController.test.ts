import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { stageInfo } from '../../src/config/stages';
import { tierRadius } from '../../src/config/tiers';
import {
  DANGER_TIMEOUT_MS,
  DROP_COOLDOWN_MS,
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
  'expansionStarted',
  'expansionFinished',
  'expansionLocked',
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
function spawnPair(run: RunController, tier: number, centre = 0, golden = false) {
  const r = tierRadius(tier);
  run.spawnBall(tier, centre - r + 1, -r, golden);
  run.spawnBall(tier, centre + r - 1, -r);
}

const COOLDOWN_STEPS = stepsFor(DROP_COOLDOWN_MS);
const ZOOM_STEPS = stepsFor(EXPANSION_ZOOM_MS);
const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);

describe('starting a run', () => {
  it('announces the run and the first cat', () => {
    const { run, log } = setup();
    expect(log).toEqual([
      ['runStarted', { seed: 7, stage: 1 }],
      ['dropReady', { tier: 1, golden: false }],
    ]);
    expect(run.state).toBe('playing');
    expect(run.stage).toBe(1);
    expect(run.score).toBe(0);
    expect(run.coins).toBe(0);
    expect(run.combo).toBe(0);
    expect(run.canDrop).toBe(true);
    expect(run.preview).toHaveLength(1);
    expect(run.luckySavesLeft).toBe(0);
    expect(run.progress).toEqual({ fraction: 0, target: 500, locked: false });
    expect(run.expansion).toBeNull();
  });

  it('applies the upgrades', () => {
    const { run } = setup({ upgrades: upgrades({ fortuneTeller: 1, secondChance: 2 }) });
    expect(run.preview).toHaveLength(2);
    expect(run.luckySavesLeft).toBe(2);
    expect(run.stats.previewCount).toBe(2);
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
    const next = run.preview[0]!;
    expect(run.drop(9999)).toBe(true);
    const cat = run.balls[0]!;
    expect(cat.tier).toBe(1);
    expect(cat.x).toBe(300 - tierRadius(1));
    expect(cat.y).toBe(run.geometry.dropY);
    expect(of('catDropped')).toEqual([{ tier: 1, golden: false, x: 300 - tierRadius(1) }]);
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
    expect(run.highestTier).toBe(4);
  });

  it('pays ×3 for a golden cat and applies Lucky Paw', () => {
    const golden = setup();
    spawnPair(golden.run, 3, 0, true);
    golden.run.tick();
    expect(golden.of('merged')[0]).toMatchObject({ golden: true, coins: 9 });

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

  it('makes a Jackpot from two cap-tier cats', () => {
    const { run, of } = setup();
    const cap = stageInfo(1).tierCap;
    spawnPair(run, cap);
    run.tick();
    expect(of('jackpot')).toEqual([
      expect.objectContaining({ tier: cap, golden: false, score: 256, coins: 120, combo: 1 }),
    ]);
    expect(run.balls).toHaveLength(0);
    expect(run.score).toBe(256);
  });
});

describe('the expansion timeline (GAME_DESIGN §7.1)', () => {
  it('stops time, zooms, cashes out, then resumes at the new stage', () => {
    const { run, of, types } = setup({ upgrades: upgrades({ shrineExpansion: 1 }) });
    run.setScore(500);
    run.tick();
    expect(run.state).toBe('expanding');
    expect(of('expansionStarted')).toEqual([{ from: 1, to: 2 }]);
    expect(run.canDrop).toBe(false);
    expect(run.drop(0)).toBe(false);
    expect(run.expansion).toMatchObject({ from: 1, to: 2, progress: 0, phase: 'zoom' });

    // Time stop: cats freeze and play time stands still.
    const cat = run.spawnBall(2, 0, -400);
    const playTime = run.playTimeMs;
    ticks(run, ZOOM_STEPS / 2);
    expect(cat.y).toBe(-400);
    expect(run.playTimeMs).toBe(playTime);
    expect(run.expansion!.zoomProgress).toBeCloseTo(0.5, 9);
    expect(run.expansion!.elapsedMs).toBeCloseTo(EXPANSION_ZOOM_MS / 2, 6);

    ticks(run, ZOOM_STEPS / 2);
    expect(run.expansion).toMatchObject({ phase: 'reveal', zoomProgress: 1 });
    expect(run.stage).toBe(2);
    expect(run.geometry.width).toBe(780);

    ticks(run, EXPANSION_STEPS - ZOOM_STEPS - 1);
    expect(run.state).toBe('expanding');
    run.tick();
    expect(run.state).toBe('playing');
    expect(run.expansion).toBeNull();
    expect(of('expansionFinished')).toEqual([{ stage: 2, newTiers: [8, 9] }]);
    expect(types().slice(-2)).toEqual(['expansionFinished', 'dropReady']);
    expect(run.canDrop).toBe(true);
    run.tick();
    expect(cat.y).toBeGreaterThan(-400);
  });

  it('pops the cats too small for the new stage into coins and re-rolls the queue', () => {
    const { run, of } = setup({
      upgrades: upgrades({ shrineExpansion: 1 }),
      instantExpansion: true,
    });
    run.setScore(500);
    run.tick();
    expect(run.stage).toBe(2);
    expect(run.current.tier).toBe(1);

    run.spawnBall(1, -200, -27, true);
    run.spawnBall(1, 200, -27);
    run.spawnBall(2, 0, -33);
    run.setScore(3000);
    const coins = run.coins;
    run.tick();
    expect(run.stage).toBe(3);
    expect(of('catPopped').map((p) => [p.tier, p.golden, p.coins, p.reason])).toEqual([
      [1, true, 3, 'cashOut'],
      [1, false, 1, 'cashOut'],
    ]);
    expect(run.coins).toBe(coins + 4);
    expect(run.balls.map((b) => b.tier)).toEqual([2]);
    // Stage 3 drops tiers 2–6: the queued tier-1 cats were rolled again.
    expect(run.current.tier).toBeGreaterThanOrEqual(2);
    expect(run.preview.every((d) => d.tier >= 2)).toBe(true);
  });

  it('expands one stage at a time when several thresholds pass at once', () => {
    const { run, of } = setup({
      upgrades: upgrades({ shrineExpansion: 3 }),
      instantExpansion: true,
    });
    run.setScore(50_000);
    run.tick();
    expect(of('expansionStarted')).toEqual([
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
    ]);
    expect(of('expansionFinished').map((e) => e.newTiers)).toEqual([
      [8, 9],
      [10, 11],
      [12, 13],
      [14, 15],
    ]);
    expect(run.stage).toBe(5);
    expect(run.state).toBe('playing');
    expect(run.progress).toEqual({ fraction: 1, target: null, locked: false });
  });

  it('chains timed expansions too', () => {
    const { run, of } = setup({ upgrades: upgrades({ shrineExpansion: 1 }) });
    run.setScore(3000);
    ticks(run, 1 + EXPANSION_STEPS);
    expect(run.stage).toBe(2);
    expect(run.state).toBe('expanding');
    ticks(run, EXPANSION_STEPS);
    expect(run.stage).toBe(3);
    expect(run.state).toBe('playing');
    expect(of('expansionFinished').map((e) => e.stage)).toEqual([2, 3]);
  });

  it('announces a locked stage once per run', () => {
    const { run, of } = setup({ instantExpansion: true });
    run.setScore(3000);
    run.tick();
    expect(run.stage).toBe(2);
    expect(of('expansionLocked')).toEqual([{ stage: 3 }]);
    ticks(run, 120);
    run.setScore(12_000);
    ticks(run, 10);
    expect(of('expansionLocked')).toHaveLength(1);
    expect(run.progress.locked).toBe(true);
  });
});

/** A stack of big, different-tier cats that pokes over the stage-1 rim. */
function buildTower(run: RunController): void {
  run.spawnBall(12, 0, -241);
  run.spawnBall(11, 0, -700);
  run.spawnBall(10, 0, -1100);
  run.spawnBall(9, 0, -1450);
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
    expect(popped.map((p) => p.tier).sort((a, b) => a - b)).toEqual([1, 9, 10, 11, 12]);
    expect(run.balls).toHaveLength(0);
    expect(run.coins).toBe(1 + 70 + 119 + 202 + 343);
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

    run.setScore(500);
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
