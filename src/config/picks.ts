/**
 * Special balls, trials, rules and blessings (GAME_DESIGN §15). Every stage clear offers a trial,
 * which makes the coming stages harder, then a blessing, which helps; at the clears that grow the
 * jar a rule, which changes how the game works, takes the trial's place. Each pick raises that
 * option's level for the rest of the run. Derived values: core/picks.ts.
 */

/**
 * The boulders' chance before any pick (GAME_DESIGN §15.1). Magnets, like hanabi and jokers, come
 * only with their blessing (v0.39.1, the owner's call: a profile without More Magnets saw them at
 * 1% until then).
 */
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
 * Big Drops adds this many tilt levels to the drop weights (GAME_DESIGN §8), up to
 * MAX_DROP_TILT_LEVEL in all with Big Catch: there the smallest drop is almost gone (1, 17, 33,
 * 49%). Until v0.39 (every shop effect 1.5 times as strong, the owner's call): 2 per level, up to 10
 * (10, 20, 30, 40%).
 */
export const BIG_DROPS_TILT_PER_LEVEL = 3;
export const MAX_DROP_TILT_LEVEL = 13;

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
 * each strength (index = strength; 1.0 s without it). The start speeds and the gravity that make
 * them are in config/physics.ts. It was a trial of five levels until v0.40; now it is a rule, and
 * taking it drops every ball at HEAVY_DROP_RULE_LEVEL, the trial's last level (the owner's call).
 */
export const HEAVY_DROP_FALL_TIMES = [1.0, 0.66, 0.53, 0.41, 0.33, 0.24] as const;
export const HEAVY_DROP_RULE_LEVEL = 5;
/**
 * Its look: speed lines from strength 1, a small flame with embers from HEAVY_FLAME_LEVEL, and
 * from HEAVY_FIREBALL_LEVEL (the top) the big fireball, which lands with sparks, a thud and a
 * small shake. Visual only. The rule always plays at the top.
 */
export const HEAVY_FLAME_LEVEL = 3;
export const HEAVY_FIREBALL_LEVEL = 5;

/**
 * Porcelain (GAME_DESIGN §15.10): every merge may crack each cat whose edge is within this many
 * world units of one of the merging cats' edges (touching, or so close the gap doesn't show), with
 * PORCELAIN_CHANCE_PER_LEVEL per level. A cracked cat that cracks again breaks in two.
 * v0.34 (the owner's call after playing it): 10% per level, first built at 20%, where a test bot
 * lost 26 of 90 runs of stage 1 at level 1 against 13 without Porcelain (now 20).
 */
export const PORCELAIN_REACH = BOULDER_HIT_REACH;
export const PORCELAIN_CHANCE_PER_LEVEL = 0.1;
/**
 * A broken cat's two pieces (shard mates) are born touching and don't merge with each other; once
 * both have grown in and their edges are more than PORCELAIN_MATE_GAP world units apart, or
 * PORCELAIN_MATE_MS after the break even if they never came apart, they are two ordinary cats and
 * merge when they touch. (v0.35.2, the owner found pieces wedged together in a pile that never
 * merged: 13–18% of breaks in bot play stayed together longer than 3 s.)
 */
export const PORCELAIN_MATE_GAP = 10;
export const PORCELAIN_MATE_MS = 1000;

/**
 * Hubris (GAME_DESIGN §15.11): three cats up to this size that touch in a chain merge at once into
 * a cat HUBRIS_SIZE_STEP sizes bigger; two of them merge only after touching for HUBRIS_PAIR_WAIT_MS
 * (v0.34, the owner's call: until then they never merged in pairs, which clogged the jar).
 */
export const HUBRIS_MAX_SIZE = 5;
export const HUBRIS_PARTS = 3;
export const HUBRIS_SIZE_STEP = 2;
export const HUBRIS_PAIR_WAIT_MS = 500;
/**
 * Two cats resting side by side touch on some steps and not on others; a pair still counts as
 * touching this long after their contact was last seen, so its wait doesn't start over.
 */
export const HUBRIS_TOUCH_GRACE_MS = 100;

/**
 * Echo (GAME_DESIGN §15.11): a merge of cats of these sizes leaves a cat of their size beside the
 * new cat, at most once per drop (v0.34, the owner's call: sizes 4–7 and every merge set off
 * chains that ended a run within a minute, won or lost).
 */
export const ECHO_MIN_SIZE = 5;
export const ECHO_MAX_SIZE = 7;

/**
 * A cat that appears in the jar without a merge (an echo, a broken cat's piece) starts at this
 * share of its radius and grows into it over MERGE_GROW_MS, so it pushes its neighbours aside
 * instead of launching them.
 */
export const SPAWN_START_RADIUS_SHARE = 0.25;

/**
 * Cursed Bell (GAME_DESIGN §15.12): with it taken, the stage's CURSE_FIRST_DROP-th drop brings the
 * first curse, and each next one comes CURSE_INTERVALS[More Curses level] drops after the last one
 * began. A cursed cat's bell counts down from CURSE_DROPS[Quick Curse level] drops; at the drop
 * after 0 it turns to stone, a boulder that breaks after CURSE_STONE_HITS merges whatever Iron
 * Bands says. Only cats of sizes 1 to CURSE_MAX_SIZE are cursed. A merge that lifts a curse pays
 * CURSE_LIFT_BONUS times its own coins on top.
 */
