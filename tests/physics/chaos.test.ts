import { describe, expect, it } from 'vitest';
import { MAX_SPEED_BASE } from '../../src/config/physics';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Rng } from '../../src/core/rng';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { RunController } from '../../src/run/RunController';
import { botMove, inJar, STEPS_PER_SECOND, upgrades } from './fixtures';

interface Scenario {
  readonly name: string;
  readonly seed: number;
  readonly levels: UpgradeLevels;
  readonly maxSeconds: number;
  /** Clears the stage (a debug jump) every this many seconds, or never. */
  readonly clearEverySeconds?: number;
}

const SCENARIOS: readonly Scenario[] = [
  {
    name: 'stage clears and expansions under a live pile, with strong upgrades',
    seed: 11,
    levels: upgrades({
      luckyPaw: 3,
      comboCharm: 5,
    }),
    maxSeconds: 150,
    clearEverySeconds: 12,
  },
  {
    name: 'Lucky Saves and a game over',
    seed: 21,
    levels: upgrades({ bigCatch: 5, secondChance: 2 }),
    // Since v0.19.5 this bot clears stage 1 after its saves and the run ends at 196 s.
    maxSeconds: 300,
  },
];

/**
 * A bot drops every cat or boulder the moment it can, at a random x, uses every magnet on a random
 * ball and takes the first option of every pick (and, in one scenario, clears the stage now and
 * then with the debug jump). Trials and blessings are raised so boulders, magnets and golden cats
 * come often. On every tick the physics invariants hold (nothing escapes,
 * nothing beats the speed limit), and at the end the events add up to the run's totals.
 *
 * "Escapes": a cat squeezed against a wall by a newly merged neighbour can be pushed a little way
 * into the wall for one step, before the wall contact exists, and is pushed back on the next
 * (matter-js resolves the contact one step late; about once in 300 000 ticks, as before v0.12).
 * So a centre may poke past a wall's face for a single tick, by under half a radius.
 */
const MAX_POKE_RADII = 0.5;
describe('chaos runs', () => {
  it.each(SCENARIOS)(
    '$name',
    ({ seed, levels, maxSeconds, clearEverySeconds }) => {
      const events = new EventBus<GameEvents>();
      const totals = {
        score: 0,
        coins: 0,
        banked: 0,
        drops: 0,
        merges: 0,
        jackpots: 0,
        pops: 0,
        takes: 0,
        broken: 0,
        golden: 0,
      };
      let expansions = 0;
      let saves = 0;
      events.on('catDropped', () => totals.drops++);
      events.on('ballTaken', () => totals.takes++);
      events.on('boulderBroken', () => totals.broken++);
      events.on('merged', (p) => {
        totals.merges++;
        if (p.golden) totals.golden++;
        totals.score += p.score;
        totals.coins += p.coins;
      });
      events.on('jackpot', (p) => {
        totals.jackpots++;
        totals.score += p.score;
        totals.coins += p.coins;
      });
      events.on('catPopped', (p) => {
        totals.pops++;
        totals.coins += p.coins;
      });
      events.on('expansionFinished', () => expansions++);
      events.on('luckySave', () => saves++);
      const run = new RunController({
        seed,
        events,
        upgrades: levels,
        bank: (coins) => (totals.banked += coins),
      });
      run.setPickLevel('moreMagnets', 2);
      run.setPickLevel('moreBoulders', 2);
      run.setPickLevel('ironBands', 1);
      run.setPickLevel('goldenCats', 3);

      const aim = new Rng(seed * 31 + 7);
      /** Each debug clear puts the stage's last cat into the jar. */
      let spawned = 0;
      /** Cats whose centre was outside the jar after the previous tick. */
      let poking = new Set<number>();
      for (let tick = 0; tick < maxSeconds * STEPS_PER_SECOND && run.state !== 'over'; tick++) {
        // Picks may follow each other before time moves on.
        while (botMove(run, (aim.next() * 2 - 1) * run.geometry.halfWidth, aim.next())) {
          if (run.state !== 'choosing') break;
        }
        const every = clearEverySeconds ? clearEverySeconds * STEPS_PER_SECOND : 0;
        if (every && tick % every === every - 1 && run.state === 'playing' && run.stage < 5) {
          run.jumpToStage(run.stage + 1);
          spawned++;
        }
        run.tick();
        const { halfWidth } = run.geometry;
        const outside = new Set<number>();
        for (const cat of run.balls) {
          if (!inJar(cat, halfWidth)) {
            const depth = Math.max(Math.abs(cat.x) - halfWidth, cat.y) / cat.radius;
            if (!(depth < MAX_POKE_RADII) || poking.has(cat.id)) {
              throw new Error(`Cat ${cat.id} escaped at tick ${tick}`);
            }
            outside.add(cat.id);
          }
          if (cat.speed > MAX_SPEED_BASE + 1e-6) {
            throw new Error(`Cat ${cat.id} too fast at tick ${tick}: ${cat.speed}`);
          }
        }
        poking = outside;
      }

      expect(totals.score).toBe(run.score);
      expect(totals.coins).toBe(run.coins);
      expect(totals.banked).toBe(run.coins);
      expect(run.balls).toHaveLength(
        totals.drops +
          spawned -
          totals.merges -
          2 * totals.jackpots -
          totals.pops -
          totals.takes -
          totals.broken,
      );
      expect(totals.merges).toBeGreaterThan(50);
      expect(totals.takes).toBeGreaterThan(0);
      expect(totals.golden).toBeGreaterThan(0);
      if (clearEverySeconds) expect(expansions).toBe(4);
      if (levels.secondChance > 0) {
        expect(saves).toBe(levels.secondChance);
        expect(run.state).toBe('over');
      }
    },
    120_000,
  );
});
