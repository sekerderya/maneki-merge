/** What each shop card shows (GAME_DESIGN §2.2): level, price state and "current → next" value. */
import { isBlessingCard, UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { ShopSection, UpgradeId } from '../config/upgrades';
import { dropWeights } from './dropQueue';
import { roundStable } from './math';
import { defaultPickLevels, pickValue } from './picks';
import { canBuy, defaultUpgradeLevels, deriveStats } from './upgrades';
import type { UpgradeLevels } from './upgrades';

/**
 * The price button: affordable, not enough coins (disabled), MAX, or locked until the best stage
 * reaches the card's gate.
 */
export type PriceState = 'affordable' | 'insufficient' | 'max' | 'locked';

export interface ShopCard {
  readonly id: UpgradeId;
  readonly section: ShopSection;
  /** The best stage that opens the card (shown while it is locked). */
  readonly gate: number;
  readonly name: string;
  readonly description: string;
  readonly statLabel: string;
  readonly level: number;
  readonly maxLevel: number;
  /** The next level's price, or null at MAX. */
  readonly price: number | null;
  readonly state: PriceState;
  /** Coins still missing for the next level, or null when it is affordable or at MAX. */
  readonly shortfall: number | null;
  /** The stat at the current level, e.g. "+45%". */
  readonly current: string;
  /** The stat after buying the next level, or null at MAX. */
  readonly next: string | null;
}

export function shopCard(
  id: UpgradeId,
  levels: UpgradeLevels,
  coins: number,
  bestStage: number,
): ShopCard {
  const def = UPGRADES[id];
  const level = levels[id];
  const check = canBuy(id, levels, coins, bestStage);
  const state: PriceState = check.ok ? 'affordable' : check.reason;
  return {
    id,
    section: def.section,
    gate: def.gate,
    name: def.name,
    description: def.description,
    statLabel: def.statLabel,
    level,
    maxLevel: def.maxLevel,
    price: check.price,
    state,
    shortfall: state === 'insufficient' && check.price !== null ? check.price - coins : null,
    current: upgradeValue(id, level),
    next: level < def.maxLevel ? upgradeValue(id, level + 1) : null,
  };
}

/** Every card, in shop order. */
export function shopCards(levels: UpgradeLevels, coins: number, bestStage: number): ShopCard[] {
  return UPGRADE_IDS.map((id) => shopCard(id, levels, coins, bestStage));
}

/**
 * The stat one card gives at `level`, formatted for its card (the others at their start level). A
 * blessing card shows its blessing at the highest level a run can reach, without Big Catch.
 */
export function upgradeValue(id: UpgradeId, level: number): string {
  if (isBlessingCard(id)) return pickValue(id, { ...defaultPickLevels(), [id]: level }, 0);
  const stats = deriveStats({ ...defaultUpgradeLevels(), [id]: level });
  switch (id) {
    case 'luckyPaw':
      // Steps of 22.5%: one decimal (22.5%, 45%, 67.5%).
      return `+${roundStable((stats.coinMultiplier - 1) * 1000) / 10}%`;
    case 'bigCatch': {
      // The share of the biggest cat in a stage's drop pool.
      const weights = dropWeights(stats.bigCatchTilt);
      return percent(weights[weights.length - 1] ?? 0);
    }
    case 'comboCharm':
      return `+${percent(UPGRADES.comboCharm.perLevel * stats.comboCharmLevel)}`;
    case 'secondChance':
      return String(stats.luckySaves);
  }
}

function percent(fraction: number): string {
  return `${roundStable(fraction * 100)}%`;
}
