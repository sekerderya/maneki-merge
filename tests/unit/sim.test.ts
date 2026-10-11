import { describe, expect, it } from 'vitest';
import { playBot, summarize, upgradeLevels } from '../../tools/sim/bot';
import type { BotRun } from '../../tools/sim/bot';

describe('the balance bot (npm run sim, TECH_SPEC §11)', () => {
  it('plays the same run for the same seed, picks and aim', () => {
    const options = { seed: 3, capSeconds: 20, levels: { dice: 1, cursedBell: 1 } } as const;
    const a = playBot(options);
    expect(playBot(options)).toEqual(a);
    expect(a.drops).toBeGreaterThan(20);
    expect(a.merges).toBeGreaterThan(0);
    expect(a.playSeconds).toBeLessThanOrEqual(20.01);
    // Aiming at random plays a different run.
    expect(playBot({ ...options, aim: 'random' })).not.toEqual(a);
  });

  it('notes the score and coins at each stage clear', () => {
    // Seed 12 clears stage 1 in 58 s, then plays on into stage 2.
    const run = playBot({ seed: 12, capSeconds: 70, stages: 2 });
    expect(run.stagesCleared).toBe(1);
    expect(run.clears).toHaveLength(1);
    expect(run.clears[0]!.seconds).toBeCloseTo(58, -1);
    expect(run.score).toBeGreaterThan(run.clears[0]!.score);
    expect(run.coins).toBeGreaterThan(run.clears[0]!.coins);
  });

  it('reads shop cards from the command line', () => {
    expect(upgradeLevels('max')).toMatchObject({ luckyPaw: 10, bigCatch: 10, joker: 5 });
    expect(upgradeLevels('bigCatch=4,hanabi=2')).toMatchObject({
      bigCatch: 4,
      hanabi: 2,
      goldenCats: 1,
      luckyPaw: 0,
    });
    expect(() => upgradeLevels('nope=1')).toThrow('Unknown upgrade: nope');
  });

  it('counts what the picks did', () => {
    const run = playBot({ seed: 5, capSeconds: 25, levels: { copycat: 1, dice: 1 } });
    expect(run.copies).toBeGreaterThan(0);
    expect(run.lucky + run.fizzles).toBeGreaterThan(0);
  });

  it('sums an arm: cleared, out of time, lost and the median run', () => {
    const run = (seed: number, playSeconds: number, cleared: number, lost: boolean): BotRun => ({
      seed,
      stagesCleared: cleared,
      lost,
      playSeconds,
      drops: 10,
      merges: 5,
      threes: 0,
      echoes: 0,
      breaks: 0,
      curses: 1,
      lifted: 1,
      taken: 0,
      stones: 0,
      lucky: 0,
      fizzles: 0,
      copies: 0,
      score: 100,
      coins: 10,
      clears: cleared > 0 ? [{ score: 60, coins: 6, seconds: playSeconds / 2 }] : [],
    });
    const summary = summarize('x', [
      run(1, 30, 1, false),
      run(2, 50, 0, true),
      run(3, 240, 0, false),
    ]);
    expect(summary).toMatchObject({ runs: 3, cleared: 1, lost: 1, timedOut: 1, medianSeconds: 50 });
    expect(summary.totals).toMatchObject({ drops: 30, merges: 15, curses: 3, lifted: 3 });
    expect(summary.totals).toMatchObject({ score: 300, coins: 30 });
    expect(summary.clears).toEqual([{ runs: 1, score: 60, coins: 6, seconds: 15 }]);
    expect(summarize('even', [run(1, 30, 1, false), run(2, 50, 0, true)]).medianSeconds).toBe(40);
  });
});
