/**
 * Special balls, trials and blessings (GAME_DESIGN §15). Every stage clear offers a trial, which
 * makes the coming stages harder, then a blessing, which helps; each pick raises that option's
 * level for the rest of the run. Derived values: core/picks.ts.
 */

/** The queue's base chances (GAME_DESIGN §15.1), before any pick. */
export const MAGNET_BASE_CHANCE = 0.01;
export const BOULDER_BASE_CHANCE = 0.03;
/**
 * No magnet comes in a stage's first drops: only items queued once the player has dropped this
 * many balls in the stage can be magnets (GAME_DESIGN §15.1). A stage starts with an empty jar,
 * where a magnet would have nothing to take.
 */
export const MAGNET_FREE_DROPS = 20;
/** Boulders only come from this stage on. */
export const BOULDER_FIRST_STAGE = 2;

/** A boulder's size without Big Boulders, and the merges it takes to break without Iron Bands. */
export const BOULDER_BASE_SIZE = 2;
export const BOULDER_BASE_HITS = 1;

/**
 * A merge hits every boulder whose edge is within this many world units of one of its two cats'
 * edges (GAME_DESIGN §15.3): touching, or so close the gap doesn't show.
 */
export const BOULDER_HIT_REACH = 15;

/** The magnet is drawn at this size's radius in the paw and the NEXT bubble. */
export const MAGNET_SIZE = 3;

/**
 * Big Drops adds this many Big Catch levels to the drop weights (GAME_DESIGN §8), up to
 * MAX_DROP_TILT_LEVEL in all: there every drop size has its own share (10, 20, 30, 40%).
 */
export const BIG_DROPS_TILT_PER_LEVEL = 2;
export const MAX_DROP_TILT_LEVEL = 10;

/** A pick shows this many different options (fewer when fewer are left). */
export const PICK_OPTIONS = 3;

export const TRIAL_IDS = ['moreBoulders', 'ironBands', 'bigBoulders'] as const;
export const BLESSING_IDS = ['moreMagnets', 'bigDrops', 'goldenCats'] as const;
export const PICK_IDS = [...TRIAL_IDS, ...BLESSING_IDS] as const;

export type TrialId = (typeof TRIAL_IDS)[number];
export type BlessingId = (typeof BLESSING_IDS)[number];
export type PickId = TrialId | BlessingId;
/** A trial makes the coming stages harder; a blessing helps. */
export type PickKind = 'trial' | 'blessing';

/** The order of a stage clear's picks: first a trial, then a blessing. */
export const PICK_ORDER: readonly PickKind[] = ['trial', 'blessing'];

export interface PickDef {
  readonly id: PickId;
  readonly kind: PickKind;
  readonly name: string;
  /** One-line effect per level, shown on the card. */
  readonly description: string;
  /** What the card's "current → next" value measures (core/picks.ts formats it). */
  readonly statLabel: string;
  readonly maxLevel: number;
  /** The effect of one level, in the unit of the value it changes. */
  readonly perLevel: number;
}

export const PICKS: Readonly<Record<PickId, PickDef>> = {
  moreBoulders: {
    id: 'moreBoulders',
    kind: 'trial',
    name: 'More Boulders',
    description: '+3% boulder chance (from stage 2)',
    statLabel: 'Boulders',
    maxLevel: 5,
    perLevel: 0.03,
  },
  ironBands: {
    id: 'ironBands',
    kind: 'trial',
    name: 'Iron Bands',
    description: 'Boulders need one more merge to break',
    statLabel: 'Merges to break',
    maxLevel: 3,
    perLevel: 1,
  },
  bigBoulders: {
    id: 'bigBoulders',
    kind: 'trial',
    name: 'Big Boulders',
    description: 'Boulders one size bigger',
    statLabel: 'Boulder size',
    maxLevel: 4,
    perLevel: 1,
  },
  moreMagnets: {
    id: 'moreMagnets',
    kind: 'blessing',
    name: 'More Magnets',
    description: '+1.5% magnet chance',
    statLabel: 'Magnets',
    maxLevel: 5,
    perLevel: 0.015,
  },
  bigDrops: {
    id: 'bigDrops',
    kind: 'blessing',
    name: 'Big Drops',
    description: 'Bigger cats come more often',
    statLabel: 'Biggest drop',
    maxLevel: 5,
    perLevel: BIG_DROPS_TILT_PER_LEVEL,
  },
  goldenCats: {
    id: 'goldenCats',
    kind: 'blessing',
    name: 'Golden Cats',
    description: '+4% golden cats: they skip a size when they merge',
    statLabel: 'Golden cats',
    maxLevel: 5,
    perLevel: 0.04,
  },
};

/** The trials or the blessings, in card order. */
export function pickIds(kind: PickKind): readonly PickId[] {
  return kind === 'trial' ? TRIAL_IDS : BLESSING_IDS;
}
