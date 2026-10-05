import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';
import { STEPS_PER_SECOND, upgrades } from './fixtures';

/** A drop input, keyed to the tick it arrived before. */
interface DropInput {
  readonly tick: number;
  readonly x: number;
}

const LEVELS = upgrades({ shrineExpansion: 1, quickGrowth: 5, goldenTouch: 3, secondChance: 1 });
const TICKS = 25 * STEPS_PER_SECOND;

function newRun(seed: number): RunController {
  return new RunController({ seed, upgrades: LEVELS });
}

/**
 * Plays `TICKS` ticks driven by `update(frameMs)` with random frame lengths, dropping at a random
 * x whenever a frame starts with the dropper ready. Records each drop with its tick.
 */
function playWithFrames(
  seed: number,
  frameSeed: number,
): { inputs: DropInput[]; hashes: string[] } {
  const run = newRun(seed);
  const frames = new Rng(frameSeed);
  const aim = new Rng(seed + 99);
  const inputs: DropInput[] = [];
  const hashes: string[] = [];
  let nextCheck = 500;
  while (run.ticks < TICKS) {
    if (run.canDrop) {
      const x = (aim.next() * 2 - 1) * 300;
      if (run.drop(x)) inputs.push({ tick: run.ticks, x });
    }
    run.update(4 + frames.next() * 40);
    if (run.ticks >= nextCheck) {
      hashes.push(`${run.ticks}:${run.stateHash()}`);
      nextCheck += 500;
    }
  }
  return { inputs, hashes };
}

/** Replays recorded inputs one tick at a time; hashes at the same ticks as the recording. */
function replay(seed: number, inputs: readonly DropInput[], checkTicks: readonly number[]) {
  const run = newRun(seed);
  const hashes: string[] = [];
  let next = 0;
  const end = Math.max(TICKS, ...checkTicks);
  while (run.ticks < end) {
    while (next < inputs.length && inputs[next]!.tick === run.ticks) {
      expect(run.drop(inputs[next]!.x)).toBe(true);
      next++;
    }
    run.tick();
    if (checkTicks.includes(run.ticks)) hashes.push(`${run.ticks}:${run.stateHash()}`);
  }
  return { run, hashes };
}

describe('determinism (TECH_SPEC §5)', () => {
  it('replays a run exactly from its seed and inputs, at any frame rate', () => {
    const recorded = playWithFrames(5, 1);
    expect(recorded.inputs.length).toBeGreaterThan(20);
    const ticks = recorded.hashes.map((h) => Number(h.split(':')[0]));

    // matter-js body ids are global: build other worlds in between so the replay's ids differ.
    new PhysicsWorld().addBall({ tier: 3, x: 0, y: -100 });
    const { run, hashes } = replay(5, recorded.inputs, ticks);
    expect(hashes).toEqual(recorded.hashes);
    expect(run.score).toBeGreaterThan(0);

    // No hidden state leaks between runs: a second replay matches as well.
    const again = replay(5, recorded.inputs, ticks);
    expect(again.hashes).toEqual(recorded.hashes);
  });

  it('reaches an expansion, so the timeline is covered as well', () => {
    const recorded = playWithFrames(9, 2);
    const ticks = recorded.hashes.map((h) => Number(h.split(':')[0]));
    const { run, hashes } = replay(9, recorded.inputs, ticks);
    expect(hashes).toEqual(recorded.hashes);
    expect(run.stage).toBeGreaterThan(1);
  });

  it('gives different runs for different seeds', () => {
    const a = replay(1, [{ tick: 0, x: 0 }], [600]);
    const b = replay(2, [{ tick: 0, x: 0 }], [600]);
    expect(a.run.current).toBeDefined();
    // Both first drops are the smallest tier at x = 0, but the queues differ.
    const queue = (r: RunController) => [r.current, ...r.preview].map((d) => d.tier).join();
    const differs = a.hashes[0] !== b.hashes[0] || queue(a.run) !== queue(b.run);
    expect(differs).toBe(true);
    expect(newRun(1).stateHash()).not.toBe(newRun(2).stateHash());
  });
});
