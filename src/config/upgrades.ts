/** Permanent upgrades bought in the shop (GAME_DESIGN §10). Derived stats: core/upgrades.ts. */

export const UPGRADE_IDS = ['luckyPaw', 'bigCatch', 'comboCharm', 'secondChance'] as const;

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
    // The biggest drop's share grows by this much per level, and the smallest's shrinks by as
    // much; the sizes in between move a third of it (core/dropQueue.ts).
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
};
