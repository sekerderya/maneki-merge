import { describe, expect, it } from 'vitest';
import type { PickId } from '../../src/config/picks';
import { Rng } from '../../src/core/rng';
import { RunController } from '../../src/run/RunController';
import { botMove, publicFingerprint, upgrades } from './fixtures';

/**
 * What a v0.33.5 run showed at these ticks (written by v0.33.5 itself): a seed with the old trials
 * and blessings, a debug stage clear (no picks) and a bot dropping at seeded spots. Batch 18's
 * trials and rules (GAME_DESIGN §15.8–§15.11) all start at 0 and roll on their own generators, so
 * the same seed must still play exactly the same.
 */
const V0_33_5 = [
  '600:ea66bd83:playing:3',
  '1200:71fe08a7:playing:9',
  '1800:07c3b9d4:playing:14',
  '2400:deb2f4d5:playing:13',
  '3000:b2f5f54e:playing:19',
  '3600:0e2bcbe5:playing:15',
  '4200:ee309553:playing:21',
  '4800:8f5b50b0:playing:22',
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

describe('an old seed with the new trials and rules at 0', () => {
  it('plays exactly as it did in v0.33.5', () => {
    const run = new RunController({
      seed: 335,
      upgrades: upgrades({ bigCatch: 2, luckyPaw: 1, secondChance: 1 }),
    });
    for (const [id, level] of LEVELS) run.setPickLevel(id, level);
    const aim = new Rng(77);
    const prints: string[] = [];
    for (let t = 1; t <= 4800 && run.state !== 'over'; t++) {
      if (t === 300) run.jumpToStage(2);
      botMove(run, (aim.next() * 2 - 1) * 300, aim.next());
      run.tick();
      if (t % 600 === 0) {
        prints.push(`${run.ticks}:${publicFingerprint(run)}:${run.state}:${run.balls.length}`);
      }
    }
    expect(prints).toEqual(V0_33_5);
  });
});
