/**
 * Rendering and camera tunables (TECH_SPEC §4, §6). Lengths ending in `_RATIO` are fractions of
 * the current jar width, so the jar keeps its look while it grows. Other lengths are world units;
 * the world has the same scale at every stage.
 */

/** Space shown left and right of the jar's inner walls, each side (includes the wall art). */
export const CAMERA_SIDE_MARGIN_RATIO = 0.05;
/** Space shown below the jar floor (includes the floor art). */
export const CAMERA_FLOOR_MARGIN_RATIO = 0.04;
/**
 * Where the play band's spare height goes when the screen is taller than the framed jar: this
 * share below the floor, the rest above the dropper. 0 keeps the floor at the bottom edge and 0.5
 * centres the jar; 0.45 lifts it as far as the owner's sketch on a phone (v0.10).
 */
export const CAMERA_SPARE_BELOW_RATIO = 0.45;

/** Drawn thickness of the jar walls and floor, outside the physics walls. */
export const JAR_WALL_RATIO = 0.03;
/** Corner radius of the jar's bottom corners (drawn only). */
export const JAR_CORNER_RATIO = 0.04;
/** Thickness of the rim lip (the danger line) drawn on top of each wall. */
export const JAR_RIM_RATIO = 0.012;

/** The canvas renders at most this many device pixels per CSS pixel (TECH_SPEC §6). */
export const MAX_RENDER_RESOLUTION = 2.5;

/**
 * Placeholder textures are drawn at this many texture pixels per world unit (a CSS zoom of about 1
 * at the resolution cap), so they are never upscaled on a phone or tablet.
 */
export const PLACEHOLDER_PX_PER_UNIT = 2.5;
/** Outline width of a placeholder cat, as a fraction of its radius. */
export const PLACEHOLDER_OUTLINE_RATIO = 0.07;
/** Width of the golden ring, as a fraction of the radius. */
export const PLACEHOLDER_GOLD_RING_RATIO = 0.13;
/** Font size of the tier number, as a fraction of the radius (one and two digits). */
export const NUMBER_HEIGHT_RATIO = 0.95;
export const NUMBER_HEIGHT_RATIO_TWO_DIGITS = 0.78;

/** Aim guide: line width and dash pattern in world units. */
export const AIM_LINE_WIDTH = 3;
export const AIM_DASH = 14;
export const AIM_GAP = 10;
/** Pop-in of the next cat in the dropper. */
export const DROPPER_POP_IN_MS = 160;

/** Danger: the rim flashes with this period while the timer runs. */
export const DANGER_FLASH_PERIOD_MS = 400;

/** Merge feedback: the pop ring and the floating score. */
export const MERGE_POP_MS = 280;
export const MERGE_POP_SCALE = 1.6;
export const FLOAT_TEXT_MS = 700;
/** How far the floating score rises, in world units. */
export const FLOAT_TEXT_RISE = 70;
/** Font size of the floating score, in world units. */
export const FLOAT_TEXT_SIZE = 34;
/**
 * At most this many effects of each kind play at once; older ones are recycled. A cash-out can pop
 * dozens of cats in one go.
 */
export const FX_POOL_SIZE = 48;

/**
 * Popping cats (cash-out, Lucky Save): each grows by POP_SCALE and fades over POP_MS. Pops of the
 * same tick go off one after another, POP_STAGGER_MS apart but within POP_STAGGER_MAX_MS in all,
 * so a cash-out finishes inside the expansion's reveal.
 */
export const POP_MS = 220;
export const POP_SCALE = 1.3;
export const POP_STAGGER_MS = 30;
export const POP_STAGGER_MAX_MS = 240;

/**
 * Expansion (GAME_DESIGN §7.1): the drawn walls and rim trail the camera by this fraction of the
 * zoom, so the view pulls back first and the jar then widens into the new frame. Both arrive
 * together when the zoom ends. 0 keeps the jar locked to the frame.
 */
export const EXPANSION_WALL_LAG = 0.25;
/** Gold sparks along the rim when the zoom starts and at the reveal, in world units. */
export const EXPANSION_SPARKS = {
  count: 44,
  lifespanMs: { min: 650, max: 1100 },
  speed: { min: 260, max: 640 },
  gravity: 950,
  /** Spark size as a fraction of its 64 px texture. */
  scale: 0.5,
} as const;
/** Each frame of an expansion may spend this long drawing the next stage's number textures. */
export const SKIN_PREPARE_BUDGET_MS = 4;

