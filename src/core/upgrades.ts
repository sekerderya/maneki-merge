/** Upgrade levels, derived stats, prices and purchases (GAME_DESIGN §10). Pure functions. */
import { COMBO_BONUS_MAX_STEPS } from '../config/economy';
import { BLESSING_CARD_IDS, UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { BlessingCardId, UpgradeId } from '../config/upgrades';

export type UpgradeLevels = Readonly<Record<UpgradeId, number>>;

/** Everything a run needs from the upgrade levels. */
export interface DerivedStats {
  /** 1 + 0.15 × luckyPaw. Multiplies every coin payout. */
  readonly coinMultiplier: number;
  /** Big Catch's drop tilt (0.8 per level), which Big Drops adds to (core/picks.ts). */
  readonly bigCatchTilt: number;
  /** Combo Charm level, used by comboBonus(). */
  readonly comboCharmLevel: number;
  /** Lucky Saves per run. */
  readonly luckySaves: number;
  /** The highest level each blessing can reach in a run: its card's shop level. */
  readonly blessingCaps: Readonly<Record<BlessingCardId, number>>;
}

/** A fresh profile's levels: every card at its start level. */
export function defaultUpgradeLevels(): Record<UpgradeId, number> {
  const levels = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) levels[id] = UPGRADES[id].startLevel;
  return levels;
}

/** Every card at its max level (debug and tests). */
export function maxUpgradeLevels(): Record<UpgradeId, number> {
  const levels = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) levels[id] = UPGRADES[id].maxLevel;
  return levels;
}

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === 'string' && (UPGRADE_IDS as readonly string[]).includes(value);
}

export function deriveStats(levels: UpgradeLevels): DerivedStats {
  const perLevel = (id: UpgradeId): number => UPGRADES[id].perLevel * levels[id];
  const blessingCaps = {} as Record<BlessingCardId, number>;
  for (const id of BLESSING_CARD_IDS) blessingCaps[id] = levels[id];
  return {
    coinMultiplier: 1 + perLevel('luckyPaw'),
    bigCatchTilt: perLevel('bigCatch'),
    comboCharmLevel: levels.comboCharm,
    luckySaves: perLevel('secondChance'),
    blessingCaps,
  };
}

/** 0.08 × comboCharm × min(combo − 1, 5). A combo of 1 (no combo) gives 0. */
export function comboBonus(comboCharmLevel: number, combo: number): number {
  const steps = Math.min(Math.max(combo - 1, 0), COMBO_BONUS_MAX_STEPS);
  return UPGRADES.comboCharm.perLevel * comboCharmLevel * steps;
}

/** The price of the next level, or null at the max level. */
export function nextPrice(id: UpgradeId, level: number): number | null {
  const def = UPGRADES[id];
  if (level >= def.maxLevel) return null;
  return def.prices[Math.max(0, level - def.startLevel)] ?? null;
}

/** True once the profile's best stage has reached the card's gate (GAME_DESIGN §2.2). */
export function upgradeUnlocked(id: UpgradeId, bestStage: number): boolean {
  return bestStage >= UPGRADES[id].gate;
}

/** The cards whose gate a run passed: reached `bestStage`, from `before`. In shop order. */
export function unlockedBetween(before: number, bestStage: number): UpgradeId[] {
  return UPGRADE_IDS.filter((id) => UPGRADES[id].gate > before && UPGRADES[id].gate <= bestStage);
}

export type BuyCheck =
  | { readonly ok: true; readonly price: number }
  | {
      readonly ok: false;
      readonly reason: 'max' | 'insufficient' | 'locked';
      readonly price: number | null;
    };

export function canBuy(
  id: UpgradeId,
  levels: UpgradeLevels,
  coins: number,
  bestStage: number,
): BuyCheck {
  const price = nextPrice(id, levels[id]);
  if (price === null) return { ok: false, reason: 'max', price };
  if (!upgradeUnlocked(id, bestStage)) return { ok: false, reason: 'locked', price };
  if (coins < price) return { ok: false, reason: 'insufficient', price };
  return { ok: true, price };
}

export type BuyResult =
  | {
      readonly ok: true;
      readonly levels: UpgradeLevels;
      readonly coins: number;
      readonly price: number;
    }
  | { readonly ok: false; readonly reason: 'max' | 'insufficient' | 'locked' };

/** Buys one level. Returns new levels and the remaining coins; the inputs are not modified. */
export function buy(
  id: UpgradeId,
  levels: UpgradeLevels,
  coins: number,
  bestStage: number,
): BuyResult {
  const check = canBuy(id, levels, coins, bestStage);
  if (!check.ok) return { ok: false, reason: check.reason };
  return {
    ok: true,
    levels: { ...levels, [id]: levels[id] + 1 },
    coins: coins - check.price,
    price: check.price,
  };
}

/** True when at least one card can be bought right now (the menu's UPGRADES dot). */
export function anyAffordable(levels: UpgradeLevels, coins: number, bestStage: number): boolean {
  return UPGRADE_IDS.some((id) => canBuy(id, levels, coins, bestStage).ok);
}
