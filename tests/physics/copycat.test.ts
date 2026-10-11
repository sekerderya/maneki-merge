import { describe, expect, it } from 'vitest';
import { RUN_SAVE_VERSION, decodeRunSave } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import type { GameEvents } from '../../src/core/events';
import { Rng } from '../../src/core/rng';
import { RunController } from '../../src/run/RunController';
import { botMove } from './fixtures';

/** A run with Copycat on (or off) that logs NEXT's changes. */
function setup(seed = 2, copycat = true) {
  const run = new RunController({ seed });
  if (copycat) run.setPickLevel('copycat', 1);
  const changes: GameEvents['nextChanged'][] = [];
  run.events.on('nextChanged', (e) => changes.push(e));
  return { run, changes };
}

/** Two cats of `size` on the floor around `centre`: they merge on the next tick. */
function spawnPair(run: RunController, size: number, centre = 0) {
  const tier = stageInfo(run.stage).firstTier + size - 1;
  const r = sizeRadius(size);
  run.spawnBall(tier, centre - r + 1, -r);
  run.spawnBall(tier, centre + r - 1, -r);
}

/** Waits for the cooldown, then drops at `x`. */
function dropAt(run: RunController, x: number): void {
  for (let i = 0; i < 600 && !run.canDrop; i++) run.tick();
  expect(run.drop(x)).toBe(true);
}

const sizeOf = (run: RunController, tier: number): number =>
  tier - stageInfo(run.stage).firstTier + 1;

describe('Copycat (GAME_DESIGN §15.13)', () => {
  it('turns the cat in NEXT to the size of the latest merge; the paw keeps its cat', () => {
    const { run, changes } = setup();
    dropAt(run, -250);
    const current = run.current;
    const before = run.next;
    spawnPair(run, 3, 150);
    run.tick();
    expect(sizeOf(run, run.next.tier)).toBe(3);
    expect(run.current).toEqual(current);
    expect(run.next.golden).toBe(before.golden);
    expect(changes).toEqual(before.tier === 3 ? [] : [{ kind: 'cat', tier: 3, golden: false }]);
    // The copied cat moves into the paw and stays as it is; NEXT follows the next merge.
    dropAt(run, -250);
    expect(sizeOf(run, run.current.tier)).toBe(3);
    expect(sizeOf(run, run.next.tier)).toBe(3);
    spawnPair(run, 2, 150);
    run.tick();
    expect(sizeOf(run, run.current.tier)).toBe(3);
    expect(sizeOf(run, run.next.tier)).toBe(2);
    expect(changes.at(-1)).toMatchObject({ kind: 'cat', tier: 2 });
  });

  it('copies at most size 4, the biggest drop', () => {
    const { run } = setup();
    dropAt(run, -250);
    spawnPair(run, 6, 100);
    run.tick();
    expect(sizeOf(run, run.next.tier)).toBe(4);
  });

  it("rolls as usual before a stage's first merge and starts over at each stage", () => {
    const plain = setup(5, false).run;
    const { run } = setup(5);
    const queued = (r: RunController) => [r.current, r.next];
    // The same drops, far apart: no merge yet, so the queues match.
    for (const x of [-260, 260, -60]) {
      dropAt(plain, x);
      dropAt(run, x);
      expect(queued(run)).toEqual(queued(plain));
    }
    spawnPair(run, 4, 0);
    spawnPair(plain, 4, 0);
    run.tick();
    plain.tick();
    expect(sizeOf(run, run.next.tier)).toBe(4);
    // A new stage forgets the size until its first merge.
    run.jumpToStage(2);
    plain.jumpToStage(2);
    for (let i = 0; i < 2000 && (run.state !== 'playing' || plain.state !== 'playing'); i++) {
      run.tick();
      plain.tick();
    }
    expect(run.stage).toBe(2);
    for (const x of [-260, 260]) {
      dropAt(plain, x);
      dropAt(run, x);
      expect(run.next).toEqual(plain.next);
    }
  });

  it('copies the size that met: a golden merge, a joker, a Hubris three, a fizzle', () => {
    const golden = setup().run;
    dropAt(golden, -250);
    const r = sizeRadius(2);
    golden.spawnBall(2, 100 - r + 1, -r, { golden: true });
    golden.spawnBall(2, 100 + r - 1, -r);
    golden.tick();
    expect(sizeOf(golden, golden.next.tier)).toBe(2);

    const fizzle = setup().run;
    fizzle.setPickLevel('dice', 1);
    fizzle.forceDice('fizzle');
    dropAt(fizzle, -250);
    spawnPair(fizzle, 3, 100);
    fizzle.tick();
    expect(sizeOf(fizzle, fizzle.next.tier)).toBe(3);

    const joker = setup().run;
    dropAt(joker, -250);
    const r1 = sizeRadius(1);
    joker.spawnBall(1, 100, -r1);
    joker.spawnBall(2, 100, -2 * r1 - sizeRadius(2) + 2, { kind: 'joker' });
    for (let i = 0; i < 5; i++) joker.tick();
    expect(sizeOf(joker, joker.next.tier)).toBe(1);
  });

  it('turns off with the rule (debug)', () => {
    const { run } = setup();
    dropAt(run, -250);
    spawnPair(run, 3, 150);
    run.tick();
    run.setPickLevel('copycat', 0);
    spawnPair(run, 1, -100);
    run.tick();
    expect(sizeOf(run, run.next.tier)).toBe(3);
  });

  it('plays the same for the same seed and inputs, and through a save', () => {
    const play = (): RunController => {
      const { run } = setup(31);
      const aim = new Rng(6);
      for (let t = 0; t < 3000 && run.state !== 'over'; t++) {
        botMove(run, (aim.next() * 2 - 1) * 280, aim.next());
        run.tick();
      }
      return run;
    };
    const a = play();
    const b = play();
    expect(b.stateHash()).toBe(a.stateHash());
    a.pause();
    const text = JSON.stringify({
      version: RUN_SAVE_VERSION,
      save: { run: a.snapshot(), recordsBefore: { bestScore: 0, bestStage: 1, highestTier: 0 } },
    });
    const decoded = decodeRunSave(text);
    if (!('save' in decoded)) throw new Error(decoded.error);
    const saved: RunSnapshot = decoded.save.run;
    expect(saved.queue.follow).toBeDefined();
    const back = RunController.restore(saved);
    expect(back.stateHash()).toBe(a.stateHash());
    // A followed tier the stage doesn't drop is refused.
    const wrong = { ...saved, queue: { ...saved.queue, follow: 7 } };
    expect(() => RunController.restore(wrong)).toThrow(RangeError);
  });
});
