/**
 * The scenes (GAME_DESIGN §2.6, the owner's request of 2026-10-14): runs set up for the game's
 * big moments, for the clips the owner sends to publishers. Each scene starts with its cats and
 * balls settled in the jar and the right ball in the paw; the player drops one or two balls and
 * sets the moment off. Nothing plays by itself. Two scenes per special ball, for Lucky Save and for
 * the Hubris, Heavy Drop and Dice rules.
 *
 * x is in world units from the jar's centre (the jar is 600 wide: its walls are at ±300); `h` is
 * how high the ball's bottom starts above the floor. Sizes are the stage's sizes (1 = its smallest
 * cat, 9 = its last). A cat's radius by size: 41, 49, 58, 69, 82, 98, 117, 139, 165. The jars
 * were tuned headless (tests/physics/scenarios.test.ts checks every scene's moment): small moves
 * can let two cats of a size touch while the jar settles, or move a chain out of reach.
 */
import type { ForcedDice, PickId } from './picks';

/** How long a scene's jar settles before it shows (play time, run at once). */
export const SCENARIO_SETTLE_MS = 2500;

export const SCENARIO_GROUPS = [
  'lightning',
  'hanabi',
  'joker',
  'golden',
  'magnet',
  'luckySave',
  'hubris',
  'heavyDrop',
  'dice',
] as const;

export type ScenarioGroup = (typeof SCENARIO_GROUPS)[number];

/**
 * A group's heading in the Scenes panel, and the pick whose art its icon shows (null: Lucky Save,
 * which shows its shop card's icon).
 */
export const SCENARIO_GROUP_INFO: Readonly<
  Record<ScenarioGroup, { readonly name: string; readonly pick: PickId | null }>
> = {
  lightning: { name: 'Lightning', pick: 'lightning' },
  hanabi: { name: 'Hanabi', pick: 'hanabi' },
  joker: { name: 'Joker Cat', pick: 'joker' },
  golden: { name: 'Golden Cat', pick: 'goldenCats' },
  magnet: { name: 'Magnet', pick: 'moreMagnets' },
  luckySave: { name: 'Lucky Save', pick: null },
  hubris: { name: 'Hubris', pick: 'hubris' },
  heavyDrop: { name: 'Heavy Drop', pick: 'heavyDrop' },
  dice: { name: 'Dice', pick: 'dice' },
};

/** A ball for the paw or NEXT. A special ball has its own size. */
export interface ScenarioDrop {
  readonly kind?: 'cat' | 'boulder' | 'magnet' | 'hanabi' | 'joker' | 'lightning';
  /** A cat's or boulder's size (1–9); 1 by default. A boulder needs one merge to break. */
  readonly size?: number;
  readonly golden?: boolean;
}

/** A ball in the jar. */
export interface ScenarioBall extends ScenarioDrop {
  readonly kind?: 'cat' | 'boulder';
  readonly x: number;
  /** Its bottom's height above the floor at the start; 0 (on the floor) by default. */
  readonly h?: number;
}

export interface ScenarioDef {
  readonly id: string;
  readonly group: ScenarioGroup;
  /** The scene's name in the panel. */
  readonly name: string;
  /** What to do, one line in the panel. */
  readonly line: string;
  readonly stage: number;
  readonly seed: number;
  /** The HUD's score and coins as the scene starts, as if a run had come this far. */
  readonly score: number;
  readonly coins: number;
  /** Rule levels for the run; they apply once the jar has settled. */
  readonly picks?: Partial<Record<PickId, number>>;
  readonly balls: readonly ScenarioBall[];
  readonly paw: ScenarioDrop;
  readonly next: ScenarioDrop;
  /** What the run's next dice show, in order (Dice); then they roll again. */
  readonly dice?: readonly ForcedDice[];
}

/** A cat of `size` at x, its bottom `h` above the floor; golden if asked. */
function cat(size: number, x: number, h = 0, golden = false): ScenarioBall {
  return golden ? { size, x, h, golden } : { size, x, h };
}

function boulder(size: number, x: number, h = 0): ScenarioBall {
  return { kind: 'boulder', size, x, h };
}

/**
 * Several scenes chain on one staircase: the stage's 8 (or a boulder that big, so the chain stops
 * at the 8) against a wall, a 7 beside it and a 6 in the valley between them; the scene adds the
 * rest. A 4 that meets a 4 on top makes a 5, which meets the 5, and so on up to the last cat.
 * `side` 1 puts the 8 against the left wall, −1 against the right one (every x mirrored).
 */
