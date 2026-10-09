/**
 * Rendering and camera tunables (TECH_SPEC §4, §6). Lengths ending in `_RATIO` are fractions of
 * the current jar width, so the jar keeps its look while it grows. Other lengths are world units;
 * the world has the same scale at every stage.
 */

/**
 * Space shown left and right of the jar's inner walls, each side: the bamboo frame and the garden
 * either side of it. The jar art's top rail reaches 108 units past the walls (v0.17: a 283 px jar
 * on a 390 px phone; 0.15 and 300 px with the thinner vector frame of v0.14).
 */
export const CAMERA_SIDE_MARGIN_RATIO = 0.19;
/** Space shown below the jar floor: the feet and the rug. */
export const CAMERA_FLOOR_MARGIN_RATIO = 0.2;
/**
 * Where the play band's spare height goes when the screen is taller than the framed jar: this
 * share below the floor, the rest above the dropper. 0 keeps the floor at the bottom edge and 0.5
 * centres the jar between the HUD and the bottom edge, where the owner's v0.14 screen has it.
 */
export const CAMERA_SPARE_BELOW_RATIO = 0.5;
/**
 * The spare height is shared as if the dropper band were only this tall (a fraction of the jar
 * width); the rest of the band comes out of the share above. v0.21.1 raised the dropper from a
 * 0.2 W band to 0.4 W and the jar stayed where it was on a phone.
 */
export const CAMERA_SHARED_HEADROOM_RATIO = 0.2;

/** The jar's art is drawn at this many texture pixels per world unit (a CSS zoom of 0.65 at 2.5×). */
export const JAR_PX_PER_UNIT = 1.6;
/** The dashed danger line across the opening: dash (and gap) length, width, inset from the walls. */
export const JAR_RIM_DASH = 14;
export const JAR_RIM_WIDTH = 4.4;
export const JAR_RIM_INSET = 6;

/** The paw's art (config/pawArt.ts), like the cats': never upscaled. */
export const PAW_PX_PER_UNIT = 2.5;
/** When a cat drops, the paw lifts by PAW_LIFT world units and settles back. */
export const PAW_LIFT = 26;
export const PAW_LIFT_UP_MS = 110;
export const PAW_LIFT_DOWN_MS = 280;

/** The canvas renders at most this many device pixels per CSS pixel (TECH_SPEC §6). */
export const MAX_RENDER_RESOLUTION = 2.5;

/**
 * Adaptive resolution (TECH_SPEC §6, §13): a phone that stutters through play renders the canvas
 * at fewer device pixels per CSS pixel, one of these caps at a time below MAX_RENDER_RESOLUTION.
 * Phones that keep up never leave the full resolution.
 */
export const RENDER_RESOLUTION_STEPS: readonly number[] = [2, 1.5];
/** Play is judged over windows this long (ms of frames while playing). */
export const RENDER_WATCH_MS = 2000;
/** Frames longer than this on average (under 45 fps) count as slow. */
export const RENDER_SLOW_FRAME_MS = 1000 / 45;
/**
 * A steady frame rate is a cap (iOS Low Power Mode, a battery saver: 30 fps), not a phone that
 * stutters, and is left alone: frames count as steady when the slowest tenth are at most this
 * many times the fastest tenth, down to RENDER_STEADY_MIN_FPS.
 */
export const RENDER_STEADY_RATIO = 1.25;
export const RENDER_STEADY_MIN_FPS = 28;
/** A lower resolution stays only if it made frames at least this much shorter; else it goes back. */
export const RENDER_MIN_GAIN = 0.1;
/** Frames ignored after a change or a break in play (the resize itself costs a frame or two). */
export const RENDER_SETTLE_MS = 500;
/** Longer frames are pauses (a hidden tab, a menu), not load: ignored. */
export const RENDER_STALL_MS = 250;

/**
 * Placeholder textures are drawn at this many texture pixels per world unit (a CSS zoom of about 1
 * at the resolution cap), so they are never upscaled on a phone or tablet.
 */
export const PLACEHOLDER_PX_PER_UNIT = 2.5;
/** The lucky-cat skin's textures (GAME_DESIGN §13), like the placeholders: never upscaled. */
export const CAT_PX_PER_UNIT = 2.5;
/** The outline around a cat's number, in its plate's colour, as a fraction of the font size. */
export const CAT_NUMBER_HALO_RATIO = 0.16;
/** Outline width of a placeholder cat, as a fraction of its radius. */
export const PLACEHOLDER_OUTLINE_RATIO = 0.07;
/** Font size of the tier number, as a fraction of the radius (one and two digits). */
export const NUMBER_HEIGHT_RATIO = 0.95;
export const NUMBER_HEIGHT_RATIO_TWO_DIGITS = 0.78;