/** First-run hints (GAME_DESIGN §2.3). */
export const HINT_MERGE_DELAY_MS = 600;

/** How long banners and toasts stay (GAME_DESIGN §2.3), including their pop-in and fade-out. */
export const BANNER_MS = 1300;
/**
 * Banners centre this far below the rim, as a fraction of the jar's height: right after an
 * expansion the top of the jar is empty, and the dropper above the rim stays visible.
 */
export const BANNER_JAR_OFFSET = 0.15;
export const BANNER_NEW_CATS_MS = 2000;
export const TOAST_MS = 3200;

/** "Combo ×N" (GAME_DESIGN §5) centres this far below the rim, as a fraction of the jar's height. */
export const COMBO_JAR_OFFSET = 0.3;

/**
 * Coins fly from a payout to the HUD counter (GAME_DESIGN §12, TECH_SPEC §7): one coin per merge
 * or pop, a shower for a Jackpot. At most COIN_FLY_POOL coins are in the air; the coins are
 * already in the wallet, so a flight that doesn't fit is simply skipped.
 */
export const COIN_FLY_MS = 620;
export const COIN_FLY_STAGGER_MS = 50;
export const COIN_FLY_POOL = 24;
export const JACKPOT_COIN_FLIGHTS = 8;
/** A Jackpot's coins burst out to a ring this many CSS pixels wide before they fly. */
export const COIN_SHOWER_SPREAD = 34;
/** How high the flight arcs above the straight line, as a fraction of its length. */
export const COIN_FLY_ARC = 0.22;

/** A Jackpot's floating "+coins" is this much bigger than a merge's. */
export const JACKPOT_TEXT_SCALE = 1.7;
/** Spark bursts (world units): golden merges and Jackpots. */
export const BURST_SPARKS = {
  golden: 12,
  jackpot: 40,
  lifespanMs: { min: 450, max: 900 },
  speed: { min: 180, max: 520 },
  gravity: 600,
  scale: 0.45,
} as const;

/** Golden cats twinkle: a star glint on the upper right, pulsing with this period. */
export const GLINT_PERIOD_MS = 1400;
/** The glint's size at its brightest, as a fraction of the cat's radius. */
export const GLINT_SIZE_RATIO = 0.75;

/** The shop balance counts down to the new wallet after a purchase (GAME_DESIGN §2.2). */
export const SHOP_BALANCE_COUNT_MS = 450;

/**
 * Merge juice (GAME_DESIGN §12). Every merge bursts particles in the new cat's colour (more for
 * bigger cats), and the new cat bumps up by MERGE_BUMP_SCALE and settles over MERGE_BUMP_MS on top
 * of its physical growth. World units; `perSize` counts the new cat's size.
 */
export const MERGE_PARTICLES = {
  base: 7,
  perSize: 0.8,
  max: 18,
  lifespanMs: { min: 320, max: 620 },
  speed: { min: 140, max: 420 },
  gravity: 700,
  scale: 0.42,
} as const;
export const MERGE_BUMP_MS = 220;
export const MERGE_BUMP_SCALE = 0.14;
/** With `prefers-reduced-motion`, particle counts are multiplied by this (and nothing shakes). */
export const REDUCED_MOTION_PARTICLES = 0.35;

/**
 * Camera shake (GAME_DESIGN §12): merges into size SHAKE.minSize and above, Jackpots, and combo
 * escalation from SHAKE.comboMin. Amplitudes are world units; a stronger shake replaces a weaker
 * one, and each fades out over its duration.
 */
export const SHAKE = {
  minSize: 10,
  mergeBase: 5,
  mergePerSize: 2,
  mergeMs: 260,
  jackpot: 15,
  jackpotMs: 450,
  comboMin: 5,
  comboStep: 1.2,
  comboMax: 7,
  comboMs: 200,
  /** Oscillation frequencies of the x and y offsets, in Hz. */
  frequencyX: 29,
  frequencyY: 23,
} as const;

/** The danger countdown number pulses when it reaches a new second. */
export const COUNTDOWN_PULSE_MS = 260;
export const COUNTDOWN_PULSE_SCALE = 0.35;

/** "Combo ×N" heats up (bigger, hotter colour) at these combo levels. */
export const COMBO_HEAT_LEVELS = [4, 7] as const;
