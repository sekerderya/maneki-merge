import { describe, expect, it } from 'vitest';
import { MAX_SPEED_BASE } from '../../src/config/physics';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Rng } from '../../src/core/rng';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { RunController } from '../../src/run/RunController';
import { inJar, STEPS_PER_SECOND, upgrades } from './fixtures';

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
      shrineExpansion: 3,
      goldenTouch: 5,
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
    maxSeconds: 180,
  },
];

/**
 * A bot drops every cat the moment it can, at a random x (and, in one scenario, clears the stage
 * now and then with the debug jump). On every tick the physics invariants hold (nothing escapes,
 * nothing beats the speed limit), and at the end the events add up to the run's totals.
 */
describe('chaos runs', () => {
  it.each(SCENARIOS)(
    '$name',
    ({ seed, levels, maxSeconds, clearEverySeconds }) => {
      const events = new EventBus<GameEvents>();
      const totals = { score: 0, coins: 0, banked: 0, drops: 0, merges: 0, jackpots: 0, pops: 0 };
      let expansions = 0;
      let saves = 0;
      events.on('catDropped', () => totals.drops++);
      events.on('merged', (p) => {
        totals.merges++;
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

      const aim = new Rng(seed * 31 + 7);
      /** Each debug clear puts the stage's last cat into the jar. */
      let spawned = 0;
      for (let tick = 0; tick < maxSeconds * STEPS_PER_SECOND && run.state !== 'over'; tick++) {
        if (run.canDrop) run.drop((aim.next() * 2 - 1) * run.geometry.halfWidth);
        const every = clearEverySeconds ? clearEverySeconds * STEPS_PER_SECOND : 0;
        if (every && tick % every === every - 1 && run.state === 'playing' && run.stage < 5) {
          run.jumpToStage(run.stage + 1);
          spawned++;
        }
        run.tick();
        const { halfWidth } = run.geometry;
        for (const cat of run.balls) {
          if (!inJar(cat, halfWidth)) throw new Error(`Cat ${cat.id} escaped at tick ${tick}`);
          if (cat.speed > MAX_SPEED_BASE + 1e-6) {
            throw new Error(`Cat ${cat.id} too fast at tick ${tick}: ${cat.speed}`);
          }
        }
      }

      expect(totals.score).toBe(run.score);
      expect(totals.coins).toBe(run.coins);
      expect(totals.banked).toBe(run.coins);
      expect(run.balls).toHaveLength(
        totals.drops + spawned - totals.merges - 2 * totals.jackpots - totals.pops,
      );
      expect(totals.merges).toBeGreaterThan(50);
      if (clearEverySeconds) expect(expansions).toBe(4);
      if (levels.secondChance > 0) {
        expect(saves).toBe(levels.secondChance);
        expect(run.state).toBe('over');
      }
    },
    120_000,
  );
});
