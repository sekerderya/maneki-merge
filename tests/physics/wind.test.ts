import { describe, expect, it } from 'vitest';
import { WIND_ACCEL_PER_LEVEL } from '../../src/config/picks';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import type { BallView } from '../../src/physics/balls';
import { RunController, windDirectionOf } from '../../src/run/RunController';

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

/** Drops the dropper's cat at `x` and runs until it first touches something. */
function dropAndLand(run: RunController, x = 0): { ball: BallView; fallMs: number } {
  while (!run.canDrop) run.tick();
  const before = new Set(run.balls.map((b) => b.id));
  const start = run.playTimeMs;
  expect(run.drop(x)).toBe(true);
  const ball = run.balls.find((b) => !before.has(b.id))!;
  for (let i = 0; i < 400 && ball.landedMs < 0; i++) run.tick();
  return { ball, fallMs: ball.landedMs - start };
}

describe('Wind (GAME_DESIGN §15.8)', () => {
  it('blows one way per run: the seed decides, either way across seeds', () => {
    expect(new RunController({ seed: 11 }).windDirection).toBe(windDirectionOf(11));
    expect(windDirectionOf(11)).toBe(windDirectionOf(11));
    const ways = new Set(Array.from({ length: 20 }, (_, seed) => windDirectionOf(seed)));
    expect([...ways].sort()).toEqual([-1, 1]);
  });

  it.each([1, 3, 5])(
    "at level %i drifts a cat falling to the empty floor ½·a·t² the wind's way",
    (level) => {
      for (const direction of [1, -1] as const) {
        const run = new RunController({ seed: 4 });
        run.setPickLevel('wind', level);
        run.setWindDirection(direction);
        const { ball, fallMs } = dropAndLand(run);
        const t = fallMs / 1000;
        const ideal = 0.5 * WIND_ACCEL_PER_LEVEL * level * t * t;
        // Air friction takes about a sixth of it (45 units at level 1 against 54).
        expect(direction * ball.x).toBeGreaterThan(0.75 * ideal);
        expect(direction * ball.x).toBeLessThan(ideal);
        // The fall itself takes as long as without wind.
        expect(fallMs).toBeCloseTo(1041.7, 0);
      }
    },
  );

  it('never pushes a cat that has touched anything', () => {
    const run = new RunController({ seed: 4 });
    run.setPickLevel('wind', 5);
    run.setWindDirection(1);
    const { ball } = dropAndLand(run);
    // It lands moving with the wind and rolls on, but the wind no longer speeds it up.
    const landing = ball.vx;
    expect(landing).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) {
      run.tick();
      expect(ball.vx).toBeLessThanOrEqual(landing + 1e-9);
    }
    // A cat resting on the floor never speeds up.
    const resting = run.spawnBall(2, -200, -run.radiusOf(2));
    run.tick();
    expect(resting.landedMs).toBeGreaterThanOrEqual(0);
    let speed = resting.speed;
    for (let i = 0; i < 120; i++) {
      run.tick();
      expect(resting.speed).toBeLessThanOrEqual(speed + 1e-9);
      speed = resting.speed;
    }
  });

  it('changes nothing at level 0', () => {
    const run = new RunController({ seed: 4 });
    expect(dropAndLand(run).ball.x).toBe(0);
  });

  it('pushes a ball against a wall, where it slides down', () => {
    const run = new RunController({ seed: 4 });
    run.setPickLevel('wind', 5);
    run.setWindDirection(1);
    const { ball } = dropAndLand(run, 200);
    // Its first contact is the wall, well above the floor.
    expect(ball.x).toBeCloseTo(run.geometry.halfWidth - ball.radius, 0);
    expect(ball.y).toBeLessThan(-300);
    for (let i = 0; i < 180; i++) {
      run.tick();
      expect(ball.x).toBeLessThanOrEqual(run.geometry.halfWidth - ball.radius + 1);
    }
    expect(ball.y).toBeCloseTo(-ball.radius, 0);
  });

  it("keeps its direction through a save, and an old save takes the seed's", () => {
    const run = new RunController({ seed: 11 });
    run.setWindDirection(-windDirectionOf(11) as 1 | -1);
    run.pause();
    const saved = roundTrip(run.snapshot());
    expect(saved.windDirection).toBe(-windDirectionOf(11));
    expect(RunController.restore(saved).windDirection).toBe(-windDirectionOf(11));
    const old: RunSnapshot = { ...saved };
    delete (old as { windDirection?: number }).windDirection;
    expect(RunController.restore(old).windDirection).toBe(windDirectionOf(11));
  });
});
