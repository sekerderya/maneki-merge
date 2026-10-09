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
import { MAGNET_TAKE_MS } from '../../src/config/timings';
import { PICKS } from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { MAX_DROP_RADIUS } from '../../src/physics/geometry';

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
  'ballTaken',
  'boulderHit',
  'boulderBroken',
  'pickOffered',
  'pickChosen',
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

/** Takes the first option of every waiting pick (GAME_DESIGN §15.5); returns the ids chosen. */
function chooseAll(run: RunController): PickId[] {
  const chosen: PickId[] = [];
  while (run.state === 'choosing') {
    const id = run.pickOffer!.options[0]!;
    expect(run.choose(id)).toBe(true);
    chosen.push(id);
  }
  return chosen;
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
      ['dropReady', { kind: 'cat', tier: 1 }],
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
    const { run } = setup({ upgrades: upgrades({ comboCharm: 3, secondChance: 2 }) });
    expect(run.luckySavesLeft).toBe(2);
    expect(run.stats.comboCharmLevel).toBe(3);
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
    expect(of('catDropped')).toEqual([
      { kind: 'cat', tier: 1, golden: false, x: 300 - sizeRadius(1) },
    ]);
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
      expect.objectContaining({ tier: last, score: 2048, coins: 595, combo: 1 }),
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

    // The picks (GAME_DESIGN §15.5): a trial, then a blessing, while time stands still.
    expect(run.state).toBe('choosing');
    expect(of('pickOffered')).toEqual([{ kind: 'trial', options: expect.any(Array) }]);
    expect([...run.pickOffer!.options].sort()).toEqual([
      'bigBoulders',
      'ironBands',
      'moreBoulders',
    ]);
    const settled = run.playTimeMs;
    ticks(run, 100);
    run.update(1000);
    expect(run.playTimeMs).toBe(settled);
    expect(run.expansion?.phase).toBe('clear');
    expect(run.choose('moreMagnets')).toBe(false); // not on these cards
    const trial = run.pickOffer!.options[1]!;
    expect(run.choose(trial)).toBe(true);
    expect(of('pickChosen')).toEqual([{ kind: 'trial', id: trial, level: 1 }]);
    expect(run.pickOffer?.kind).toBe('blessing');
    expect(run.choose(run.pickOffer!.options[0]!)).toBe(true);
    expect(run.pickLevels[trial]).toBe(1);
    expect(run.state).toBe('expanding');
    expect(run.choose(trial)).toBe(false); // nothing waits any more
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
    expect([run.current, run.next]).toEqual(queue.map((d) => ({ ...d, tier: d.tier + 9 })));
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
      expect(chooseAll(run)).toHaveLength(2);
    }
    expect(run.stage).toBe(5);
    // A trial and a blessing at each of the four clears.
    const levels = Object.values(run.pickLevels);
    expect(levels.reduce((a, b) => a + b, 0)).toBe(8);
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
    // The picks come at once, then play goes on.
    expect(run.state).toBe('choosing');
    expect(chooseAll(run)).toHaveLength(2);
    expect(run.state).toBe('playing');
    expect(run.stage).toBe(5);
    expect(run.progress).toEqual({ fraction: 1, goalTier: 46, final: true });
    // A second 46: its clear pops the first one, so it stays alone in the jar.
    makeLastCat(run);
    chooseAll(run);
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
/** Tiers 10 down to 6 stacked in the middle of the jar, past the rim. Returns the tower's top. */
function buildTower(run: RunController): number {
  let top = 0;
  for (const tier of [10, 9, 8, 7, 6]) {
    const r = sizeRadius(tier);
    run.spawnBall(tier, 0, top - r);
    top -= 2 * r + 5;
  }
  return top;
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
    // A tier-1 cat on top of the tower.
    run.spawnBall(1, 0, buildTower(run) - sizeRadius(1));
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

describe('magnets (GAME_DESIGN §15.2)', () => {
  it('takes a landed ball into the dropper, leaving NEXT alone', () => {
    const { run, of } = setup();
    const cat = run.spawnBall(4, -150, -sizeRadius(4), { golden: true });
    const falling = run.spawnBall(2, 150);
    ticks(run, 2);
    run.giveSpecial('magnet');
    expect(run.current.kind).toBe('magnet');
    expect(of('dropReady').at(-1)).toEqual({ kind: 'magnet', tier: 3 });
    expect(run.canDrop).toBe(false);
    expect(run.canTake).toBe(true);
    expect(run.drop(0)).toBe(false);
    const next = run.next;

    // A ball still falling, or one that isn't there, can't be taken.
    expect(run.takeable(falling)).toBe(false);
    expect(run.take(falling.id)).toBe(false);
    expect(run.take(999)).toBe(false);

    expect(run.take(cat.id)).toBe(true);
    expect(run.balls.map((b) => b.id)).toEqual([falling.id]);
    expect(run.current).toEqual({ kind: 'cat', tier: 4, golden: true, hits: 0 });
    expect(run.next).toEqual(next);
    expect(of('ballTaken')).toEqual([
      { id: cat.id, kind: 'cat', tier: 4, golden: true, at: expect.any(Object) },
    ]);
    // It can be dropped once it has flown up into the paw.
    expect(run.canDrop).toBe(false);
    expect(run.cooldownRemainingMs).toBeCloseTo(MAGNET_TAKE_MS, 6);
    expect(run.take(cat.id)).toBe(false);
    ticks(run, stepsFor(MAGNET_TAKE_MS));
    expect(of('dropReady').at(-1)).toEqual({ kind: 'cat', tier: 4 });
    expect(run.drop(0)).toBe(true);
    expect(of('catDropped').at(-1)).toEqual({ kind: 'cat', tier: 4, golden: true, x: 0 });
    expect(run.current).toEqual(next);
  });

  it('takes a boulder with the hits it still needs', () => {
    const { run } = setup();
    const boulder = run.spawnBall(3, 0, -sizeRadius(3), { kind: 'boulder', hits: 2 });
    run.tick();
    run.giveSpecial('magnet');
    expect(run.take(boulder.id)).toBe(true);
    expect(run.current).toEqual({ kind: 'boulder', tier: 3, golden: false, hits: 2 });
  });

  it('drops a ball bigger than the biggest drop from higher up', () => {
    const { run } = setup();
    const big = run.spawnBall(8, 0, -sizeRadius(8));
    run.tick();
    run.giveSpecial('magnet');
    run.take(big.id);
    ticks(run, stepsFor(MAGNET_TAKE_MS));
    expect(run.drop(0)).toBe(true);
    const dropped = run.balls.at(-1)!;
    // Its bottom starts where a size-4 cat's would.
    expect(dropped.y + dropped.radius).toBeCloseTo(run.geometry.dropY + MAX_DROP_RADIUS, 9);
    expect(dropped.tier).toBe(8);
  });
});

describe('boulders (GAME_DESIGN §15.3)', () => {
  /** A size-2 boulder on the floor at x = 0. */
  function spawnBoulder(run: RunController, hits: number) {
    return run.spawnBall(2, 0, -sizeRadius(2), { kind: 'boulder', hits });
  }

  /** Two cats of `tier` merging right next to the boulder (one of them touches it). */
  function mergeBeside(run: RunController, boulderX: number, tier = 1) {
    const r = sizeRadius(tier);
    const br = sizeRadius(2);
    const x = boulderX - br - r + 1;
    run.spawnBall(tier, x, -r);
    run.spawnBall(tier, x - 2 * r + 2, -r);
    run.tick();
  }

  it('never merges, and breaks after the merges next to it', () => {
    const { run, of } = setup();
    const boulder = spawnBoulder(run, 2);
    // Two boulders of one size side by side don't merge.
    const twin = run.spawnBall(2, 200, -sizeRadius(2), { kind: 'boulder' });
    run.spawnBall(2, 200 + 2 * sizeRadius(2) - 2, -sizeRadius(2), { kind: 'boulder' });
    ticks(run, 20);
    expect(of('merged')).toEqual([]);
    expect(run.balls.filter((b) => b.kind === 'boulder')).toHaveLength(3);
    expect(twin.hitsLeft).toBe(1);

    mergeBeside(run, boulder.x);
    expect(of('merged')).toHaveLength(1);
    expect(of('boulderHit')).toEqual([{ id: boulder.id, hitsLeft: 1, at: expect.any(Object) }]);
    expect(boulder.hitsLeft).toBe(1);
    ticks(run, 60);
    mergeBeside(run, boulder.x);
    expect(of('boulderBroken')).toEqual([
      { id: boulder.id, tier: 2, at: expect.any(Object), reason: 'hits' },
    ]);
    expect(run.balls).not.toContain(boulder);
    // Breaking pays nothing: the coins are the two merges'.
    expect(run.coins).toBe(2);
  });

  it('crumbles with a stage clear’s pops and pays nothing', () => {
    const { run, of } = setup();
    spawnBoulder(run, 3);
    run.spawnBall(1, 250, -sizeRadius(1));
    ticks(run, 30);
    makeLastCat(run);
    expect(of('boulderBroken').map((b) => b.reason)).toEqual(['cashOut']);
    expect(of('catPopped')).toHaveLength(1);
    expect(run.balls.map((b) => b.tier)).toEqual([10]);
  });

  it('takes the trials’ size and hits, as a size of the stage', () => {
    const { run } = setup({ instantExpansion: true });
    run.setPickLevel('bigBoulders', 2);
    run.setPickLevel('ironBands', 3);
    run.giveSpecial('boulder');
    expect(run.current).toEqual({ kind: 'boulder', tier: 4, golden: false, hits: 4 });
    run.jumpToStage(2);
    run.tick();
    expect(run.stage).toBe(2);
    run.giveSpecial('boulder');
    expect(run.current).toEqual({ kind: 'boulder', tier: 13, golden: false, hits: 4 });
    // Dropped, it lands as a boulder with those hits.
    expect(run.drop(0)).toBe(true);
    expect(run.balls.at(-1)).toMatchObject({ kind: 'boulder', size: 4, hitsLeft: 4 });
  });
});

describe('golden cats (GAME_DESIGN §15.4)', () => {
  it('skips a tier when one of a pair is golden, paying like a plain merge', () => {
    const { run, of } = setup();
    const r = run.radiusOf(3);
    run.spawnBall(3, -r + 1, -r, { golden: true });
    run.spawnBall(3, r - 1, -r);
    run.tick();
    expect(of('merged')).toEqual([
      expect.objectContaining({ tier: 3, newTier: 5, newSize: 5, golden: true, coins: 3 }),
    ]);
    const born = run.balls[0]!;
    expect(born.tier).toBe(5);
    expect(born.golden).toBe(false);
    expect(run.highestTier).toBe(5);
  });

  it('never skips past the stage’s last cat', () => {
    const { run, of } = setup();
    const r = run.radiusOf(9);
    run.spawnBall(9, 0, -r, { golden: true });
    run.spawnBall(9, 0, -3 * r + 8, { golden: true });
    for (let i = 0; i < 120 && of('merged').length === 0; i++) run.tick();
    expect(of('merged')).toEqual([expect.objectContaining({ tier: 9, newTier: 10 })]);
    expect(of('stageCleared')).toHaveLength(1);
  });

  it('comes from the dropper with Golden Cats', () => {
    const { run } = setup();
    run.setPickLevel('goldenCats', 5);
    // Each drop queues a new ball (NEXT), rolled with the new odds.
    let golden = 0;
    for (let i = 0; i < 30; i++) {
      if (run.canTake) run.giveSpecial('golden');
      expect(run.drop((i % 5) * 100 - 200)).toBe(true);
      if (run.next.golden) golden++;
      ticks(run, COOLDOWN_STEPS);
    }
    expect(golden).toBeGreaterThan(0);
  });
});

describe('trials and blessings (GAME_DESIGN §15.5)', () => {
  it('raises the odds of the balls queued after a pick', () => {
    const { run } = setup();
    run.setPickLevel('moreMagnets', 99);
    expect(run.pickLevels.moreMagnets).toBe(PICKS.moreMagnets.maxLevel);
    run.setPickLevel('moreMagnets', Number.NaN);
    expect(run.pickLevels.moreMagnets).toBe(PICKS.moreMagnets.maxLevel);
    run.setPickLevel('moreMagnets', -3);
    expect(run.pickLevels.moreMagnets).toBe(0);
  });

  it('opens the picks on demand (debug) and lets a pause wait over them', () => {
    const { run, of } = setup();
    run.offerPicks();
    expect(run.state).toBe('choosing');
    run.pause();
    expect(run.state).toBe('paused');
    expect(run.choose(run.pickOffer!.options[0]!)).toBe(false);
    run.resume();
    expect(run.state).toBe('choosing');
    expect(chooseAll(run)).toHaveLength(2);
    expect(run.state).toBe('playing');
    expect(of('pickOffered').map((p) => p.kind)).toEqual(['trial', 'blessing']);
    // Not while a pick is already waiting or the run isn't playing.
    run.forceGameOver();
    run.offerPicks();
    expect(run.pickOffer).toBeNull();
  });

  it('skips maxed options and whole picks with nothing left', () => {
    const { run, of } = setup();
    for (const id of ['moreBoulders', 'ironBands', 'bigBoulders'] as const) {
      run.setPickLevel(id, PICKS[id].maxLevel);
    }
    run.setPickLevel('moreMagnets', PICKS.moreMagnets.maxLevel);
    run.offerPicks();
    // No trial left: straight to the blessings, without More Magnets.
    expect(of('pickOffered')).toEqual([
      { kind: 'blessing', options: expect.arrayContaining(['bigDrops', 'goldenCats']) },
    ]);
    expect(run.pickOffer!.options).toHaveLength(2);
    chooseAll(run);
    for (const id of ['bigDrops', 'goldenCats'] as const) run.setPickLevel(id, 9);
    run.offerPicks();
    expect(run.state).toBe('playing');
    expect(of('pickOffered')).toHaveLength(1);
  });

  it('skips the picks on a debug jump', () => {
    const { run, of } = setup({ instantExpansion: true });
    run.jumpToStage(3);
    run.tick();
    expect(run.stage).toBe(3);
    expect(of('pickOffered')).toEqual([]);
  });
});
