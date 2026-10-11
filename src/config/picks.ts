/**
 * Special balls, trials, rules and blessings (GAME_DESIGN §15). Every stage clear offers a trial,
 * which makes the coming stages harder, then a blessing, which helps; at the clears that grow the
 * jar a rule, which changes how the game works, takes the trial's place. Each pick raises that
 * option's level for the rest of the run. Derived values: core/picks.ts.
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
/**
 * No hanabi comes in a stage's first drops either (GAME_DESIGN §15.6): an empty jar has nothing
 * for it to pop.
 */
export const HANABI_FREE_DROPS = 20;
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
 * The hanabi (GAME_DESIGN §15.6): a ball of this size whose fuse lights at its first contact and
 * goes off HANABI_FUSE_MS later. Every cat up to HANABI_MAX_POP_SIZE whose edge is within
 * HANABI_REACH of the hanabi's centre pops into its value, and every boulder there breaks; bigger
 * cats and jokers there get pushed away at HANABI_PUSH_SPEED (world units per second).
 */
export const HANABI_SIZE = 2;
export const HANABI_FUSE_MS = 1000;
export const HANABI_REACH = 200;
export const HANABI_MAX_POP_SIZE = 4;
export const HANABI_PUSH_SPEED = 320;

/**
 * The joker cat (GAME_DESIGN §15.7): a ball of this size that merges with the first cat it
 * touches, whatever its tier, and raises that cat one tier (two for a golden cat).
 */
export const JOKER_SIZE = 2;

/**
 * Big Drops adds this many Big Catch levels to the drop weights (GAME_DESIGN §8), up to
 * MAX_DROP_TILT_LEVEL in all: there every drop size has its own share (10, 20, 30, 40%).
 */
export const BIG_DROPS_TILT_PER_LEVEL = 2;
export const MAX_DROP_TILT_LEVEL = 10;

/** A pick shows this many different options (fewer when fewer are left). */
export const PICK_OPTIONS = 3;

/**
 * Wind (GAME_DESIGN §15.8): every ball from the drop until its first contact is pushed sideways at
 * this many world units per second² per level, one way for the whole run (the seed decides). On a
 * one-second fall that drifts a ball ½·a·t² = 50 units per level (the jar is 600 wide).
 */
export const WIND_ACCEL_PER_LEVEL = 100;
/** The wind's card names its strength: index = level. */
export const WIND_NAMES = ['Calm', 'Breeze', 'Gusty', 'Strong', 'Gale', 'Storm'] as const;
/** Which way the run's wind blows: 1 to the right, −1 to the left. */
export type WindDirection = 1 | -1;

/**
 * Heavy Drop (GAME_DESIGN §15.9): how long a dropped cat takes from the paw to the empty floor at
 * each level (index = level; 1.0 s without it), as its card shows them. The start speeds and the
 * gravity that make them are in config/physics.ts.
 */
export const HEAVY_DROP_FALL_TIMES = [1.0, 0.8, 0.65, 0.5, 0.4, 0.3] as const;
/**
 * Its look: speed lines from level 1, a small flame with embers from HEAVY_FLAME_LEVEL, and from
 * HEAVY_FIREBALL_LEVEL (the top level) the big fireball, which lands with sparks, a thud and a
 * small shake. Visual only.
 */
export const HEAVY_FLAME_LEVEL = 3;
export const HEAVY_FIREBALL_LEVEL = 5;

/**
 * Porcelain (GAME_DESIGN §15.10): every merge may crack each cat whose edge is within this many
 * world units of one of the merging cats' edges (touching, or so close the gap doesn't show), with
 * PORCELAIN_CHANCE_PER_LEVEL per level. A cracked cat that cracks again breaks in two.
 */
export const PORCELAIN_REACH = BOULDER_HIT_REACH;
export const PORCELAIN_CHANCE_PER_LEVEL = 0.2;

/**
 * Hubris (GAME_DESIGN §15.11): cats up to this size merge only in threes (HUBRIS_PARTS cats that
 * touch in a chain), and a three-way merge makes a cat HUBRIS_SIZE_STEP sizes bigger.
 */
export const HUBRIS_MAX_SIZE = 5;
export const HUBRIS_PARTS = 3;
export const HUBRIS_SIZE_STEP = 2;