export const CURSE_FIRST_DROP = 15;
export const CURSE_INTERVALS = [30, 25, 20, 15] as const;
export const CURSE_DROPS = [10, 8, 7, 6] as const;
export const CURSE_MAX_SIZE = 6;
export const CURSE_LIFT_BONUS = 1;
export const CURSE_STONE_HITS = 1;

/**
 * Copycat (GAME_DESIGN §15.13): a merge turns the cat in NEXT to the size that met, at most this
 * size (the biggest drop). The balance bot (`npm run sim`) clears stage 1 in 6 of 30 runs with it,
 * median 49 s, against 11 and 67 s without it and 45–51 s with Hubris or Echo; at 3: 10 runs,
 * 63 s. (v0.35.0 also turned every later cat to that size until the next merge, which the owner
 * found far too easy, and copied up to size 3.)
 */
export const COPYCAT_MAX_SIZE = 4;

/**
 * Dice (GAME_DESIGN §15.14): every merge of cats rolls a die. It is lucky (one size more) or
 * fizzles (one cat of the size that met) with these chances; otherwise the merge is normal.
 */
export const DICE_LUCKY_CHANCE = 1 / 6;
export const DICE_FIZZLE_CHANCE = 1 / 6;
/** What a merge's die showed; null when it didn't roll or rolled a normal merge. */
export type DiceRoll = 'lucky' | 'fizzle' | null;

export const TRIAL_IDS = [
  'moreBoulders',
  'ironBands',
  'bigBoulders',
  'wind',
  'porcelain',
  'cursedBell',
  'quickCurse',
  'moreCurses',
] as const;
export const RULE_IDS = ['hubris', 'echo', 'copycat', 'dice', 'heavyDrop'] as const;
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
  /** A follow-up: it is offered only once this pick has been taken (GAME_DESIGN §15.5). */
  readonly requires?: PickId;
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
    // A rule since v0.40 (the owner's call): the trial's last level, at once.
    kind: 'rule',
    name: 'Heavy Drop',
    description: 'Cats shoot down like fireballs and knock aside the cat they land on',
    statLabel: 'Fall time',
    maxLevel: 1,
    perLevel: HEAVY_DROP_RULE_LEVEL,
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
  cursedBell: {
    id: 'cursedBell',
    kind: 'trial',
    name: 'Cursed Bell',
    description: 'Now and then a cat is cursed: merge it in time, or it turns to stone',
    statLabel: 'Curse',
    maxLevel: 1,
    perLevel: 1,
  },
  quickCurse: {
    id: 'quickCurse',
    kind: 'trial',
    name: 'Quick Curse',
    description: 'Cursed cats turn to stone sooner',
    statLabel: 'Drops to stone',
    maxLevel: CURSE_DROPS.length - 1,
    perLevel: 1,
    requires: 'cursedBell',
  },
  moreCurses: {
    id: 'moreCurses',
    kind: 'trial',
    name: 'More Curses',
    description: 'Curses come more often',
    statLabel: 'Drops between curses',
    maxLevel: CURSE_INTERVALS.length - 1,
    perLevel: 1,
    requires: 'cursedBell',
  },
  hubris: {
    id: 'hubris',
    kind: 'rule',
    name: 'Hubris',
    description: 'Sizes 1–5 wait a moment to merge in pairs; three merge at once and skip a size',
    statLabel: 'Small pairs merge',
    maxLevel: 1,
    perLevel: 1,
  },
  echo: {
    id: 'echo',
    kind: 'rule',
    name: 'Echo',
    description: 'Merges of sizes 5–7 leave a cat of their size behind, once per drop',
    statLabel: 'Echo',
    maxLevel: 1,
    perLevel: 1,
  },
  copycat: {
    id: 'copycat',
    kind: 'rule',
    name: 'Copycat',
    description: 'The next cat copies the size of your last merge',
    statLabel: 'Next cat',
    maxLevel: 1,
    perLevel: 1,
  },
  dice: {
    id: 'dice',
    kind: 'rule',
    name: 'Dice',
    description: 'Every merge rolls a die: sometimes a size more, sometimes it fizzles',
    statLabel: 'Merges',
    maxLevel: 1,
    perLevel: 1,
  },
  moreMagnets: {
    id: 'moreMagnets',
    kind: 'blessing',
    name: 'More Magnets',
    description: '+2.25% magnet chance',
    statLabel: 'Magnets',
    maxLevel: 5,
    // v0.39: 1.5 times v0.24's 1.5% (every shop effect 1.5 times as strong, the owner's call).
    perLevel: 0.0225,
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
    description: '+6% golden cats: they skip a size when they merge',
    statLabel: 'Golden cats',
    maxLevel: 5,
    // 4% until v0.39.
    perLevel: 0.06,
  },
  hanabi: {
    id: 'hanabi',
    kind: 'blessing',
    name: 'Hanabi',
    description: 'Fireworks that pop the small cats around them',
    statLabel: 'Hanabi',
    maxLevel: 5,
    // 1.5% until v0.39.
    perLevel: 0.0225,
  },
  joker: {
    id: 'joker',
    kind: 'blessing',
    name: 'Joker Cat',
    description: 'Merges with any cat and makes it one size bigger',
    statLabel: 'Jokers',
    maxLevel: 5,
    // 1.5% until v0.39.
    perLevel: 0.0225,
  },
};

/** The trials, the rules or the blessings, in card order. */
export function pickIds(kind: PickKind): readonly PickId[] {
  return kind === 'trial' ? TRIAL_IDS : kind === 'rule' ? RULE_IDS : BLESSING_IDS;
}
