import { describe, expect, it } from 'vitest';
import { stepsFor } from '../../src/config/physics';
import { stageInfo } from '../../src/config/stages';
import { EXPANSION_CLEAR_MS, EXPANSION_ZOOM_MS } from '../../src/config/timings';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Rng } from '../../src/core/rng';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import { RunController } from '../../src/run/RunController';
import { botMove, upgrades } from './fixtures';

const CLEAR_STEPS = stepsFor(EXPANSION_CLEAR_MS);
const ZOOM_STEPS = stepsFor(EXPANSION_ZOOM_MS);

/** A bot plays `ticks` ticks: a move whenever the run takes one, at seeded spots. */
function play(run: RunController, ticks: number, seed = 9): void {
  const rng = new Rng(seed);
  for (let i = 0; i < ticks && run.state !== 'over'; i++) {
    botMove(run, (rng.next() - 0.5) * 560, rng.next());
    run.tick();
  }
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

/** Clears stage 1: two of its last cat but one merge into its last cat. */
function clearStage(run: RunController): void {
  const tier = stageInfo(run.stage).lastTier - 1;
  run.spawnBall(tier, -40, -40);
  run.spawnBall(tier, 40, -40);
  for (let i = 0; i < 600 && run.state === 'playing'; i++) run.tick();
}

describe('saved runs (GAME_DESIGN §11)', () => {
  it('come back exactly as they were, paused', () => {
    const run = new RunController({ seed: 21, upgrades: upgrades({ luckyPaw: 2, bigCatch: 1 }) });
    play(run, 2400);
    expect(run.state).toBe('playing');
    expect(run.balls.length).toBeGreaterThan(10);
    run.pause();

    const events = new EventBus<GameEvents>();
    let started = 0;
    events.on('runStarted', () => started++);
    const back = RunController.restore(roundTrip(run.snapshot()), { events });
    expect(started).toBe(0);
    expect(back.state).toBe('paused');
    expect(back.upgrades).toEqual(run.upgrades);
    expect(back.stats).toEqual(run.stats);
    expect(back.stateHash()).toBe(run.stateHash());
    expect(back.balls.map((b) => [b.id, b.tier, b.x, b.y])).toEqual(
      run.balls.map((b) => [b.id, b.tier, b.x, b.y]),
    );
    expect([back.score, back.coins, back.stage, back.current, back.next]).toEqual([
      run.score,
      run.coins,
      run.stage,
      run.current,
      run.next,
    ]);
  });

  it('play on like the original: a settled pile stays where it was', () => {
    const run = new RunController({ seed: 4 });
    play(run, 3000, 5);
    for (let i = 0; i < 600; i++) run.tick();
    const saved = roundTrip(run.snapshot());
    const back = RunController.restore(saved);
    const twin = RunController.restore(saved);
    back.resume();
    twin.resume();
    for (let i = 0; i < 240; i++) {
      run.tick();
      back.tick();
      twin.tick();
    }
    // Restoring is deterministic: the same snapshot always plays on the same way.
    expect(twin.stateHash()).toBe(back.stateHash());
    const drift = run.balls.map((ball) => {
      const twin = back.balls.find((b) => b.id === ball.id);
      return twin ? Math.hypot(twin.x - ball.x, twin.y - ball.y) : Infinity;
    });
    // Only matter-js's contact cache is lost: the cats settle again within a fraction of a pixel.
    expect(Math.max(...drift)).toBeLessThan(0.5);
    expect(back.balls.length).toBe(run.balls.length);
  });

  it('keep the rest of the seed: the same drops follow', () => {
    const run = new RunController({ seed: 77 });
    play(run, 1200);
    const back = RunController.restore(roundTrip(run.snapshot()));
    back.resume();
    const drops = (r: RunController): string[] => {
      const out: string[] = [];
      for (let i = 0; i < 6; i++) {
        while (!r.canDrop && !r.canTake) r.tick();
        out.push(`${r.current.kind}${r.current.tier}`);
        if (r.canTake) r.take(r.balls.find((b) => r.takeable(b))!.id);
        else r.drop(0);
      }
      return out;
    };
    expect(drops(back)).toEqual(drops(run));
  });

  it("wait at a stage clear's pick, then grow into the next stage", () => {
    const run = new RunController({ seed: 3 });
    clearStage(run);
    for (let i = 0; i < CLEAR_STEPS + 5 && run.state === 'expanding'; i++) run.tick();
    expect(run.state).toBe('choosing');
    const offer = run.pickOffer!;

    const back = RunController.restore(roundTrip(run.snapshot()));
    expect(back.pickOffer).toEqual(offer);
    expect(back.expansion?.phase).toBe('clear');
    back.resume();
    expect(back.state).toBe('choosing');
    expect(back.choose(offer.options[0]!)).toBe(true);
    expect(back.state).toBe('choosing');
    expect(back.choose(back.pickOffer!.options[0]!)).toBe(true);
    for (let i = 0; i < 2000 && back.state !== 'playing'; i++) back.tick();
    expect(back.stage).toBe(2);
    expect(back.canDrop || back.canTake || back.cooldownRemainingMs >= 0).toBe(true);
  });

  it('continue an expansion where it stood', () => {
    const run = new RunController({ seed: 3 });
    // The jar grows when stage 5 is cleared.
    run.jumpToStage(5);
    for (let i = 0; i < 5000 && (run.stage < 5 || run.state !== 'playing'); i++) run.tick();
    clearStage(run);
    for (let i = 0; i < 5000 && run.expansion?.phase !== 'zoom'; i++) {
      if (run.state === 'choosing') run.choose(run.pickOffer!.options[0]!);
      else run.tick();
    }
    for (let i = 0; i < ZOOM_STEPS / 2; i++) run.tick();
    expect(run.state).toBe('expanding');
    const zoom = run.expansion!.zoomProgress;
    run.pause();

    const back = RunController.restore(roundTrip(run.snapshot()));
    expect(back.expansion?.zoomProgress).toBe(zoom);
    expect(back.stateHash()).toBe(run.stateHash());
    back.resume();
    expect(back.state).toBe('expanding');
    for (let i = 0; i < 2000 && back.state !== 'playing'; i++) back.tick();
    expect(back.stage).toBe(6);
  });

  it('finish a zoom saved by v0.33.0–v0.33.1 (after its picks) without picking again', () => {
    const run = new RunController({ seed: 5 });
    run.jumpToStage(5);
    for (let i = 0; i < 5000 && (run.stage < 5 || run.state !== 'playing'); i++) run.tick();
    clearStage(run);
    for (let i = 0; i < 5000 && run.expansion?.phase !== 'zoom'; i++) run.tick();
    run.pause();
    const saved = roundTrip(run.snapshot());
    // Back then the zoom started right after the clear, once the picks were made.
    const old = { ...saved, expansion: { ...saved.expansion!, elapsedSteps: CLEAR_STEPS + 5 } };
    const back = RunController.restore(old);
    expect(back.expansion).toMatchObject({ phase: 'zoom', grows: true });
    expect(back.expansion!.zoomProgress).toBeCloseTo(5 / ZOOM_STEPS, 9);
    back.resume();
    for (let i = 0; i < 2000 && back.state === 'expanding'; i++) back.tick();
    expect(back.state).toBe('playing');
    expect(back.stage).toBe(6);
  });

  it('turn an old clear of the last stage (before v0.33) into a move on to stage 6', () => {
    const run = new RunController({ seed: 4 });
    run.jumpToStage(5);
    for (let i = 0; i < 5000 && (run.stage < 5 || run.state !== 'playing'); i++) run.tick();
    clearStage(run);
    for (let i = 0; i < 2000 && run.state === 'expanding'; i++) run.tick();
    expect(run.state).toBe('choosing');
    const saved = roundTrip(run.snapshot());
    // v0.32 saved the last stage's clear as 5 → 5.
    const old = { ...saved, expansion: { ...saved.expansion!, to: 5 } };
    const back = RunController.restore(old);
    expect(back.expansion).toMatchObject({ from: 5, to: 6, grows: true });
    back.resume();
    while (back.state === 'choosing') back.choose(back.pickOffer!.options[0]!);
    for (let i = 0; i < 2000 && back.state !== 'playing'; i++) back.tick();
    expect(back.stage).toBe(6);
    // Anything else that doesn't fit is refused.
    const wrong = { ...saved, expansion: { ...saved.expansion!, to: 7 } };
    expect(() => RunController.restore(wrong)).toThrow(RangeError);
  });

  it('keep a growing cat growing and a boulder its bands', () => {
    const run = new RunController({ seed: 8 });
    run.spawnBall(3, -100, -30, { kind: 'boulder', hits: 3 });
    const first = stageInfo(1).firstTier;
    run.spawnBall(first + 1, 100, -30);
    run.spawnBall(first + 1, 100, -100);
    for (let i = 0; i < 400 && !run.balls.some((b) => b.growing); i++) run.tick();
    expect(run.balls.some((b) => b.growing)).toBe(true);
    const back = RunController.restore(roundTrip(run.snapshot()));
    const grower = back.balls.find((b) => b.growing)!;
    const original = run.balls.find((b) => b.id === grower.id)!;
    expect(grower.radius).toBe(original.radius);
    expect(back.balls.find((b) => b.kind === 'boulder')?.hitsLeft).toBe(3);
    back.resume();
    run.tick();
    back.tick();
    expect(back.balls.find((b) => b.id === grower.id)!.radius).toBe(
      run.balls.find((b) => b.id === grower.id)!.radius,
    );
  });

  it('are gone after game over', () => {
    const run = new RunController({ seed: 1 });
    expect(run.snapshot()).not.toBeNull();
    run.forceGameOver();
    expect(run.snapshot()).toBeNull();
  });

  it('refuse what the rules cannot hold', () => {
    const run = new RunController({ seed: 1 });
    play(run, 600);
    const good = roundTrip(run.snapshot());
    const bad: RunSnapshot[] = [
      { ...good, world: { ...good.world, stage: 9 } },
      {
        ...good,
        world: { ...good.world, balls: [{ ...good.world.balls[0]!, tier: 40 }] },
      },
      {
        ...good,
        world: { ...good.world, balls: [good.world.balls[0]!, good.world.balls[0]!] },
      },
      { ...good, queue: { ...good.queue, current: { ...good.queue.current, tier: 30 } } },
      { ...good, state: 'choosing' },
      { ...good, state: 'expanding' },
      {
        ...good,
        expansion: { from: 1, to: 3, picks: true, elapsedSteps: 0, phase: 'clear' },
        state: 'expanding',
      },
      { ...good, offer: { kind: 'trial', options: [] }, state: 'choosing' },
    ];
    for (const snapshot of bad) expect(() => RunController.restore(snapshot)).toThrow(RangeError);
  });
});
