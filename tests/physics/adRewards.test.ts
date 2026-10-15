import { describe, expect, it } from 'vitest';
import { AD_BALL_AFTER_DROPS, AD_BALL_KINDS } from '../../src/config/ads';
import type { AdBallKind } from '../../src/config/ads';
import { LIGHTNING_SIZE } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import { bonusBallKind } from '../../src/core/bonusBall';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import { RunController } from '../../src/run/RunController';

const WATCHED = ['adBallGiven', 'lastChanceOffered', 'luckySave', 'gameOver'] as const;
type Watched = (typeof WATCHED)[number];

/** A run of `seed` with the events this file looks at, by type. */
function setup(seed = 7) {
  const events = new EventBus<GameEvents>();
  const seen = new Map<Watched, unknown[]>(WATCHED.map((type) => [type, []]));
  for (const type of WATCHED) events.on(type, (payload) => seen.get(type)?.push(payload));
  const run = new RunController({ seed, events });
  const of = <K extends Watched>(type: K): GameEvents[K][] => seen.get(type) as GameEvents[K][];
  return { run, of };
}

/** The first seed whose stage-1 bonus ball is `kind`. */
function seedFor(kind: AdBallKind): number {
  for (let seed = 1; ; seed++) if (bonusBallKind(seed, 1) === kind) return seed;
}

/** Drops `n` balls, waiting out each cooldown, at spots across the jar. */
function dropBalls(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) {
    for (let guard = 0; !run.canDrop && guard < 600; guard++) run.tick();
    expect(run.drop(((i % 5) - 2) * 60)).toBe(true);
  }
}

function waitForDrop(run: RunController): void {
  for (let guard = 0; !run.canDrop && !run.canTake && guard < 600; guard++) run.tick();
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

/** Clears the stage (two of its last cat but one), takes the picks and plays into the next. */
function clearStage(run: RunController): void {
  const tier = stageInfo(run.stage).lastTier - 1;
  run.spawnBall(tier, -40, -40);
  run.spawnBall(tier, 40, -40);
  for (let i = 0; i < 4000 && run.state !== 'playing'; i++) {
    if (run.state === 'choosing') run.choose(run.pickOffer!.options[0]!);
    else run.tick();
  }
  for (let i = 0; i < 4000 && run.state === 'playing' && run.stage === 1; i++) run.tick();
  for (let i = 0; i < 4000 && run.state !== 'playing'; i++) {
    if (run.state === 'choosing') run.choose(run.pickOffer!.options[0]!);
    else run.tick();
  }
}

describe('the bonus ball (GAME_DESIGN §2.7)', () => {
  it('rolls a hanabi, a joker, a lightning ball or a magnet per stage from the seed', () => {
    expect(bonusBallKind(42, 3)).toBe(bonusBallKind(42, 3));
    const counts = new Map<string, number>();
    for (let seed = 1; seed <= 800; seed++) {
      const kind = bonusBallKind(seed, 1);
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...AD_BALL_KINDS].sort());
    for (const n of counts.values()) expect(n / 800).toBeGreaterThan(0.18);
    const stages = new Set(Array.from({ length: 12 }, (_, i) => bonusBallKind(5, i + 1)));
    expect(stages.size).toBeGreaterThan(1);
  });

  it("is on offer from the stage's 8th drop, and once taken not again in the stage", () => {
    const { run, of } = setup();
    dropBalls(run, AD_BALL_AFTER_DROPS - 1);
    expect(run.adBall).toBeNull();
    expect(run.giveAdBall()).toBe(false);
    dropBalls(run, 1);
    const kind = bonusBallKind(7, 1);
    expect(run.adBall).toMatchObject({ kind, golden: false, hits: 0 });
    run.pause();
    expect(run.adBall?.kind).toBe(kind);
    run.resume();
    expect(run.giveAdBall()).toBe(true);
    expect(of('adBallGiven')).toHaveLength(1);
    expect(run.adBall).toBeNull();
    expect(run.giveAdBall()).toBe(false);
  });

  it('goes straight into the paw; the cat waits and comes back after it; NEXT stays', () => {
    const { run, of } = setup(seedFor('joker'));
    dropBalls(run, AD_BALL_AFTER_DROPS);
    const cat = run.current;
    const next = run.next;
    expect(run.giveAdBall()).toBe(true);
    expect(of('adBallGiven')).toEqual([{ kind: 'joker', tier: run.current.tier }]);
    expect(run.current.kind).toBe('joker');
    expect(run.next).toEqual(next);
    dropBalls(run, 1);
    expect(run.current).toEqual(cat);
    expect(run.next).toEqual(next);
    dropBalls(run, 1);
    expect(run.current).toEqual(next);
    expect(run.stageDrops).toBe(AD_BALL_AFTER_DROPS + 2);
  });

  it('as a magnet, takes a ball, and the cat still comes back after the one it took', () => {
    const { run } = setup(seedFor('magnet'));
    dropBalls(run, AD_BALL_AFTER_DROPS);
    const cat = run.current;
    run.giveAdBall();
    expect(run.canDrop).toBe(false);
    waitForDrop(run);
    for (let i = 0; i < 240; i++) run.tick();
    const target = run.balls.find((ball) => run.takeable(ball));
    expect(target).toBeDefined();
    expect(run.take(target!.id)).toBe(true);
    expect(run.current.kind).toBe('cat');
    dropBalls(run, 1);
    expect(run.current).toEqual(cat);
  });

  it("isn't lost when the stage clears before it is dropped: it comes after the next drop", () => {
    const { run } = setup(seedFor('lightning'));
    dropBalls(run, AD_BALL_AFTER_DROPS);
    run.giveAdBall();
    expect(run.current.kind).toBe('lightning');
    clearStage(run);
    expect(run.stage).toBe(2);
    // An empty jar: the waiting cat goes first, the lightning ball after it.
    expect(run.current.kind).toBe('cat');
    dropBalls(run, 1);
    expect(run.current.kind).toBe('lightning');
    expect(run.current.tier).toBe(stageInfo(2).firstTier + LIGHTNING_SIZE - 1);
    // A new stage, a new bonus ball from its 8th drop.
    expect(run.adBall).toBeNull();
  });

  it('is saved with the run: the ball in the paw, the cat waiting, the stage taken', () => {
    const { run } = setup(seedFor('hanabi'));
    dropBalls(run, AD_BALL_AFTER_DROPS);
    const cat = run.current;
    run.giveAdBall();
    const saved = roundTrip(run.snapshot());
    expect(saved.adBallStage).toBe(1);
    expect(saved.queue.held).toEqual(cat);
    const back = RunController.restore(saved);
    back.resume();
    expect(back.current.kind).toBe('hanabi');
    expect(back.adBall).toBeNull();
    expect(back.stateHash()).toBe(run.stateHash());
    dropBalls(back, 1);
    expect(back.current).toEqual(cat);
  });

  it('leaves a run without it saved as before', () => {
    const { run } = setup();
    dropBalls(run, 3);
    const snapshot = run.snapshot()!;
    expect('adBallStage' in snapshot).toBe(false);
    expect('lastChanceUsed' in snapshot).toBe(false);
    expect('held' in snapshot.queue).toBe(false);
  });
});

