/** Permanent upgrades bought in the shop (GAME_DESIGN §10). Derived stats: core/upgrades.ts. */

export const UPGRADE_IDS = [
  'luckyPaw',
  'bigCatch',
  'shrineExpansion',
  'goldenTouch',
  'comboCharm',
  'secondChance',
  'fortuneTeller',
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly name: string;
  /** One-line effect per level, shown on the shop card. */
  readonly description: string;
  /** What the shop card's "current → next" value measures (core/shop.ts formats the value). */
  readonly statLabel: string;
  readonly maxLevel: number;
  /** prices[n] buys level n + 1, so the length equals maxLevel. */
  readonly prices: readonly number[];
  /** The effect of one level, in the unit of the stat it drives (see core/upgrades.ts). */
  readonly perLevel: number;
}

export const UPGRADES: Readonly<Record<UpgradeId, UpgradeDef>> = {
  luckyPaw: {
    id: 'luckyPaw',
    name: 'Lucky Paw',
    description: '+15% coins from everything',
    statLabel: 'Coins',
    maxLevel: 10,
    prices: [50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200],
    perLevel: 0.15,
  },
  bigCatch: {
    id: 'bigCatch',
    name: 'Big Catch',
    description: 'Bigger cats come more often',
    statLabel: 'Biggest drop',
    maxLevel: 5,
    prices: [100, 250, 600, 1500, 3500],
    // weight_i = base_i × (1 + perLevel × level × i), i = 0 for the smallest tier.
    perLevel: 0.12,
  },
  shrineExpansion: {
    id: 'shrineExpansion',
    name: 'Shrine Expansion',
    description: 'Unlocks stage 3 / 4 / 5',
    statLabel: 'Max stage',
    maxLevel: 3,
    prices: [1500, 10_000, 60_000],
    perLevel: 1,
  },
  goldenTouch: {
    id: 'goldenTouch',
    name: 'Golden Touch',
    description: '+3% chance that a dropped cat is golden (×3 coins)',
    statLabel: 'Golden',
    maxLevel: 5,
    prices: [120, 240, 480, 960, 1900],
    perLevel: 0.03,
  },
  comboCharm: {
    id: 'comboCharm',
    name: 'Combo Charm',
    description: '+8% coins per combo step (up to 5 steps)',
    statLabel: 'Per combo step',
    maxLevel: 5,
    prices: [80, 160, 320, 640, 1280],
    perLevel: 0.08,
  },
  secondChance: {
    id: 'secondChance',
    name: 'Second Chance',
    description: '+1 Lucky Save per run',
    statLabel: 'Lucky Saves',
    maxLevel: 2,
    prices: [500, 4000],
    perLevel: 1,
  },
  fortuneTeller: {
    id: 'fortuneTeller',
    name: 'Fortune Teller',
    description: 'See the next 2 cats instead of 1',
    statLabel: 'Next cats shown',
    maxLevel: 1,
    prices: [400],
    perLevel: 1,
  },
};

/** Next-cat previews without Fortune Teller. */
export const BASE_PREVIEW_COUNT = 1;
