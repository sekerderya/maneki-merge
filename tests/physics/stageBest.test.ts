import { describe, expect, it } from 'vitest';
import { stepsFor } from '../../src/config/physics';
import { stageInfo } from '../../src/config/stages';
import { DROP_COOLDOWN_MS, EXPANSION_CLEAR_MS } from '../../src/config/timings';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import { RunController } from '../../src/run/RunController';

/** The goal strip's state (GAME_DESIGN §2.3): the biggest cat size the stage has had. */

function setup() {
  const events = new EventBus<GameEvents>();
  const reached: GameEvents['stageBestChanged'][] = [];
  events.on('stageBestChanged', (e) => reached.push(e));
  const run = new RunController({ seed: 7, events });
  return { run, reached };
}

function ticks(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) run.tick();
}

/** A cat of `tier` resting on the floor at x. */
function floorCat(run: RunController, tier: number, x: number): void {
  run.spawnBall(tier, x, -run.radiusOf(tier));
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

/** A snapshot as a run saved before v0.48 wrote it. */
function withoutBest(snapshot: RunSnapshot): RunSnapshot {
  const copy: { stageBestSize?: number } = { ...snapshot };
  delete copy.stageBestSize;
  return copy as RunSnapshot;
}

describe('the stage’s biggest cat (the goal strip, GAME_DESIGN §2.3)', () => {
  it('grows with drops, spawns and merges, and only announces a new biggest size', () => {
    const { run, reached } = setup();
    expect(run.stageBestSize).toBe(0);
    expect(run.drop(0)).toBe(true);
    expect(run.stageBestSize).toBe(1);
    floorCat(run, 4, -200);
    floorCat(run, 2, 200);
    expect(run.stageBestSize).toBe(4);
    // Two 5s merge into a 6.
    const r = run.radiusOf(5);
    run.spawnBall(5, 60 - r + 1, -r);
    run.spawnBall(5, 60 + r - 1, -r);
    expect(run.stageBestSize).toBe(5);
    run.tick();
    expect(run.stageBestSize).toBe(6);
    expect(reached).toEqual([1, 4, 5, 6].map((size) => ({ stage: 1, size })));
  });

  it('ignores boulders and other special balls', () => {
    const { run, reached } = setup();
    run.spawnBall(3, 0, -run.radiusOf(3), { kind: 'boulder', hits: 2 });
    expect(run.stageBestSize).toBe(0);
    expect(reached).toEqual([]);
  });

  it('keeps the last cat through the clear, then starts over quietly at the next stage', () => {
    const { run, reached } = setup();
    const tier = stageInfo(1).lastTier - 1;
    const r = run.radiusOf(tier);
    run.spawnBall(tier, 0, -r);
    run.spawnBall(tier, 0, -3 * r + 8);
    for (let i = 0; i < 120 && run.state === 'playing'; i++) run.tick();
    expect(run.state).toBe('expanding');
    expect(run.stageBestSize).toBe(9);
    expect(reached.at(-1)).toEqual({ stage: 1, size: 9 });
    // Every cat pops, the last one too: the strip stays full until the next stage.
    ticks(run, stepsFor(EXPANSION_CLEAR_MS));
    expect(run.balls).toHaveLength(0);
    expect(run.stageBestSize).toBe(9);
    while (run.state === 'choosing') run.choose(run.pickOffer!.options[0]!);
    expect(run.stage).toBe(2);
    expect(run.stageBestSize).toBe(0);
    const count = reached.length;
    // Stage 2's first drop is a size 1 again.
    ticks(run, stepsFor(DROP_COOLDOWN_MS));
    expect(run.drop(0)).toBe(true);
    expect(reached.slice(count)).toEqual([{ stage: 2, size: 1 }]);
  });

  it('comes back with a saved run, and from the jar for a run saved before it was kept', () => {
    const { run } = setup();
    floorCat(run, 6, -150);
    floorCat(run, 3, 150);
    ticks(run, 2);
    const saved = roundTrip(run.snapshot());
    expect(saved.stageBestSize).toBe(6);
    expect(RunController.restore(saved).stageBestSize).toBe(6);

    // Before v0.48 the snapshot had no stageBestSize: the biggest cat in the jar stands in.
    expect(RunController.restore(roundTrip(withoutBest(saved))).stageBestSize).toBe(6);
    const { run: empty } = setup();
    const bare = withoutBest(roundTrip(empty.snapshot()));
    expect(RunController.restore(bare).stageBestSize).toBe(0);
  });

  it('refuses a saved size that is not a whole number of at least 0', () => {
    const { run } = setup();
    const snapshot = run.snapshot()!;
    for (const bad of [-1, 2.5, '3']) {
      const text = JSON.stringify({
        version: RUN_SAVE_VERSION,
        save: {
          run: { ...snapshot, stageBestSize: bad },
          recordsBefore: { bestScore: 0, bestStage: 1, highestTier: 0 },
        },
      });
      expect(decodeRunSave(text)).toHaveProperty('error');
    }
  });
});