describe('one more Lucky Save (GAME_DESIGN §2.7)', () => {
  it('ends the run as before when no ad is ready', () => {
    const { run, of } = setup();
    run.forceDangerTimeout();
    expect(run.state).toBe('over');
    expect(of('lastChanceOffered')).toHaveLength(0);
  });

  it('stops time and asks when an ad is ready', () => {
    const { run, of } = setup();
    dropBalls(run, 2);
    run.setLastChanceReady(true);
    run.forceDangerTimeout();
    expect(run.state).toBe('lastChance');
    expect(of('lastChanceOffered')).toHaveLength(1);
    const ticks = run.ticks;
    for (let i = 0; i < 20; i++) run.tick();
    expect(run.ticks).toBe(ticks);
    expect(run.canDrop).toBe(false);
    run.pause();
    expect(run.state).toBe('lastChance');
    // Saved as playing: its timer runs out again on the way back.
    expect(roundTrip(run.snapshot()).state).toBe('playing');
  });

  it('gives one more Lucky Save after the ad, once per run', () => {
    const { run, of } = setup();
    run.setLastChanceReady(true);
    run.forceDangerTimeout();
    expect(run.takeLastChance()).toBe(true);
    expect(run.state).toBe('playing');
    expect(of('luckySave')).toEqual([{ savesLeft: 0 }]);
    expect(run.luckySavesLeft).toBe(0);
    expect(run.lastChanceTaken).toBe(true);
    expect(run.takeLastChance()).toBe(false);
    run.forceDangerTimeout();
    expect(run.state).toBe('over');
    expect(of('lastChanceOffered')).toHaveLength(1);
  });

  it('ends the run when declined', () => {
    const { run, of } = setup();
    run.setLastChanceReady(true);
    run.forceDangerTimeout();
    run.declineLastChance();
    expect(run.state).toBe('over');
    expect(of('gameOver')).toHaveLength(1);
  });

  it('comes when the danger timer itself runs out', () => {
    const { run } = setup();
    run.setLastChanceReady(true);
    let top = 0;
    for (const tier of [9, 8, 7, 6, 5]) {
      const r = sizeRadius(tier);
      run.spawnBall(tier, 0, top - r);
      top -= 2 * r + 5;
    }
    run.spawnBall(1, 0, top - sizeRadius(1));
    for (let i = 0; i < 1200 && run.state === 'playing'; i++) run.tick();
    expect(run.state).toBe('lastChance');
  });

  it('is remembered by a saved run', () => {
    const { run } = setup();
    run.setLastChanceReady(true);
    run.forceDangerTimeout();
    run.takeLastChance();
    const saved = roundTrip(run.snapshot());
    expect(saved.lastChanceUsed).toBe(true);
    const back = RunController.restore(saved);
    back.resume();
    back.setLastChanceReady(true);
    expect(back.lastChanceTaken).toBe(true);
    back.forceDangerTimeout();
    expect(back.state).toBe('over');
  });
});
