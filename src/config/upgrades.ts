/**
 * What the shop sells (GAME_DESIGN §10): permanent upgrades, blessing cards that set how far each
 * blessing can go in a run (v0.36), and weapon cards whose levels open a weapon's picks one by one
 * (the Katana, GAME_DESIGN §15.16). Derived stats: core/upgrades.ts.
 */
import { PICKS } from './picks';
import type { PickId } from './picks';

/** Shop order: the upgrades, the blessings, then the weapons. */
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
  'lightning',
  'katana',
] as const;

export type UpgradeId = (typeof UPGRADE_IDS)[number];

/** The blessing cards: each one's shop level is the highest level its blessing can reach in a run. */
export const BLESSING_CARD_IDS = [
  'goldenCats',
  'bigDrops',
  'moreMagnets',
  'hanabi',
  'joker',
  'lightning',
] as const;

export type BlessingCardId = (typeof BLESSING_CARD_IDS)[number];

/**
 * The weapon cards (GAME_DESIGN §10): each level opens one more of the weapon's picks for every run,
 * in this order, each up to its own max level.
 */
export const WEAPON_CARD_OPENS = {
  katana: ['katana', 'quickKatana', 'wideBlade', 'moreBlades'],
} as const satisfies Readonly<Record<string, readonly PickId[]>>;

export type WeaponCardId = keyof typeof WEAPON_CARD_OPENS;

/** The shop's sections (GAME_DESIGN §2.2). */
export type ShopSection = 'upgrade' | 'blessing' | 'weapon';

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
  /**
   * The effect of one level, in the unit of the stat it drives (see core/upgrades.ts); for a
   * blessing card, one more level its blessing can reach.
   */
  readonly perLevel: number;
}

/**
 * Prices and gates come from the pacing model in docs/plans/batch-20.md §7, retuned in v0.39
 * (the owner's call: every effect 1.5 times as strong, the first levels cheaper and the gates lower,
 * so most players clear stage 5 in their first 15 minutes): the first levels are cheap and the last
 * ones dearer, so every card is still bought in about 8 hours of play (the owner's target).
 */
export const UPGRADES: Readonly<Record<UpgradeId, UpgradeDef>> = {
  luckyPaw: {
    id: 'luckyPaw',
    section: 'upgrade',
    name: 'Lucky Paw',
    description: '+22.5% coins from everything',
    statLabel: 'Coins',
    startLevel: 0,
    maxLevel: 10,
    gate: 1,
    prices: [150, 400, 800, 1500, 3000, 7000, 12_000, 22_000, 36_000, 60_000],
    // Until v0.39: +15% per level.
    perLevel: 0.225,
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
    prices: [150, 400, 900, 2000, 4000, 10_000, 17_000, 30_000, 50_000, 80_000],
    // Drop tilt levels per level (GAME_DESIGN §8): Big Catch 10 is a tilt of 12 (4, 18, 32, 46%),
    // which leaves Big Drops room up to the most, 13. Until v0.39: 0.8 per level (tilt 8 at the
    // top); until v0.36: 5 levels of a whole tilt level.
    perLevel: 1.2,
  },
  comboCharm: {
    id: 'comboCharm',
    section: 'upgrade',
    name: 'Combo Charm',
    description: '+12% coins per combo step (up to 5 steps)',
    statLabel: 'Per combo step',
    startLevel: 0,
    maxLevel: 5,
    gate: 2,
    prices: [1000, 3000, 10_000, 22_000, 40_000],
    // Until v0.39: +8% per level.
    perLevel: 0.12,
  },
  secondChance: {
    id: 'secondChance',
    section: 'upgrade',
    name: 'Second Chance',
    description: '+1 Lucky Save per run',
    statLabel: 'Lucky Saves',
    startLevel: 0,
    maxLevel: 2,
    // The strongest help for getting past the first jar, so it is open from the start and cheap
    // (v0.39, the owner's call; until then stage 5, 10K and 50K).
    gate: 1,
    prices: [1000, 15_000],
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
    prices: [400, 2000, 10_000, 24_000],
    perLevel: 1,
  },
  bigDrops: {
    id: 'bigDrops',
    section: 'blessing',
    name: PICKS.bigDrops.name,
    description: 'Blessing: bigger cats come more often',
    statLabel: 'Up to',
    startLevel: 1,
    // Big Drops and Big Catch tilt the drops together, up to a tilt of 13 (MAX_DROP_TILT_LEVEL):
    // one level (3) on top of Big Catch's 12 already reaches it.
    maxLevel: 3,
    gate: 1,
    prices: [2000, 14_000],
    perLevel: 1,
  },
  moreMagnets: {
    id: 'moreMagnets',
    section: 'blessing',
    name: PICKS.moreMagnets.name,
    description: 'Blessing: magnets take a cat back into the paw',
    statLabel: 'Up to',
    startLevel: 0,
    maxLevel: PICKS.moreMagnets.maxLevel,
    // Open from the start (v0.40, the owner's call; stage 2 and 1200 in v0.39, stage 3 before).
    gate: 1,
    prices: [1000, 3500, 14_000, 30_000, 55_000],
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
    gate: 3,
    prices: [3000, 8000, 22_000, 42_000, 70_000],
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
    gate: 5,
    prices: [10_000, 18_000, 48_000, 85_000, 130_000],
    perLevel: 1,
  },
  lightning: {
    id: 'lightning',
    section: 'blessing',
    name: PICKS.lightning.name,
    description: 'Blessing: strikes every cat of the size it touches',
    statLabel: 'Up to',
    startLevel: 0,
    maxLevel: PICKS.lightning.maxLevel,
    // Batch 23 (the owner's call: it opens later, so the early game stays as it is): from the
    // second jar on, its first level dearer than the Joker Cat's. It adds 225K to the ~1.02M the other
    // cards cost: about an hour more in the 8-hour pacing model, at its end.
    gate: 8,
    prices: [15_000, 25_000, 40_000, 60_000, 85_000],
    perLevel: 1,
  },
  katana: {
    id: 'katana',
    section: 'weapon',
    name: PICKS.katana.name,
    description: 'Weapon: cuts every small cat in a straight line down',
    statLabel: 'Opens',
    startLevel: 0,
    maxLevel: WEAPON_CARD_OPENS.katana.length,
    // The first weapon (the owner's call, 2026-10-16): from the second jar's end, its first level
    // a little dearer than Lightning's; each level opens one more of its picks. 177K in all.
    gate: 10,
    prices: [20_000, 32_000, 50_000, 75_000],
    perLevel: 1,
  },
};

/** True for the weapon cards. */
export function isWeaponCard(id: UpgradeId): id is WeaponCardId {
  return UPGRADES[id].section === 'weapon';
}

/** True for the blessing cards. */
export function isBlessingCard(id: UpgradeId): id is BlessingCardId {
  return UPGRADES[id].section === 'blessing';
}
