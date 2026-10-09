/**
 * The jar's art (GAME_DESIGN §13): a glass jar in a square bamboo frame, standing on two bamboo
 * feet on a rug. World units of the stage jar (JAR_WIDTH × JAR_HEIGHT, origin at the centre of the
 * floor, y down); the game draws it once into two textures and scales them with the jar while it
 * grows. The frame hugs the physics walls: its inner edge is the jar's inner edge. Pure data, no
 * DOM.
 */
import { ellipsePath } from './catArt';
import { linePath, polygonPath, r2, roundRectPath } from './paintShape';
import type { PaintShape } from './paintShape';
import { JAR_HEIGHT, JAR_WIDTH } from './stages';

export const JAR_INK = '#5B3A2B';
const BAMBOO = '#E6C07A';
const BAMBOO_LIGHT = '#F8E3B2';
const BAMBOO_DARK = '#C99650';
const BAMBOO_NODE = '#D7A85E';
const BAMBOO_CAP = '#F4DBA6';
const BAMBOO_CAP_CORE = '#E2B977';
const TWINE = '#9C5F33';
const RAIL = '#D9B06C';
const RAIL_LIGHT = '#EED39C';

/** Thickness of the bamboo frame, outside the physics walls and floor. */
export const JAR_FRAME = 26;
/** The ink outline around the bamboo, each side. */
const OUTLINE = 5;
/** The posts reach this far above the rim; their cut tops are the caps. */
export const JAR_POST_RISE = 52;
/** The back rail across the top sits this far above the rim. */
const RAIL_RISE = 6;

/** The rug the jar stands on: top edge below the floor, depth, and its top and bottom widths. */
const RUG = { top: 8, depth: 112, topWidth: 712, bottomWidth: 808 } as const;
const RUG_COLORS = { border: '#C3CF9E', base: '#EEF0D9', stitch: '#A9B886', fringe: '#E9E3C6' };

/** Everything the jar draws lies in this box (world units around the floor's centre). */
export const JAR_ART_BOX = { left: -410, top: -JAR_HEIGHT - 70, right: 410, bottom: 140 } as const;

