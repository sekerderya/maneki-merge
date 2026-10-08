import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { PhysicsWorld } from '../../src/physics/PhysicsWorld';
import { RunController } from '../../src/run/RunController';
import { botMove, replayInput, STEPS_PER_SECOND, upgrades } from './fixtures';
import type { PlayInput } from './fixtures';

/**
 * An input (a drop, a magnet's take, a pick, a debug stage clear or the debug picks), keyed to the
 * tick it arrived before.
 */
interface DropInput {
  readonly tick: number;
  readonly input: PlayInput | 'clear' | 'picks';
}

const LEVELS = upgrades({ bigCatch: 2, comboCharm: 3, secondChance: 1 });
const TICKS = 25 * STEPS_PER_SECOND;

function newRun(seed: number): RunController {
  return new RunController({ seed, upgrades: LEVELS });
}

/**
 * Plays `TICKS` ticks driven by `update(frameMs)` with random frame lengths, dropping at a random
 * x whenever a frame starts with the dropper ready (a magnet takes a random ball, a pick takes its
 * first option). Records each input with its tick. With `clearAt`, the first frame from that tick
 * on clears the stage (debug jump), so the expansion timeline replays too; with `picksAt`, a pick
 * opens then. More Magnets and Golden Cats make the special balls common.
 */
function playWithFrames(
  seed: number,
  frameSeed: number,
  clearAt = Infinity,
  picksAt = Infinity,
): { inputs: DropInput[]; hashes: string[] } {
  const run = newRun(seed);
  run.setPickLevel('moreMagnets', 5);
  run.setPickLevel('goldenCats', 5);
  const frames = new Rng(frameSeed);
  const aim = new Rng(seed + 99);
  const inputs: DropInput[] = [];
  const hashes: string[] = [];
  let nextCheck = 500;
  let cleared = false;
  let picked = false;
  while (run.ticks < TICKS) {
    if (!cleared && run.ticks >= clearAt && run.state === 'playing') {
      cleared = true;
      run.jumpToStage(run.stage + 1);
      inputs.push({ tick: run.ticks, input: 'clear' });
    }
    if (!picked && run.ticks >= picksAt && run.state === 'playing') {
      picked = true;
      run.offerPicks();
      inputs.push({ tick: run.ticks, input: 'picks' });
    }
    // Picks may follow each other before time moves on.
    for (let move = botMove(run, (aim.next() * 2 - 1) * 300, aim.next()); move; ) {
      inputs.push({ tick: run.ticks, input: move });
      move = run.state === 'choosing' ? botMove(run, 0) : null;
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
  run.setPickLevel('moreMagnets', 5);
  run.setPickLevel('goldenCats', 5);
  const hashes: string[] = [];
  let next = 0;
  const end = Math.max(TICKS, ...checkTicks);
  while (run.ticks < end) {
    while (next < inputs.length && inputs[next]!.tick === run.ticks) {
      const { input } = inputs[next]!;
      if (input === 'clear') run.jumpToStage(run.stage + 1);
      else if (input === 'picks') run.offerPicks();
      else expect(replayInput(run, input)).toBe(true);
      next++;
    }
    run.tick();
    if (checkTicks.includes(run.ticks)) hashes.push(`${run.ticks}:${run.stateHash()}`);
  }
  return { run, hashes };
}

describe('determinism (TECH_SPEC §5)', () => {
  it('replays a run exactly from its seed and inputs, at any frame rate', () => {
    const recorded = playWithFrames(5, 1, Infinity, 8 * STEPS_PER_SECOND);
    expect(recorded.inputs.length).toBeGreaterThan(20);
    // Magnets took balls and a pick was chosen, so those replay too.
    const has = (key: string): boolean =>
      recorded.inputs.some((i) => typeof i.input === 'object' && key in i.input);
    expect(has('take')).toBe(true);
    expect(has('choose')).toBe(true);
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

  it('replays a stage clear and its expansion, so the timeline is covered as well', () => {
    const recorded = playWithFrames(9, 2, 10 * STEPS_PER_SECOND);
    const ticks = recorded.hashes.map((h) => Number(h.split(':')[0]));
    const { run, hashes } = replay(9, recorded.inputs, ticks);
    expect(hashes).toEqual(recorded.hashes);
    expect(run.stage).toBeGreaterThan(1);
  });

  it('gives different runs for different seeds', () => {
    const a = replay(1, [{ tick: 0, input: { drop: 0 } }], [600]);
    const b = replay(2, [{ tick: 0, input: { drop: 0 } }], [600]);
    expect(a.run.current).toBeDefined();
    // Both first drops are the smallest tier at x = 0, but the queues differ.
    const queue = (r: RunController) => [r.current, r.next].map((d) => d.tier).join();
    const differs = a.hashes[0] !== b.hashes[0] || queue(a.run) !== queue(b.run);
    expect(differs).toBe(true);
    expect(newRun(1).stateHash()).not.toBe(newRun(2).stateHash());
  });
});