/** Aim guide: a dotted line (dot radius and spacing) and the landing ghost's line, world units. */
export const AIM_DOT_RADIUS = 2.8;
export const AIM_DOT_SPACING = 18;
export const AIM_LINE_WIDTH = 3;
/** The ghost of the landing cat is this faint, relative to the dots. */
export const AIM_GHOST_ALPHA = 0.45;
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
 * How much the jar grows on screen (the camera zooms out by as much) from one stage to the next
 * (GAME_DESIGN §7.1). A look only: the grown jar is emptied and rescaled to the same world jar at
 * the reveal. Until v0.24 it was r(10) / r(1), so the last cat shrank to the first cat's size.
 */
export const STAGE_ZOOM = 4.8;

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

/** How long banners stay (GAME_DESIGN §2.3), including their pop-in and fade-out. */
export const BANNER_MS = 1300;
/**
 * Banners centre this far below the rim, as a fraction of the jar's height: right after an
 * expansion the top of the jar is empty, and the dropper above the rim stays visible.
 */
export const BANNER_JAR_OFFSET = 0.15;
export const BANNER_NEW_CATS_MS = 2000;

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
/** A golden cat's merge (GAME_DESIGN §15.4) sends three coins. */
export const GOLDEN_COIN_FLIGHTS = 3;
/** A Jackpot's coins burst out to a ring this many CSS pixels wide before they fly. */
export const COIN_SHOWER_SPREAD = 34;
/** How high the flight arcs above the straight line, as a fraction of its length. */
export const COIN_FLY_ARC = 0.22;

/** A Jackpot's floating "+coins" is this much bigger than a merge's, a golden cat's merge this much. */
export const JACKPOT_TEXT_SCALE = 1.7;
export const GOLDEN_TEXT_SCALE = 1.35;
/** Spark bursts (world units): golden cats' merges and Jackpots. */
export const BURST_SPARKS = {
  golden: 12,
  jackpot: 40,
  lifespanMs: { min: 450, max: 900 },
  speed: { min: 180, max: 520 },
  gravity: 600,
  scale: 0.45,
} as const;

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
 * Camera shake (GAME_DESIGN §12): merges into size SHAKE.minSize and above, Jackpots, hanabi, and combo
 * escalation from SHAKE.comboMin. Amplitudes are world units; a stronger shake replaces a weaker
 * one, and each fades out over its duration.
 */
export const SHAKE = {
  minSize: 9,
  mergeBase: 5,
  mergePerSize: 2,
  mergeMs: 260,
  jackpot: 15,
  jackpotMs: 450,
  hanabi: 8,
  hanabiMs: 260,
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

/**
 * Special balls (GAME_DESIGN §15). A golden cat's glow is GOLDEN_GLOW_SCALE times its radius and
 * pulses between the two alphas over GOLDEN_GLOW_PERIOD_MS. The magnet's selection ring sits
 * SELECT_RING_GAP world units outside the ball, SELECT_RING_WIDTH wide, pulsing over
 * SELECT_RING_PERIOD_MS.
 */
export const GOLDEN_GLOW_SCALE = 1.45;
export const GOLDEN_GLOW_ALPHA = { min: 0.55, max: 0.95 } as const;
export const GOLDEN_GLOW_PERIOD_MS = 1200;
export const SELECT_RING_GAP = 6;
export const SELECT_RING_WIDTH = 7;
export const SELECT_RING_PERIOD_MS = 700;
/** A lit hanabi (GAME_DESIGN §15.6) flickers: its glow pulses this fast between these alphas. */
export const HANABI_FUSE_FLICKER_MS = 180;
export const HANABI_FUSE_ALPHA = { min: 0.35, max: 1 } as const;
/** A hanabi's blast: a burst of this many sparks. */
export const HANABI_BLAST_SPARKS = 36;
/** Particles when a boulder loses a band or crumbles. */
export const BOULDER_HIT_SPARKS = 7;
export const BOULDER_BREAK_CHIPS = 16;
/** The Take button ignores taps this long after it appears (GAME_DESIGN §15.2). */
export const TAKE_ARM_MS = 300;
/** A pick's cards ignore taps this long after the panel appears (GAME_DESIGN §15.5). */
export const PICK_ARM_MS = 400;
/** The Take button floats this many CSS pixels above the selected ball. */
export const TAKE_BUTTON_GAP = 10;
