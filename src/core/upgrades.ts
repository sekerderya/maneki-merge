/** Upgrade levels, derived stats, prices and purchases (GAME_DESIGN §10). Pure functions. */
import { COMBO_BONUS_MAX_STEPS } from '../config/economy';
import { BASE_MAX_STAGE, STAGE_COUNT } from '../config/stages';
import { BASE_PREVIEW_COUNT, UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';

export type UpgradeLevels = Readonly<Record<UpgradeId, number>>;

/** Everything a run needs from the upgrade levels. */
export interface DerivedStats {
  /** 1 + 0.15 × luckyPaw. Multiplies every coin payout. */
  readonly coinMultiplier: number;
  /** Big Catch level, used by the drop weights. */
  readonly bigCatchLevel: number;
  /** Combo Charm level, used by comboBonus(). */
  readonly comboCharmLevel: number;
  /** 2 + shrineExpansion: the highest stage the jar may expand to. */
  readonly maxStage: number;
  /** 0.03 × goldenTouch: the chance that a dropped cat is golden. */
  readonly goldenChance: number;
  /** Lucky Saves per run. */
  readonly luckySaves: number;
  /** How many upcoming cats the HUD shows. */
  readonly previewCount: number;
}

export function defaultUpgradeLevels(): Record<UpgradeId, number> {
  const levels = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) levels[id] = 0;
  return levels;
}

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === 'string' && (UPGRADE_IDS as readonly string[]).includes(value);
}

export function deriveStats(levels: UpgradeLevels): DerivedStats {
  const perLevel = (id: UpgradeId): number => UPGRADES[id].perLevel * levels[id];
  return {
    coinMultiplier: 1 + perLevel('luckyPaw'),
    bigCatchLevel: levels.bigCatch,
    comboCharmLevel: levels.comboCharm,
    maxStage: Math.min(STAGE_COUNT, BASE_MAX_STAGE + perLevel('shrineExpansion')),
    goldenChance: perLevel('goldenTouch'),
    luckySaves: perLevel('secondChance'),
    previewCount: BASE_PREVIEW_COUNT + perLevel('fortuneTeller'),
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
  return def.prices[Math.max(0, level)] ?? null;
}

export type BuyCheck =
  | { readonly ok: true; readonly price: number }
  | { readonly ok: false; readonly reason: 'max' | 'insufficient'; readonly price: number | null };

export function canBuy(id: UpgradeId, levels: UpgradeLevels, coins: number): BuyCheck {
  const price = nextPrice(id, levels[id]);
  if (price === null) return { ok: false, reason: 'max', price };
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
  | { readonly ok: false; readonly reason: 'max' | 'insufficient' };

/** Buys one level. Returns new levels and the remaining coins; the inputs are not modified. */
export function buy(id: UpgradeId, levels: UpgradeLevels, coins: number): BuyResult {
  const check = canBuy(id, levels, coins);
  if (!check.ok) return { ok: false, reason: check.reason };
  return {
    ok: true,
    levels: { ...levels, [id]: levels[id] + 1 },
    coins: coins - check.price,
    price: check.price,
  };
}

/** True when at least one upgrade can be bought right now (the menu's UPGRADES dot). */
export function anyAffordable(levels: UpgradeLevels, coins: number): boolean {
  return UPGRADE_IDS.some((id) => canBuy(id, levels, coins).ok);
}