function staircase(
  side: 1 | -1,
  bottom: 'cat' | 'boulder',
  rest: readonly ScenarioBall[],
): ScenarioBall[] {
  const balls = [
    bottom === 'cat' ? cat(8, -161) : boulder(8, -161),
    cat(7, 100),
    cat(6, -40, 260),
    ...rest,
  ];
  return balls.map((ball) => ({ ...ball, x: side * ball.x }));
}

export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'lightningBoulders',
    group: 'lightning',
    name: 'Boulder storm',
    line: 'Drop the lightning on any boulder: they all break and the top 8 falls on the other.',
    stage: 5,
    seed: 501,
    score: 18_340,
    coins: 672,
    balls: [
      cat(8, 0),
      boulder(4, -231),
      cat(2, -231, 140),
      boulder(4, 231),
      boulder(4, 231, 140),
      boulder(3, -240, 290),
      boulder(3, -125, 300),
      boulder(2, 0, 290),
      boulder(3, 125, 300),
      cat(1, 240, 290),
      cat(8, 0, 420),
      boulder(3, -240, 420),
      cat(4, -235, 545),
      boulder(3, 240, 420),
      cat(3, 240, 545),
      boulder(2, -240, 700),
      boulder(2, 240, 700),
      boulder(3, -110, 720),
      boulder(3, 0, 760),
      boulder(3, 110, 720),
      boulder(2, 40, 860),
    ],
    paw: { kind: 'lightning' },
    next: { size: 2 },
  },
  {
    id: 'lightningRescue',
    group: 'lightning',
    name: 'Full house',
    line: 'Drop the lightning on the 3 at the top right: every 3 pops and the jar caves in.',
    stage: 8,
    seed: 802,
    score: 37_150,
    coins: 1_364,
    balls: [
      cat(5, -215),
      cat(3, -48),
      cat(6, 112),
      cat(3, 236),
      cat(4, -200, 170),
      cat(5, 24, 150),
      cat(5, 225, 120),
      cat(3, -250, 420),
      cat(6, -40, 360),
      cat(3, 110, 340),
      cat(4, 230, 300),
      cat(7, -200, 520),
      cat(3, 20, 560),
      cat(6, 190, 460),
      cat(2, -250, 690),
      cat(4, -100, 680),
      cat(1, 90, 700),
      cat(3, 250, 640),
    ],
    paw: { kind: 'lightning' },
    next: { size: 2 },
  },
  {
    id: 'hanabiShelf',
    group: 'hanabi',
    name: 'Firework shelf',
    line: 'Drop the hanabi into the gap on the right: the blast drops the top 8 onto the other.',
    stage: 10,
    seed: 1001,
    score: 52_480,
    coins: 1_903,
    balls: [
      cat(8, 0),
      boulder(4, -231),
      cat(2, -231, 140),
      cat(3, 236),
      boulder(4, 231, 120),
      boulder(2, -245, 290),
      cat(1, -140, 285),
      cat(2, -40, 290),
      boulder(2, 60, 290),
      cat(1, 150, 285),
      boulder(2, 250, 285),
      cat(8, 0, 400),
      cat(5, -215, 420),
      cat(3, -245, 600),
    ],
    paw: { kind: 'hanabi' },
    next: { size: 2 },
  },
  {
    id: 'hanabiCrowd',
    group: 'hanabi',
    name: 'Crowd pleaser',
    line: 'Drop the hanabi in the middle of the crowd: the small cats around it pop into coins.',
    stage: 3,
    seed: 301,
    score: 8_720,
    coins: 312,
    balls: [
      cat(7, -183),
      cat(4, 3),
      cat(6, 202),
      cat(2, -40, 150),
      cat(3, 80, 140),
      cat(1, -250, 240),
      cat(3, 240, 200),
      cat(4, -150, 240),
      cat(1, 30, 260),
      cat(2, 150, 240),
      cat(2, -200, 360),
      cat(2, -60, 340),
      cat(4, 60, 360),
      cat(1, 170, 350),
      cat(5, 230, 420),
      cat(3, -110, 480),
      cat(1, 0, 470),
      cat(2, 100, 480),
      cat(4, -230, 560),
      cat(2, -80, 600),
      cat(3, 30, 600),
      cat(1, 140, 600),
      cat(4, 240, 600),
      cat(2, -240, 720),
      cat(1, -140, 720),
      cat(4, -20, 740),
      cat(2, 110, 730),
      cat(3, 230, 740),
    ],
    paw: { kind: 'hanabi' },
    next: { size: 2 },
  },
  {
    id: 'jokerClear',
    group: 'joker',
    name: 'Wild finish',
    line: 'Drop the joker on the 8: it turns into the last cat and the shrine grows.',
    stage: 15,
    seed: 1501,
    score: 98_610,
    coins: 3_517,
    balls: [
      cat(6, -202),
      cat(4, -35),
      cat(7, 183),
      cat(3, -235, 200),
      cat(5, -70, 140),
      cat(2, 60, 240),
      boulder(3, 240, 240),
      cat(8, 0, 330),
      cat(1, -255, 330),
      cat(4, -230, 440),
      cat(3, 240, 380),
      cat(1, 250, 520),
    ],
    paw: { kind: 'joker' },
    next: { size: 2 },
  },
  {
    id: 'jokerChain',
    group: 'joker',
    name: 'Joker chain',
    line: 'Drop the joker on the 4 at the top: it becomes a 5, and 6, 7 and 8 follow.',
    stage: 12,
    seed: 1201,
    score: 71_930,
    coins: 2_640,
    balls: staircase(-1, 'boulder', [
      cat(5, 120, 300),
      cat(4, 40, 470),
      cat(1, -250, 290),
      cat(3, -160, 300),
      boulder(2, -255, 400),
      cat(2, -180, 440),
    ]),
    paw: { kind: 'joker' },
    next: { size: 2 },
  },
  {
    id: 'goldenClear',
    group: 'golden',
    name: 'Golden staircase',
    line: 'Drop the golden 3 on the 3 at the top: it skips to a 5 and the chain runs to the last cat.',
    stage: 20,
    seed: 2001,
    score: 162_870,
    coins: 5_436,
    balls: staircase(1, 'cat', [
      cat(5, 120, 300),
      cat(3, 40, 470),
      cat(2, -250, 290),
      cat(1, -160, 300),
      boulder(2, -255, 400),
      cat(4, -180, 440),
    ]),
    paw: { size: 3, golden: true },
    next: { size: 2 },
  },
  {
    id: 'goldenDouble',
    group: 'golden',
    name: 'Double gold',
    line: 'Drop the golden 4 on the 4 at the top, then the golden 3 on the 3.',
    stage: 6,
    seed: 601,
    score: 24_310,
    coins: 884,
    balls: staircase(1, 'boulder', [
      cat(4, 150, 230),
      cat(1, -250, 290),
      cat(2, -160, 300),
      boulder(2, -255, 400),
      cat(3, -180, 440),
    ]),
    paw: { size: 4, golden: true },
    next: { size: 3, golden: true },
  },
  {
    id: 'magnetClear',
    group: 'magnet',
    name: 'Magnet match',
    line: 'Tap the 8 on the right, then Take, and drop it on the other 8.',
    stage: 4,
    seed: 401,
    score: 13_260,
    coins: 488,
    balls: [
      cat(8, -161),
      boulder(3, 55),
      cat(1, 152),
      boulder(3, 242),
      boulder(2, 30, 116),
      cat(8, 161, 110),
      cat(2, -250, 290),
      cat(3, 60, 300),
      cat(5, 215, 400),
      cat(1, 80, 430),
    ],
    paw: { kind: 'magnet' },
    next: { size: 2 },
  },
  {
    id: 'magnetChain',
    group: 'magnet',
    name: 'Magnet chain',
    line: 'Tap the 4 on the right, then Take, and drop it on the 4 at the top left.',
    stage: 7,
    seed: 701,
    score: 30_520,
    coins: 1_108,
    balls: staircase(-1, 'boulder', [
      cat(5, 120, 300),
      cat(4, 40, 470),
      cat(2, -250, 290),
      cat(4, -170, 300),
      boulder(2, -255, 420),
      cat(1, -160, 460),
    ]),
    paw: { kind: 'magnet' },
    next: { size: 2 },
  },
  {
    id: 'luckySaveBrim',
    group: 'luckySave',
    name: 'Brim full',
    line: 'Drop the 4 anywhere: the jar overflows and a Lucky Save pops it clear.',
    stage: 9,
    seed: 901,
    score: 44_090,
    coins: 1_615,
    balls: [
      cat(4, 231),
      cat(3, 105),
      cat(3, -242),
      cat(6, -45),
      cat(5, 105, 116),
      cat(7, -184, 143),
      cat(5, -218, 372),
      cat(2, -18, 193),
      cat(2, 251, 136),
      cat(8, 161, 272),
      cat(4, -44, 309),
      cat(6, -62, 446),
      cat(7, 184, 549),
      cat(2, 19, 617),
      cat(3, -242, 534),
      cat(7, -150, 623),
      cat(3, 45, 712),
    ],
    paw: { size: 4 },
    next: { size: 4 },
  },
  {
    id: 'luckySaveChain',
    group: 'luckySave',
    name: 'Saved and cleared',
    line: 'Drop the 4 anywhere: the Lucky Save sets off a chain all the way to the last cat.',
    stage: 13,
    seed: 1301,
    score: 82_370,
    coins: 2_958,
    balls: [
      cat(5, 25),
      cat(6, 203),
      cat(5, 218, 195),
      cat(6, 43, 217),
      cat(4, -231, 324),
      cat(8, -162, 57),
      cat(7, 184, 359),
      cat(3, -98, 324),
      cat(2, -148, 428),
      cat(5, -13, 411),
      cat(2, 251, 576),
      cat(4, 70, 551),
      cat(8, -161, 525),
      cat(6, 177, 654),
      cat(3, 22, 679),
    ],
    paw: { size: 4 },
    next: { size: 4 },
  },
  {
    id: 'hubrisThree',
    group: 'hubris',
    name: 'Three and three',
    line: 'Drop the 3 into the gap between the two 3s: three 3s, then three 5s, then the last cat.',
    stage: 11,
    seed: 1101,
    score: 61_840,
    coins: 2_255,
    picks: { hubris: 1 },
    balls: [
      cat(8, -161),
      cat(7, 100),
      cat(5, -40, 260),
      cat(5, 150, 250),
      cat(3, -70, 450),
      cat(3, 200, 440),
      cat(2, -250, 290),
      cat(1, -160, 300),
      boulder(2, -255, 400),
      cat(4, -180, 440),
    ],
    paw: { size: 3 },
    next: { size: 2 },
  },
  {
    id: 'hubrisCascade',
    group: 'hubris',
    name: 'Hubris cascade',
    line: 'Drop the 2 between the two 2s on the right: three 2s, then three 4s, then a chain.',
    stage: 14,
    seed: 1401,
    score: 89_200,
    coins: 3_206,
    picks: { hubris: 1 },
    balls: [
      boulder(8, -161),
      cat(7, 100),
      cat(6, -87, 265),
      cat(4, 143, 228),
      cat(4, -67, 448),
      cat(2, 260, 420),
      cat(2, 100, 480),
      cat(1, -250, 300),
      cat(3, -250, 420),
    ],
    paw: { size: 2 },
    next: { size: 1 },
  },
  {
    id: 'heavyChain',
    group: 'heavyDrop',
    name: 'Fireball chain',
    line: 'Drop the fireball 4 on the 4 at the top left: the chain runs to the last cat.',
    stage: 17,
    seed: 1701,
    score: 121_480,
    coins: 4_305,
    picks: { heavyDrop: 1 },
    balls: staircase(-1, 'cat', [
      cat(5, 120, 300),
      cat(4, 40, 470),
      cat(1, -250, 290),
      cat(3, -160, 300),
      boulder(3, -255, 400),
      cat(2, -170, 450),
    ]),
    paw: { size: 4 },
    next: { size: 2 },
  },
  {
    id: 'heavyKnock',
    group: 'heavyDrop',
    name: 'Knockout',
    line: 'Drop the fireball on the outer edge of an 8, by the wall: it knocks that 8 into the other.',
    stage: 16,
    seed: 1601,
    score: 110_650,
    coins: 3_948,
    picks: { heavyDrop: 1 },
    balls: [cat(8, -161), cat(8, 161), cat(1, 0, 250), cat(4, -150, 300), cat(2, 160, 300)],
    paw: { size: 2 },
    next: { size: 1 },
  },
  {
    id: 'diceLucky',
    group: 'dice',
    name: 'Lucky roll',
    line: 'Drop the 4 on the 4: the die rolls lucky, skips a size and the chain runs to the last cat.',
    stage: 18,
    seed: 1801,
    score: 135_920,
    coins: 4_781,
    picks: { dice: 1 },
    balls: staircase(1, 'cat', [
      cat(4, 150, 230),
      cat(3, -250, 290),
      cat(1, -160, 300),
      boulder(2, -255, 400),
      cat(2, -180, 440),
    ]),
    paw: { size: 4 },
    next: { size: 2 },
    dice: ['lucky', 'normal', 'normal', 'normal'],
  },
  {
    id: 'diceComeback',
    group: 'dice',
    name: 'Fizzle, then luck',
    line: 'Drop the 4 on the 4 twice: the first roll fizzles, the second is lucky.',
    stage: 19,
    seed: 1901,
    score: 148_330,
    coins: 5_102,
    picks: { dice: 1 },
    balls: staircase(-1, 'boulder', [
      cat(4, 150, 230),
      cat(2, -250, 290),
      cat(1, -160, 300),
      boulder(2, -255, 400),
      cat(3, -180, 440),
    ]),
    paw: { size: 4 },
    next: { size: 4 },
    dice: ['fizzle', 'lucky', 'normal', 'normal', 'normal'],
  },
];

export function scenarioById(id: string): ScenarioDef | null {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
