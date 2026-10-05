/** What each shop card shows (GAME_DESIGN §2.2): level, price state and "current → next" value. */
import { FIRST_STAGE, stageInfo } from '../config/stages';
import { UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';
import { dropWeights } from './dropQueue';
import { roundStable } from './math';
import { canBuy, defaultUpgradeLevels, deriveStats } from './upgrades';
import type { UpgradeLevels } from './upgrades';

/** The price button: affordable, not enough coins (disabled) or MAX. */
export type PriceState = 'affordable' | 'insufficient' | 'max';

export interface ShopCard {
  readonly id: UpgradeId;
  readonly name: string;
  readonly description: string;
  readonly statLabel: string;
  readonly level: number;
  readonly maxLevel: number;
  /** The next level's price, or null at MAX. */
  readonly price: number | null;
  readonly state: PriceState;
  /** The stat at the current level, e.g. "+45%". */
  readonly current: string;
  /** The stat after buying the next level, or null at MAX. */
  readonly next: string | null;
}

export function shopCard(id: UpgradeId, levels: UpgradeLevels, coins: number): ShopCard {
  const def = UPGRADES[id];
  const level = levels[id];
  const check = canBuy(id, levels, coins);
  const state: PriceState = check.ok ? 'affordable' : check.reason;
  return {
    id,
    name: def.name,
    description: def.description,
    statLabel: def.statLabel,
    level,
    maxLevel: def.maxLevel,
    price: check.price,
    state,
    current: upgradeValue(id, level),
    next: level < def.maxLevel ? upgradeValue(id, level + 1) : null,
  };
}

/** Every card, in shop order. */
export function shopCards(levels: UpgradeLevels, coins: number): ShopCard[] {
  return UPGRADE_IDS.map((id) => shopCard(id, levels, coins));
}

/** The stat one upgrade gives at `level`, formatted for its card (the others at level 0). */
export function upgradeValue(id: UpgradeId, level: number): string {
  const stats = deriveStats({ ...defaultUpgradeLevels(), [id]: level });
  switch (id) {
    case 'luckyPaw':
      return `+${percent(stats.coinMultiplier - 1)}`;
    case 'bigCatch': {
      // The share of the biggest cat in the first stage's pool.
      const weights = dropWeights(stageInfo(FIRST_STAGE).dropPool.length, stats.bigCatchLevel);
      return percent(weights[weights.length - 1] ?? 0);
    }
    case 'shrineExpansion':
      return String(stats.maxStage);
    case 'quickGrowth':
      return percent(stats.thresholdFactor);
    case 'goldenTouch':
      return percent(stats.goldenChance);
    case 'comboCharm':
      return `+${percent(UPGRADES.comboCharm.perLevel * stats.comboCharmLevel)}`;
    case 'secondChance':
      return String(stats.luckySaves);
    case 'fortuneTeller':
      return String(stats.previewCount);
  }
}

function percent(fraction: number): string {
  return `${roundStable(fraction * 100)}%`;
}
