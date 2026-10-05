/**
 * The payout pipeline end to end (ROADMAP M7): physics merges → RunEconomy → the wallet in the
 * profile → storage. Every number is worked out from GAME_DESIGN §5 by hand.
 */
import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../../src/config/app';
import { stageInfo } from '../../src/config/stages';
import { tierRadius } from '../../src/config/tiers';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Profile } from '../../src/core/profile';
import type { Scheduler } from '../../src/core/profile';
import { defaultSave, MemoryStorage, SaveStore } from '../../src/core/save';
import type { SaveData } from '../../src/core/save';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { startProfileRun } from '../../src/run/profileRun';
import type { RunController } from '../../src/run/RunController';
import { upgrades } from './fixtures';

/** Time never moves: after the first write, everything waits for a flush. */
const frozen: Scheduler = { now: () => 0, setTimeout: () => 1, clearTimeout: () => {} };

function setup(levels: Partial<UpgradeLevels> = {}, instantExpansion = false) {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  const data: SaveData = defaultSave();
  data.upgrades = { ...upgrades(levels) };
  const profile = new Profile(store, data, { scheduler: frozen });
  const events = new EventBus<GameEvents>();
  const coins: number[] = [];
  events.on('merged', (e) => coins.push(e.coins));
  events.on('jackpot', (e) => coins.push(e.coins));
  events.on('catPopped', (e) => coins.push(e.coins));
  const run = startProfileRun(profile, { seed: 3, events, instantExpansion });
  const stored = (): SaveData => new SaveStore(storage).load().data;
  return { run, profile, coins, storage, stored };
}

/** Two same-tier cats resting side by side on the floor, overlapping by 2 units. */
function spawnPair(run: RunController, tier: number, centre: number, golden = false): void {
  const r = tierRadius(tier);
  run.spawnBall(tier, centre - r + 1, -r, golden);
  run.spawnBall(tier, centre + r - 1, -r);
}

describe('payout pipeline (GAME_DESIGN §5, §9)', () => {
  it('banks merges with Lucky Paw, combo and golden into the wallet', () => {
    const { run, profile, coins } = setup({ luckyPaw: 4, comboCharm: 3 });
    expect(profile.stats.runsPlayed).toBe(1);
    spawnPair(run, 3, -200);
    run.tick();
    spawnPair(run, 3, 200);
    run.tick();
    spawnPair(run, 4, 0, true);
    run.tick();
    expect(run.combo).toBe(3);
    // coinMultiplier 1.6; comboBonus 0.08 × 3 × (combo − 1).
    // 3 × 1.6 = 4.8 → 5 · 3 × 1.6 × 1.24 = 5.95 → 6 · 5 × 1.6 × 1.48 × 3 = 35.5 → 36
    expect(coins).toEqual([5, 6, 36]);
    expect(run.coins).toBe(47);
    expect(profile.coins).toBe(47);
    expect(profile.stats).toMatchObject({ totalMerges: 3, totalCoinsEarned: 47, jackpots: 0 });
    expect(profile.records).toEqual({ bestScore: 32, bestStage: 1, highestTier: 5 });
  });

  it('pays a Jackpot at the cap: 5 × C(cap) with multipliers', () => {
    const { run, profile, coins } = setup({ luckyPaw: 1 });
    const cap = stageInfo(1).tierCap;
    spawnPair(run, cap, 0, true);
    run.tick();
    // 5 × 24 × 1.15 × 3 = 414
    expect(coins).toEqual([414]);
    expect(profile.coins).toBe(414);
    expect(profile.stats).toMatchObject({ jackpots: 1, totalMerges: 0 });
    expect(profile.records.bestScore).toBe(256);
  });

  it('pays the cash-out of every expansion and records the stage reached', () => {
    const { run, profile, coins } = setup({ shrineExpansion: 1, luckyPaw: 2 }, true);
    run.spawnBall(1, -200, -27, true);
    run.spawnBall(1, 0, -27);
    run.spawnBall(2, 200, -33, true);
    run.tick();
    run.setScore(stageInfo(3).threshold);
    run.tick();
    expect(run.stage).toBe(3);
    // Stage 3 drops from tier 2: both tier-1 cats pop. Golden 1 × 1.3 × 3 = 3.9 → 4; 1.3 → 1.
    expect(coins).toEqual([4, 1]);
    expect(profile.coins).toBe(5);
    expect(profile.records).toMatchObject({ bestScore: 3000, bestStage: 3 });
    expect(profile.stats.totalMerges).toBe(0);
  });

  it('pays Lucky Save pops, then a forced timeout without saves ends the run', () => {
    const { run, profile, coins, stored } = setup({ secondChance: 1 });
    for (const x of [-220, -80, 80, 220]) run.spawnBall(2, x, -33);
    for (let i = 0; i < 60; i++) run.tick(); // landed and past the landing grace
    run.forceDangerTimeout();
    expect(run.luckySavesLeft).toBe(0);
    expect(run.state).toBe('playing');
    expect(coins).toEqual([2, 2, 2, 2]);
    expect(profile.coins).toBe(8);

    run.forceDangerTimeout();
    expect(run.state).toBe('over');
    // The run's end wrote everything.
    expect(stored().wallet.coins).toBe(8);
    expect(stored().stats.runsPlayed).toBe(1);
  });

  it('a forced timeout outside play does nothing', () => {
    const { run } = setup({ secondChance: 1 });
    run.pause();
    run.forceDangerTimeout();
    expect(run.luckySavesLeft).toBe(1);
    expect(run.state).toBe('paused');
  });

  it('keeps coins banked mid-run when the page goes away before the run ends', () => {
    const { run, profile, storage } = setup();
    spawnPair(run, 4, -150);
    run.tick();
    spawnPair(run, 2, 150);
    run.tick();
    // The run start was written at once; both payouts wait for the throttle (time is frozen).
    const before = JSON.parse(storage.getItem(SAVE_KEY) ?? '{}') as { data: SaveData };
    expect(before.data.stats.runsPlayed).toBe(1);
    expect(before.data.wallet.coins).toBe(0);
    expect(profile.pending).toBe(true);
    // Backgrounding or pagehide: the session flushes.
    profile.flush();
    const reloaded = new SaveStore(storage).load();
    expect(reloaded.status).toBe('ok');
    expect(reloaded.data.wallet.coins).toBe(7);
    expect(reloaded.data.wallet.coins).toBe(run.coins);
  });
});
