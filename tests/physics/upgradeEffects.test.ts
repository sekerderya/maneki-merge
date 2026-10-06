/**
 * Every upgrade bought in the shop changes the next run (ROADMAP M8): coins are spent through
 * `Profile.buy`, then a profile run starts and is compared with one at level 0.
 */
import { describe, expect, it } from 'vitest';
import { stepsFor } from '../../src/config/physics';
import { DROP_COOLDOWN_MS } from '../../src/config/timings';
import { tierCoins } from '../../src/config/tiers';
import { UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import type { Drop } from '../../src/core/dropQueue';
import { Profile } from '../../src/core/profile';
import type { Scheduler } from '../../src/core/profile';
import { defaultSave, MemoryStorage, SaveStore } from '../../src/core/save';
import { startProfileRun } from '../../src/run/profileRun';
import type { RunController } from '../../src/run/RunController';

const frozen: Scheduler = { now: () => 0, setTimeout: () => 1, clearTimeout: () => {} };
const SEED = 21;

/** A run after buying `id` up to `level` in the shop (0 = nothing bought). */
function runAfterBuying(id: UpgradeId, level: number, instantExpansion = false): RunController {
  const data = defaultSave();
  data.wallet.coins = UPGRADES[id].prices.reduce((sum, p) => sum + p, 0);
  const profile = new Profile(new SaveStore(new MemoryStorage()), data, { scheduler: frozen });
  for (let i = 0; i < level; i++) expect(profile.buy(id).ok).toBe(true);
  expect(profile.upgrades[id]).toBe(level);
  return startProfileRun(profile, { seed: SEED, instantExpansion });
}

/** The first `count` cats the dropper hands out, dropped across the jar one by one. */
function drops(run: RunController, count: number): Drop[] {
  const out: Drop[] = [];
  const span = run.geometry.halfWidth * 0.8;
  for (let i = 0; i < count; i++) {
    out.push(run.current);
    expect(run.drop(((i % 7) / 3 - 1) * span)).toBe(true);
    for (let t = 0; t <= stepsFor(DROP_COOLDOWN_MS); t++) run.tick();
  }
  return out;
}

/** Two same-tier cats resting side by side on the floor, overlapping by 2 units. */
function mergePair(run: RunController, tier: number, centre: number): void {
  const r = run.radiusOf(tier);
  run.spawnBall(tier, centre - r + 1, -r);
  run.spawnBall(tier, centre + r - 1, -r);
  run.tick();
}

describe('upgrade effects in runs (GAME_DESIGN §10)', () => {
  it('Lucky Paw: more coins per merge', () => {
    const coins = [0, 4].map((level) => {
      const run = runAfterBuying('luckyPaw', level);
      mergePair(run, 4, 0);
      return run.coins;
    });
    expect(coins).toEqual([5, 8]); // 5 × 1.6
  });

  it('Big Catch: bigger cats from the same seed', () => {
    const [plain, lucky] = [0, 5].map((level) => drops(runAfterBuying('bigCatch', level), 24));
    const sum = (list: Drop[]): number => list.reduce((s, d) => s + d.tier, 0);
    // Same random rolls: every cat is at least as big, and some are bigger.
    plain!.forEach((drop, i) => expect(lucky![i]!.tier).toBeGreaterThanOrEqual(drop.tier));
    expect(sum(lucky!)).toBeGreaterThan(sum(plain!));
  });

  it('Golden Merge: some merges pay ×3 coins', () => {
    const golden = [0, 5].map((level) => {
      const run = runAfterBuying('goldenMerge', level);
      const merges: { golden: boolean; coins: number; tier: number }[] = [];
      run.events.on('merged', (e) => merges.push(e));
      for (let i = 0; i < 40; i++) mergePair(run, 1, ((i % 5) - 2) * 110);
      for (const m of merges) expect(m.coins).toBe(tierCoins(m.tier) * (m.golden ? 3 : 1));
      return merges.filter((m) => m.golden).length;
    });
    expect(golden[0]).toBe(0);
    expect(golden[1]).toBeGreaterThan(0);
  });

  it('Combo Charm: a combo pays extra', () => {
    const coins = [0, 5].map((level) => {
      const run = runAfterBuying('comboCharm', level);
      mergePair(run, 4, -200);
      mergePair(run, 4, 200);
      expect(run.combo).toBe(2);
      return run.coins;
    });
    expect(coins).toEqual([10, 12]); // 5 + 5 × 1.4 = 5 + 7
  });

  it('Second Chance: a Lucky Save instead of game over', () => {
    const [plain, saved] = [0, 1].map((level) => {
      const run = runAfterBuying('secondChance', level);
      expect(run.luckySavesLeft).toBe(level);
      run.forceDangerTimeout();
      return run;
    });
    expect(plain!.state).toBe('over');
    expect(saved!.state).toBe('playing');
    expect(saved!.luckySavesLeft).toBe(0);
  });
});
