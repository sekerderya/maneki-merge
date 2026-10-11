/**
 * What the shop sells (GAME_DESIGN §10): permanent upgrades, and blessing cards that set how far
 * each blessing can go in a run (v0.36). Derived stats: core/upgrades.ts.
 */
import { BIG_DROPS_TILT_PER_LEVEL, PICKS } from './picks';

/** Shop order: the upgrades, then the blessings. */
export const UPGRADE_IDS = [
  'luckyPaw',
  'bigCatch',
  'comboCharm',
  'secondChance',
  'goldenCats',
  'bigDrops',
  'moreMagnets',
  'hanabi',
  'joker',
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

/** The blessing cards: each one's shop level is the highest level its blessing can reach in a run. */
export const BLESSING_CARD_IDS = [
  'goldenCats',
  'bigDrops',
  'moreMagnets',
  'hanabi',
  'joker',
] as const;

export type BlessingCardId = (typeof BLESSING_CARD_IDS)[number];

/** The shop's two sections (GAME_DESIGN §2.2). */
export type ShopSection = 'upgrade' | 'blessing';

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly section: ShopSection;
  readonly name: string;
  /** One-line effect, shown on the shop card. */
  readonly description: string;
  /** What the shop card's "current → next" value measures (core/shop.ts formats the value). */
  readonly statLabel: string;
  /** A fresh profile has this level (GAME_DESIGN §10): the first run sees the whole loop. */
  readonly startLevel: number;
  readonly maxLevel: number;
  /** The card can be bought once the profile's best stage reaches this stage (1: from the start). */
  readonly gate: number;
  /** prices[n] buys level startLevel + n + 1, so the length is maxLevel − startLevel. */
  readonly prices: readonly number[];
  /** The effect of one level, in the unit of the stat it drives (see core/upgrades.ts). */
  readonly perLevel: number;
}

/**
 * Prices and gates are start values from the pacing model in docs/plans/batch-20.md §7: every card
 * bought in about 8 hours of play (the owner's target), a new player's first run paying for two or
 * three cheap ones.
 */
export const UPGRADES: Readonly<Record<UpgradeId, UpgradeDef>> = {
  luckyPaw: {
    id: 'luckyPaw',
    section: 'upgrade',
    name: 'Lucky Paw',
    description: '+15% coins from everything',
    statLabel: 'Coins',
    startLevel: 0,
    maxLevel: 10,
    gate: 1,
    prices: [300, 600, 1000, 1600, 2500, 4000, 6500, 10_000, 16_000, 25_000],
    perLevel: 0.15,
  },
  bigCatch: {
    id: 'bigCatch',
    section: 'upgrade',
    name: 'Big Catch',
    description: 'Bigger cats come more often',
    statLabel: 'Biggest drop',
    startLevel: 0,
    maxLevel: 10,
    gate: 1,
    prices: [300, 800, 1600, 3000, 5000, 8000, 13_000, 20_000, 30_000, 45_000],
    // Drop tilt levels per level (GAME_DESIGN §8): Big Catch 10 is a tilt of 8 (16, 22, 28, 34%),
    // which leaves Big Drops room up to the most, 10. Until v0.36: 5 levels of a whole tilt level.
    perLevel: 0.8,
  },
  comboCharm: {
    id: 'comboCharm',
    section: 'upgrade',
    name: 'Combo Charm',
    description: '+8% coins per combo step (up to 5 steps)',
    statLabel: 'Per combo step',
    startLevel: 0,
    maxLevel: 5,
    gate: 3,
    prices: [1000, 3000, 6000, 12_000, 20_000],
    perLevel: 0.08,
  },
  secondChance: {
    id: 'secondChance',
    section: 'upgrade',
    name: 'Second Chance',
    description: '+1 Lucky Save per run',
    statLabel: 'Lucky Saves',
    startLevel: 0,
    maxLevel: 2,
    gate: 5,
    prices: [10_000, 50_000],
    perLevel: 1,
  },
  goldenCats: {
    id: 'goldenCats',
    section: 'blessing',
    name: PICKS.goldenCats.name,
    description: 'Blessing: golden cats skip a size when they merge',
    statLabel: 'Up to',
    startLevel: 1,
    maxLevel: PICKS.goldenCats.maxLevel,
    gate: 1,
    prices: [400, 2000, 5000, 12_000],
    perLevel: 1,
  },
  bigDrops: {
    id: 'bigDrops',
    section: 'blessing',
    name: PICKS.bigDrops.name,
    description: 'Blessing: bigger cats come more often',
    statLabel: 'Up to',
    startLevel: 1,
    // Big Drops and Big Catch tilt the drops together, up to a tilt of 10 (MAX_DROP_TILT_LEVEL):
    // three levels (6) on top of Big Catch's 8 already pass it.
    maxLevel: 3,
    gate: 1,
    prices: [2000, 8000],
    perLevel: BIG_DROPS_TILT_PER_LEVEL,
  },
  moreMagnets: {
    id: 'moreMagnets',
    section: 'blessing',
    name: PICKS.moreMagnets.name,
    description: 'Blessing: magnets take a cat back into the paw',
    statLabel: 'Up to',
    startLevel: 0,
    maxLevel: PICKS.moreMagnets.maxLevel,
    gate: 3,
    prices: [1200, 3500, 8000, 15_000, 25_000],
    perLevel: 1,
  },
  hanabi: {
    id: 'hanabi',
    section: 'blessing',
    name: PICKS.hanabi.name,
    description: 'Blessing: fireworks pop the small cats around them',
    statLabel: 'Up to',
    startLevel: 0,
    maxLevel: PICKS.hanabi.maxLevel,
    gate: 5,
    prices: [3500, 7000, 13_000, 22_000, 35_000],
    perLevel: 1,
  },
  joker: {
    id: 'joker',
    section: 'blessing',
    name: PICKS.joker.name,
    description: 'Blessing: merges with any cat and makes it one size bigger',
    statLabel: 'Up to',
    startLevel: 0,
    maxLevel: PICKS.joker.maxLevel,
    gate: 8,
    prices: [9000, 16_000, 26_000, 40_000, 60_000],
    perLevel: 1,
  },
};

/** True for the blessing cards. */
export function isBlessingCard(id: UpgradeId): id is BlessingCardId {
  return UPGRADES[id].section === 'blessing';
}
