/** Score, coin payouts, combo, Jackpot and pops (GAME_DESIGN §5, §7.1, §9). */
import {
  JACKPOT_COIN_MULTIPLIER,
  JACKPOT_SCORE_MULTIPLIER,
  MIN_COIN_PAYOUT,
  POP_VALUE_SHARE,
} from '../config/economy';
import { tierCoins, tierScore } from '../config/tiers';
import { COMBO_WINDOW_MS } from '../config/timings';
import { roundStable } from './math';
import { comboBonus } from './upgrades';
import type { DerivedStats } from './upgrades';

/**
 * round(base × coinMultiplier × (1 + comboBonus)), at least 1. The one payout rule for every
 * merge, Jackpot and pop.
 */
export function coinPayout(base: number, coinMultiplier: number, bonus: number): number {
  return Math.max(MIN_COIN_PAYOUT, roundStable(base * coinMultiplier * (1 + bonus)));
}

/** Score for merging two tier-t cats: S(t). */
export function mergeScore(tier: number): number {
  return tierScore(tier);
}

/** Score for a Jackpot of two `capTier` cats (a stage's last cat): 2 × S(cap). */
export function jackpotScore(capTier: number): number {
  return JACKPOT_SCORE_MULTIPLIER * tierScore(capTier);
}

/** Base coins for a Jackpot of two `capTier` cats, before multipliers: 5 × C(cap). */
export function jackpotBaseCoins(capTier: number): number {
  return JACKPOT_COIN_MULTIPLIER * tierCoins(capTier);
}

/**
 * Coins for a single cat popping (stage clear, Lucky Save): its value, half of C(t), with
 * Lucky Paw and no combo. Two cats that pop pay as much as their (plain) merge would.
 */
export function popCoins(tier: number, coinMultiplier: number): number {
  return coinPayout(tierCoins(tier) * POP_VALUE_SHARE, coinMultiplier, 0);
}

/**
 * Combo counter: a merge within COMBO_WINDOW_MS of the previous merge raises it, otherwise it
 * resets to 1. Times are run time in ms (paused time doesn't count).
 */
export class ComboCounter {
  private count = 0;
  private lastMs = Number.NEGATIVE_INFINITY;

  constructor(private readonly windowMs = COMBO_WINDOW_MS) {}

  /** The current combo; 0 before the first merge of a run. */
  get combo(): number {
    return this.count;
  }

  /** Registers a merge at `timeMs` and returns the new combo. */
  register(timeMs: number): number {
    this.count = timeMs - this.lastMs <= this.windowMs ? this.count + 1 : 1;
    this.lastMs = timeMs;
    return this.count;
  }

  /** The combo as it stands at `timeMs`: 0 once the window has passed. */
  activeAt(timeMs: number): number {
    return timeMs - this.lastMs <= this.windowMs ? this.count : 0;
  }

  reset(): void {
    this.count = 0;
    this.lastMs = Number.NEGATIVE_INFINITY;
  }
}

export interface Payout {
  readonly score: number;
  readonly coins: number;
  /** The combo after this event (0 for pops, which don't touch the combo). */
  readonly combo: number;
}

export type EconomyStats = Pick<DerivedStats, 'coinMultiplier' | 'comboCharmLevel'>;

/**
 * Per-run score and coin bookkeeping. Merges and Jackpots raise the combo; pops (stage clear and
 * Lucky Save) pay coins only. The caller banks `coins` into the wallet immediately.
 */
export class RunEconomy {
  private readonly comboCounter = new ComboCounter();
  private scoreTotal = 0;
  private coinsTotal = 0;
  private mergeCount = 0;
  private jackpotCount = 0;
  private highest = 0;

  constructor(private readonly stats: EconomyStats) {}

  /** Cumulative run score; drives expansions and the best-score record. */
  get score(): number {
    return this.scoreTotal;
  }

  /** Coins earned this run. */
  get coins(): number {
    return this.coinsTotal;
  }

  get combo(): number {
    return this.comboCounter.combo;
  }

  /** The combo as it stands at `timeMs`: 0 once the combo window has passed. */
  comboAt(timeMs: number): number {
    return this.comboCounter.activeAt(timeMs);
  }

  get merges(): number {
    return this.mergeCount;
  }

  get jackpots(): number {
    return this.jackpotCount;
  }

  /** The highest tier a merge produced this run (0 before the first merge). */
  get highestTier(): number {
    return this.highest;
  }

  /**
   * Two tier-t cats merged into one cat of `newTier`: t + 1, or t + 2 when a golden cat merged
   * (GAME_DESIGN §15.4). Either way it pays like a merge of two tier-t cats.
   */
  merge(tier: number, timeMs: number, newTier = tier + 1): Payout {
    this.mergeCount++;
    this.highest = Math.max(this.highest, newTier);
    return this.pay(mergeScore(tier), tierCoins(tier), timeMs);
  }

  /** Two of a stage's last cat vanished in a Jackpot. */
  jackpot(capTier: number, timeMs: number): Payout {
    this.jackpotCount++;
    return this.pay(jackpotScore(capTier), jackpotBaseCoins(capTier), timeMs);
  }

  /** Debug and test hook (`?debug=1`, TECH_SPEC §11): sets the run score directly. */
  setScore(score: number): void {
    if (!Number.isInteger(score) || score < 0) throw new RangeError(`Invalid score: ${score}`);
    this.scoreTotal = score;
  }

  /** A single cat popped into coins (stage clear or Lucky Save). */
  pop(tier: number): Payout {
    const coins = popCoins(tier, this.stats.coinMultiplier);
    this.coinsTotal += coins;
    return { score: 0, coins, combo: 0 };
  }

  private pay(score: number, baseCoins: number, timeMs: number): Payout {
    const combo = this.comboCounter.register(timeMs);
    const bonus = comboBonus(this.stats.comboCharmLevel, combo);
    const coins = coinPayout(baseCoins, this.stats.coinMultiplier, bonus);
    this.scoreTotal += score;
    this.coinsTotal += coins;
    return { score, coins, combo };
  }
}
