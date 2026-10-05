/**
 * Rendering and camera tunables (TECH_SPEC §4, §6). Lengths ending in `_RATIO` are fractions of
 * the current jar width, so every stage looks the same once the camera has zoomed out.
 */

/** Space shown left and right of the jar's inner walls, each side (includes the wall art). */
export const CAMERA_SIDE_MARGIN_RATIO = 0.05;
/** Space shown below the jar floor (includes the floor art). */
export const CAMERA_FLOOR_MARGIN_RATIO = 0.04;

/** Drawn thickness of the jar walls and floor, outside the physics walls. */
export const JAR_WALL_RATIO = 0.03;
/** Corner radius of the jar's bottom corners (drawn only). */
export const JAR_CORNER_RATIO = 0.04;
/** Thickness of the rim lip (the danger line) drawn on top of each wall. */
export const JAR_RIM_RATIO = 0.012;

/** The canvas renders at most this many device pixels per CSS pixel (TECH_SPEC §6). */
export const MAX_RENDER_RESOLUTION = 2.5;

/**
 * Placeholder textures are drawn at this many texture pixels per world unit for a tier's first
 * stage (a CSS zoom of about 1 at the resolution cap), so they are never upscaled on a phone or
 * tablet. A tier that first appears at a later stage is drawn smaller by that stage's scale.
 */
export const PLACEHOLDER_PX_PER_UNIT = 2.5;
/** Outline width of a placeholder cat, as a fraction of its radius. */
export const PLACEHOLDER_OUTLINE_RATIO = 0.07;
/** Width of the golden ring, as a fraction of the radius. */
export const PLACEHOLDER_GOLD_RING_RATIO = 0.13;
/** Font size of the tier number, as a fraction of the radius (one and two digits). */
export const NUMBER_HEIGHT_RATIO = 0.95;
export const NUMBER_HEIGHT_RATIO_TWO_DIGITS = 0.78;

/** Aim guide: line width and dash pattern in stage-1 world units (scaled by the stage). */
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
/** How far the floating score rises, in stage-1 world units. */
export const FLOAT_TEXT_RISE = 70;
/** Font size of the floating score, in stage-1 world units. */
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
/** Gold sparks along the rim when an expansion starts, in stage-1 units (scaled by the stage). */
export const EXPANSION_SPARKS = {
  count: 44,
  lifespanMs: { min: 650, max: 1100 },
  speed: { min: 260, max: 640 },
  gravity: 950,
  /** Spark size as a fraction of its 64 px texture. */
  scale: 0.5,
} as const;
/** Each frame of an expansion may spend this long drawing the next stage's cat textures. */
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