/** A part of the art box that gets its own texture. */
export interface JarPiece {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * The textures are cut into pieces that only cover drawn parts, so the jar's see-through middle
 * costs no fill rate (on a software renderer whole-jar textures took two thirds of each frame).
 * Behind the cats: the far rail and the feet. In front: the two posts and the bottom between
 * them, overlapping by 4 units so no seam shows.
 */
export const JAR_BACK_PIECES: readonly JarPiece[] = [
  { left: -336, top: -JAR_HEIGHT - 30, right: 336, bottom: -JAR_HEIGHT + 22 },
  { left: -250, top: 18, right: 250, bottom: 62 },
];
export const JAR_FRONT_PIECES: readonly JarPiece[] = [
  { left: -340, top: JAR_ART_BOX.top, right: -284, bottom: -4 },
  { left: 284, top: JAR_ART_BOX.top, right: 340, bottom: -4 },
  { left: -340, top: -8, right: 340, bottom: 40 },
];

/** The dashed danger line across the opening while safe (it turns red in danger). */
export const JAR_RIM_LINE = 0xa47c62;
export const JAR_RIM_LINE_ALPHA = 0.75;

const HALF = JAR_WIDTH / 2;
const RIM = -JAR_HEIGHT;
const T = JAR_FRAME;
/** Centre lines of the posts and of the bottom of the frame. */
const POST_X = HALF + T / 2;
const BOTTOM_Y = T / 2;
export const JAR_CAP_Y = RIM - JAR_POST_RISE;
/** Half-width and half-height of a post's cap. */
export const JAR_CAP_RX = T / 2 + 2.4;
export const JAR_CAP_RY = 7.2;
export const JAR_CAP_LINE = 4;

/** The jar's inside: walls and floor, open at the rim. Inset shrinks it. */
export function jarInsidePath(inset = 0): string {
  const a = r2(-HALF + inset);
  const b = r2(HALF - inset);
  const btm = r2(-inset);
  return `M${a} ${RIM}L${a} ${btm}L${b} ${btm}L${b} ${RIM}Z`;
}

/** The centre line of the bamboo frame: up the posts to their caps, square at the bottom. */
export function jarFramePath(): string {
  return (
    `M${-POST_X} ${JAR_CAP_Y}L${-POST_X} ${BOTTOM_Y}` +
    `L${POST_X} ${BOTTOM_Y}L${POST_X} ${JAR_CAP_Y}`
  );
}

function bamboo(d: string, t: number): PaintShape[] {
  return [
    { d, stroke: JAR_INK, width: t + 2 * OUTLINE, butt: true },
    { d, stroke: BAMBOO, width: t, butt: true },
    {
      d,
      stroke: BAMBOO_DARK,
      width: t * 0.24,
      butt: true,
      opacity: 0.8,
      dx: t * 0.27,
      dy: t * 0.22,
    },
    { d, stroke: BAMBOO_LIGHT, width: t * 0.26, butt: true, dx: -t * 0.2, dy: -t * 0.14 },
  ];
}

/** A node ring across a vertical post centred on x. */
function postNode(x: number, y: number, t: number): PaintShape[] {
  return [
    {
      d: roundRectPath(x - t / 2 - 3.2, y - 4.4, t + 6.4, 8.8, 4.4),
      fill: BAMBOO_NODE,
      stroke: JAR_INK,
      width: 3.6,
    },
    {
      d: `M${r2(x - t / 2 + 4)} ${r2(y + 9)}Q${r2(x)} ${r2(y + 12)} ${r2(x + t / 2 - 4)} ${r2(y + 9)}`,
      stroke: BAMBOO_DARK,
      width: 2.4,
    },
  ];
}

/** A node ring across a horizontal piece centred on y. */
function railNode(x: number, y: number, t: number): PaintShape {
  return {
    d: roundRectPath(x - 4.4, y - t / 2 - 3.2, 8.8, t + 6.4, 4.4),
    fill: BAMBOO_NODE,
    stroke: JAR_INK,
    width: 3.6,
  };
}

function twine(x: number, y: number): PaintShape {
  const a = r2(x - T / 2 - 2);
  const b = r2(x + T / 2 + 2);
  return {
    d: `M${a} ${y - 10}L${b} ${y + 2}M${a} ${y - 2}L${b} ${y + 10}M${a} ${y + 6}L${b} ${y + 18}`,
    stroke: TWINE,
    width: 4.4,
  };
}

function rug(): PaintShape[] {
  const { top, depth, topWidth, bottomWidth } = RUG;
  const half = (y: number, inset: number): number =>
    topWidth / 2 + ((bottomWidth - topWidth) / 2) * ((y - top) / depth) - inset;
  const quad = (inset: number, y0: number, y1: number): string =>
    polygonPath([
      [-half(y0, inset), y0],
      [half(y0, inset), y0],
      [half(y1, inset), y1],
      [-half(y1, inset), y1],
    ]);
  let fringe = '';
  const bottom = top + depth;
  for (let x = -bottomWidth / 2 + 12; x < bottomWidth / 2 - 8; x += 14) {
    fringe += `M${r2(x)} ${bottom}L${r2(x - 2)} ${bottom + 12}`;
  }
  return [
    { d: fringe, stroke: RUG_COLORS.fringe, width: 4.4 },
    { d: quad(0, top, bottom), fill: RUG_COLORS.border, stroke: JAR_INK, width: 4.8 },
    { d: quad(18, top + 8, bottom - 12), fill: RUG_COLORS.base },
    { d: quad(30, top + 14, bottom - 22), stroke: RUG_COLORS.stitch, width: 3.2, dash: [10, 8] },
  ];
}

/**
 * The glass and its shine are plain translucent shapes: the glass fills the jar's inside, a thin
 * line runs `lineInset` inside its edge, and the shine is a few soft streaks near the walls. The
 * glass doesn't move on screen either, so the DOM draws it, except while the jar grows (the
 * canvas draws it then); the shine is drawn by the canvas, over the cats.
 */
export const JAR_GLASS = { alpha: 0.3, lineInset: 10, lineWidth: 3.2, lineAlpha: 0.55 } as const;
export const JAR_SHINES: readonly {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly alpha: number;
}[] = [
  { x: -HALF + 18, y: RIM + 36, w: 14, h: 548, alpha: 0.32 },
  { x: -HALF + 40, y: RIM + 60, w: 5.2, h: 386, alpha: 0.3 },
  { x: HALF - 32, y: RIM + 211, w: 10, h: 351, alpha: 0.26 },
];

/**
 * The rug and the jar's shadow on it. They never move on screen (the floor doesn't), so the DOM
 * garden draws them (ui/scenery.ts) instead of the canvas.
 */
export function jarRugShapes(): PaintShape[] {
  return [
    ...rug(),
    {
      d: `M${-HALF - 52} 47A${HALF + 52} 18 0 1 0 ${HALF + 52} 47A${HALF + 52} 18 0 1 0 ${-HALF - 52} 47Z`,
      fill: '#7A4E2E',
      opacity: 0.2,
    },
  ];
}

/** The feet stand this far either side of the floor's centre. */
const FEET_X = 174;
/** The twine lashing at the bottom corners sits this far above the bottom's centre line. */
const BOTTOM_TWINE_RISE = 30;

/** Behind the cats: the feet and the far rail across the top. */
export function jarBackShapes(): PaintShape[] {
  const feet = [-FEET_X, FEET_X].flatMap((x): PaintShape[] => [
    {
      d: roundRectPath(x - T * 0.42, BOTTOM_Y + T / 2 - 4, T * 0.84, 34, 6),
      fill: BAMBOO,
      stroke: JAR_INK,
      width: 4.4,
    },
    {
      d: linePath(
        x - T * 0.42 + 4.4,
        BOTTOM_Y + T / 2 + 6,
        x - T * 0.42 + 4.4,
        BOTTOM_Y + T / 2 + 24,
      ),
      stroke: BAMBOO_LIGHT,
      width: 4,
    },
  ]);
  const railY = RIM - RAIL_RISE;
  const railT = T * 0.7;
  const rail = linePath(-POST_X, railY, POST_X, railY);
  return [
    ...feet,
    { d: rail, stroke: JAR_INK, width: railT + 8, butt: true },
    { d: rail, stroke: RAIL, width: railT, butt: true },
    {
      d: linePath(-POST_X, railY - 4, POST_X, railY - 4),
      stroke: RAIL_LIGHT,
      width: railT * 0.26,
      butt: true,
    },
    ...[-0.25, 0, 0.25].map((k) => railNode(k * JAR_WIDTH, railY, railT)),
  ];
}

/** In front of the cats: the bamboo frame with its nodes, ties and caps. */
export function jarFrontShapes(): PaintShape[] {
  const cap = (x: number): PaintShape[] => [
    {
      d: ellipsePath(x, JAR_CAP_Y, JAR_CAP_RX, JAR_CAP_RY),
      fill: BAMBOO_CAP,
      stroke: JAR_INK,
      width: JAR_CAP_LINE,
    },
    { d: ellipsePath(x, JAR_CAP_Y, T / 2 - 5.2, 3.2), fill: BAMBOO_CAP_CORE },
  ];
  return [
    ...bamboo(jarFramePath(), T),
    ...[0.23, 0.48, 0.73].flatMap((k) => {
      const y = RIM + JAR_HEIGHT * k;
      return [...postNode(-POST_X, y, T), ...postNode(POST_X, y, T)];
    }),
    railNode(-0.18 * JAR_WIDTH, BOTTOM_Y, T),
    railNode(0.18 * JAR_WIDTH, BOTTOM_Y, T),
    twine(-POST_X, RIM - RAIL_RISE),
    twine(POST_X, RIM - RAIL_RISE),
    twine(-POST_X, BOTTOM_Y - BOTTOM_TWINE_RISE),
    twine(POST_X, BOTTOM_Y - BOTTOM_TWINE_RISE),
    ...cap(-POST_X),
    ...cap(POST_X),
  ];
}

/** x of the post centres (the caps sit on top of them). */
export const JAR_POST_X = POST_X;
