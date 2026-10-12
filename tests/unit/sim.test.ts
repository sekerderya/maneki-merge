import { describe, expect, it } from 'vitest';
import { deriveStats } from '../../src/core/upgrades';
import { botUpgrades, playBot, summarize, upgradeLevels } from '../../tools/sim/bot';
import type { BotOptions, BotRun } from '../../tools/sim/bot';
import { metaReport, playMeta } from '../../tools/sim/meta';

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
    // Seed 16 clears stage 1 in 53 s, then plays on into stage 2 (seed 12 until v0.41).
    const run = playBot({ seed: 16, capSeconds: 70, stages: 2 });
    expect(run.stagesCleared).toBe(1);
    expect(run.clears).toHaveLength(1);
    expect(run.clears[0]!.seconds).toBeCloseTo(53, -1);
    expect(run.score).toBeGreaterThan(run.clears[0]!.score);
    expect(run.coins).toBeGreaterThan(run.clears[0]!.coins);
  });

  it('plays like a person with the smart aim: it thinks before each drop', () => {
    const options = { seed: 4, capSeconds: 30, aim: 'smart' } as const;
    const smart = playBot(options);
    expect(playBot(options)).toEqual(smart);
    const quick = playBot({ ...options, aim: 'match' });
    expect(smart.drops).toBeLessThan(quick.drops);
    expect(smart.drops).toBeGreaterThan(10);
    // A longer pause, fewer drops.
    expect(playBot({ ...options, thinkMs: 1500 }).drops).toBeLessThan(smart.drops);
  });

  it('gives a run extra Lucky Saves on top of the shop’s', () => {
    const levels = upgradeLevels('secondChance=1,luckyPaw=3');
    expect(deriveStats(botUpgrades(levels, 2)).luckySaves).toBe(3);
    expect(botUpgrades(levels, 2)).toMatchObject({ luckyPaw: 3, secondChance: 3 });
    expect(botUpgrades(levels)).toEqual(levels);
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

describe('the meta bot (npm run sim -- --meta, TECH_SPEC §11)', () => {
  /** A made-up run that clears `cleared` stages, a minute each, and earns `coins`. */
  const fakeRun = (options: BotOptions, cleared: number, coins: number): BotRun => ({
    seed: options.seed,
    stagesCleared: cleared,
    lost: true,
    playSeconds: 60 * cleared + 30,
    drops: 0,
    merges: 0,
    threes: 0,
    echoes: 0,
    breaks: 0,
    curses: 0,
    lifted: 0,
    taken: 0,
    stones: 0,
    lucky: 0,
    fizzles: 0,
    copies: 0,
    score: 0,
    coins,
    clears: Array.from({ length: cleared }, (_, i) => ({
      score: 0,
      coins: 0,
      seconds: 60 * (i + 1),
    })),
  });

  it('plays run after run from a fresh profile and buys the cheapest cards after each', () => {
    const played: BotOptions[] = [];
    const player = playMeta({ player: 3, minutes: 6, goal: 5, extraSaves: 1 }, (options) => {
      played.push(options);
      return fakeRun(options, 2, 1000);
    });
    // A run: 20 s before it, 150 s of play and 15 s for each of its two clears.
    expect(player.runs.map((r) => r.minute * 60)).toEqual([200, 400]);
    expect(played.map((o) => [o.seed, o.aim, o.extraSaves])).toEqual([
      [3001, 'smart', 1],
      [3002, 'smart', 1],
    ]);
    // 1000 coins: Lucky Paw 1 and Big Catch 1 (150 each), Lucky Paw 2 (400). Then 300 + 1000:
    // Big Catch 2 and Golden Cats 2 (400 each).
    expect(player.runs.map((r) => r.levelsBought)).toEqual([3, 5]);
    expect(played[1]!.upgrades).toMatchObject({ luckyPaw: 2, bigCatch: 1, goldenCats: 1 });
    expect(player.goalMinute).toBeNull();
    expect(player.maxedMinute).toBeNull();
  });

  it('times the first clear of the goal stage and reports it', () => {
    const player = playMeta({ player: 1, minutes: 1, goal: 5 }, (o) => fakeRun(o, 5, 0));
    // 20 s before the run, 300 s to the fifth clear and 15 s for each of the five clears.
    expect(player.goalMinute! * 60).toBeCloseTo(395, 9);
    const report = metaReport([player], 1, 5);
    expect(report).toContain('Stage 5 cleared within 1 min: 0 of 1. Median: 6.6 min.');
    expect(report).toContain('The first run reaches stage 6 (median).');
  });
});