/**
 * Echo (GAME_DESIGN §15.11): a merge of cats of these sizes leaves a cat of their size beside the
 * new cat.
 */
export const ECHO_MIN_SIZE = 4;
export const ECHO_MAX_SIZE = 7;

/**
 * A cat that appears in the jar without a merge (an echo, a broken cat's piece) starts at this
 * share of its radius and grows into it over MERGE_GROW_MS, so it pushes its neighbours aside
 * instead of launching them.
 */
export const SPAWN_START_RADIUS_SHARE = 0.25;

export const TRIAL_IDS = [
  'moreBoulders',
  'ironBands',
  'bigBoulders',
  'wind',
  'heavyDrop',
  'porcelain',
] as const;
export const RULE_IDS = ['hubris', 'echo'] as const;
export const BLESSING_IDS = ['moreMagnets', 'bigDrops', 'goldenCats', 'hanabi', 'joker'] as const;
export const PICK_IDS = [...TRIAL_IDS, ...BLESSING_IDS, ...RULE_IDS] as const;

export type TrialId = (typeof TRIAL_IDS)[number];
export type RuleId = (typeof RULE_IDS)[number];
export type BlessingId = (typeof BLESSING_IDS)[number];
export type PickId = TrialId | BlessingId | RuleId;
/**
 * A trial makes the coming stages harder; a rule changes how the game works for the rest of the
 * run (one level: on or off); a blessing helps.
 */
export type PickKind = 'trial' | 'blessing' | 'rule';

/**
 * The order of a stage clear's picks (GAME_DESIGN §15.5): a trial, then a blessing; at a clear
 * that grows the jar (every JAR_GROWTH_STAGES stages) a rule takes the trial's place. A rule pick
 * with no rule left offers a trial instead (RunController).
 */
export function pickOrder(grows: boolean): readonly PickKind[] {
  return grows ? ['rule', 'blessing'] : ['trial', 'blessing'];
}

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
  wind: {
    id: 'wind',
    kind: 'trial',
    name: 'Wind',
    // "right" or "left": the run's wind (core/picks.ts).
    description: 'The wind blows falling cats to the right',
    statLabel: 'Wind',
    maxLevel: 5,
    perLevel: WIND_ACCEL_PER_LEVEL,
  },
  heavyDrop: {
    id: 'heavyDrop',
    kind: 'trial',
    name: 'Heavy Drop',
    description: 'Cats fall faster and hit harder',
    statLabel: 'Fall time',
    maxLevel: 5,
    perLevel: 1,
  },
  porcelain: {
    id: 'porcelain',
    kind: 'trial',
    name: 'Porcelain',
    description: 'Merges can crack the cats beside them; cracked twice, a cat breaks in two',
    statLabel: 'Crack chance',
    maxLevel: 4,
    perLevel: PORCELAIN_CHANCE_PER_LEVEL,
  },
  hubris: {
    id: 'hubris',
    kind: 'rule',
    name: 'Hubris',
    description: 'Sizes 1–5 only merge in threes, and skip a size when they do',
    statLabel: 'Small cats merge',
    maxLevel: 1,
    perLevel: 1,
  },
  echo: {
    id: 'echo',
    kind: 'rule',
    name: 'Echo',
    description: 'Merges of sizes 4–7 leave a cat of their size behind',
    statLabel: 'Echo',
    maxLevel: 1,
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
  hanabi: {
    id: 'hanabi',
    kind: 'blessing',
    name: 'Hanabi',
    description: 'Fireworks that pop the small cats around them',
    statLabel: 'Hanabi',
    maxLevel: 5,
    perLevel: 0.015,
  },
  joker: {
    id: 'joker',
    kind: 'blessing',
    name: 'Joker Cat',
    description: 'Merges with any cat and makes it one size bigger',
    statLabel: 'Jokers',
    maxLevel: 5,
    perLevel: 0.015,
  },
};

/** The trials, the rules or the blessings, in card order. */
export function pickIds(kind: PickKind): readonly PickId[] {
  return kind === 'trial' ? TRIAL_IDS : kind === 'rule' ? RULE_IDS : BLESSING_IDS;
}
