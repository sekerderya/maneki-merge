import { describe, expect, it } from 'vitest';
import type { PickId } from '../../src/config/picks';
import { Rng } from '../../src/core/rng';
import { RunController } from '../../src/run/RunController';
import { botMove, publicFingerprint, upgrades } from './fixtures';

/**
 * What a v0.33.5 run showed at these ticks: a seed with the old trials and blessings, a debug stage
 * clear (no picks) and a bot dropping at seeded spots. Batch 18's trials and rules (GAME_DESIGN
 * §15.8–§15.11) all start at 0 and roll on their own generators, so the same seed must still play
 * exactly the same.
 *
 * v0.36 changed the score and coins (GAME_DESIGN §4) and Big Catch's step (§8) on purpose, so the
 * prints now leave the score and coins out and the runs play without Big Catch; both lists were
 * re-recorded that way by v0.35.3, the last version before the change. v0.39 made the blessings' chances
 * 1.5 times as high and a Lucky Save pop 9 small cats instead of 6 (GAME_DESIGN §6, §15.1), also on
 * purpose: the prints from tick 2400 on were re-recorded by v0.39.
 */
const V0_33_5 = [
  '600:3419724d:playing:3',
  '1200:9c829b50:playing:7',
  '1800:dbe99b93:playing:12',
  '2400:b83c3871:playing:16',
  '3000:8ceb642c:playing:11',
  '3600:8d5ab8a6:playing:11',
  '4200:080b9a45:playing:17',
  '4800:b1816ff1:playing:18',
];

const LEVELS: [PickId, number][] = [
  ['moreBoulders', 3],
  ['ironBands', 1],
  ['bigBoulders', 1],
  ['moreMagnets', 5],
  ['goldenCats', 3],
  ['hanabi', 3],
  ['joker', 3],
];

/**
 * What a v0.34.0 run showed at these ticks (written by v0.34.0 itself; the last two since v0.35.2):
 * a seed with Batch 18's trials and rules on, a debug stage clear and the same kind of bot. Batch 19's picks
 * (GAME_DESIGN §15) start at 0 and roll on their own generators, so it must play the same. The prints
 * from tick 3600 on were re-recorded by v0.39 (stronger blessings and Lucky Save, see above).
 */
const V0_34_0 = [
  '600:b522b839:playing:3',
  '1200:ecff7c01:playing:9',
  '1800:f7d43d51:playing:11',
  '2400:7f878d0d:playing:13',
  '3000:6353718a:playing:21',
  '3600:caed50b1:playing:15',
  '4200:41feb09b:playing:18',
  '4800:a67ba07d:playing:16',
];

const LEVELS_0_34: [PickId, number][] = [
  ['moreBoulders', 2],
  ['ironBands', 1],
  ['goldenCats', 2],
  ['joker', 2],
  ['hanabi', 2],
  ['wind', 2],
  ['heavyDrop', 2],
  ['porcelain', 2],
  ['hubris', 1],
  ['echo', 1],
];

describe('an old seed with the new trials and rules at 0', () => {
  it('plays exactly as it did in v0.33.5', () => {
    const run = new RunController({
      seed: 335,
      upgrades: upgrades({ luckyPaw: 1, secondChance: 1 }),
    });
    for (const [id, level] of LEVELS) run.setPickLevel(id, level);
    const aim = new Rng(77);
    const prints: string[] = [];
    for (let t = 1; t <= 4800 && run.state !== 'over'; t++) {
      if (t === 300) run.jumpToStage(2);
      botMove(run, (aim.next() * 2 - 1) * 300, aim.next());
      run.tick();
      if (t % 600 === 0) {
        prints.push(
          `${run.ticks}:${publicFingerprint(run, false)}:${run.state}:${run.balls.length}`,
        );
      }
    }
    expect(prints).toEqual(V0_33_5);
  });

  it('plays exactly as it did in v0.34.0, with Batch 18 on', () => {
    const run = new RunController({
      seed: 340,
      upgrades: upgrades({ luckyPaw: 1, secondChance: 1 }),
    });
    for (const [id, level] of LEVELS_0_34) run.setPickLevel(id, level);
    const aim = new Rng(78);
    const prints: string[] = [];
    for (let t = 1; t <= 4800 && run.state !== 'over'; t++) {
      if (t === 300) run.jumpToStage(2);
      botMove(run, (aim.next() * 2 - 1) * 300, aim.next());
      run.tick();
      if (t % 600 === 0) {
        prints.push(
          `${run.ticks}:${publicFingerprint(run, false)}:${run.state}:${run.balls.length}`,
        );
      }
    }
    expect(prints).toEqual(V0_34_0);
  });
});
