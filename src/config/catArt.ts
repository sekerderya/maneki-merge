/**
 * The lucky-cat art (GAME_DESIGN §13): nine looks, one per cat size, drawn as vector shapes in a
 * 100 × 100 box. The body is the circle of radius 47 around (50, 50) plus its outline, which the
 * game scales onto the physics circle (`bodyEdge`); the ears poke out above it, inside the box.
 *
 * Every shape is an SVG path, so the same data feeds the game's canvas textures (`Path2D`,
 * game/skins/CatSkin.ts) and the DOM icons (inline SVG, ui/catIcon.ts). Pure data, no DOM.
 *
 * One look per size, repeating every stage: a tier's look is the same at every stage (`catLook`).
 */
import { STAGE_TIER_STEP } from './tiers';

/** One filled and/or stroked path. Strokes have round caps and joins. */
export interface ArtShape {
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly width?: number;
  readonly opacity?: number;
}

/** Where the tier number sits: the centre of its plate (box units), font size and colours. */
export interface NumberPlate {
  readonly y: number;
  readonly size: number;
  readonly color: string;
  /** The plate's colour, used as a thin outline so a number that spills over stays readable. */
  readonly halo: string;
}

export interface CatLook {
  readonly name: string;
  /** The body's main colour: merge particles and the pop ring use it. */
  readonly color: string;
  readonly shapes: readonly ArtShape[];
  readonly number: NumberPlate;
}

/** The art's box: shapes stay inside [−ART_PAD, 100 + ART_PAD] (ears, outlines). */
export const ART_BOX = 100;
export const ART_PAD = 4;
/** The body circle's radius in box units; with its outline it reaches the box edge. */
export const ART_BODY_RADIUS = 47;
/** Two-digit numbers are drawn this much smaller, so they fit the plate. */
export const ART_TWO_DIGIT_SCALE = 0.86;

export const INK = '#4A2E25';
const WHITE = '#FFFFFF';
const CREAM = '#FFF1E0';
const GOLD = '#F2B83B';
const GOLD_DARK = '#C98A1B';
const NOSE = '#E8728B';

// ── Shape helpers ──────────────────────────────────────────────────────────

/** A circle as a path (two arcs). */
export function circlePath(cx: number, cy: number, r: number): string {
  return ellipsePath(cx, cy, r, r);
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
}

const ink = (d: string, width: number): ArtShape => ({ d, stroke: INK, width });

function ears(left: string, right: string, inner: string, width: number): ArtShape[] {
  return [
    { d: 'M11 40L9 4Q9.5 -0.5 14 1.5L42 13Z', fill: left, stroke: INK, width },
    { d: 'M89 40L91 4Q90.5 -0.5 86 1.5L58 13Z', fill: right, stroke: INK, width },
    { d: 'M15.5 32L13.5 8L35 16.5Z', fill: inner },
    { d: 'M84.5 32L86.5 8L65 16.5Z', fill: inner },
  ];
}

const body = (fill: string): ArtShape => ({ d: circlePath(50, 50, ART_BODY_RADIUS), fill });
const outline = (width: number): ArtShape => ink(circlePath(50, 50, ART_BODY_RADIUS), width);
const highlight = (width: number, opacity: number): ArtShape => ({
  d: 'M19 34Q22 22 33 16',
  stroke: WHITE,
  width,
  opacity,
});

function openEyes(y = 42, rx = 4.6, ry = 5.6, dx = 14): ArtShape[] {
  return [
    { d: ellipsePath(50 - dx, y, rx, ry), fill: INK },
    { d: ellipsePath(50 + dx, y, rx, ry), fill: INK },
    { d: circlePath(51.6 - dx, y - 2.2, 1.7), fill: WHITE },
    { d: circlePath(51.6 + dx, y - 2.2, 1.7), fill: WHITE },
  ];
}

/** Gold cat eyes with slit pupils, for the dark cats. */
function goldEyes(edge: string): ArtShape[] {
  return [
    { d: ellipsePath(36, 41, 5.5, 6.5), fill: '#F7C948', stroke: edge, width: 1.5 },
    { d: ellipsePath(64, 41, 5.5, 6.5), fill: '#F7C948', stroke: edge, width: 1.5 },
    { d: ellipsePath(36, 41.5, 1.8, 4.8), fill: edge },
    { d: ellipsePath(64, 41.5, 1.8, 4.8), fill: edge },
    { d: circlePath(37.8, 38.4, 1.4), fill: WHITE },
    { d: circlePath(65.8, 38.4, 1.4), fill: WHITE },
  ];
}

const closedEyes = (color: string, width: number, y = 44): ArtShape => ({
  d: `M29 ${y}Q35 ${y - 7} 41 ${y}M59 ${y}Q65 ${y - 7} 71 ${y}`,
  stroke: color,
  width,
});

const nose = (y = 48, edge = INK, width = 1.6): ArtShape => ({
  d: `M47.4 ${y}L52.6 ${y}L50 ${y + 3}Z`,
  fill: NOSE,
  stroke: edge,
  width,
});

const mouth = (color: string, width: number, y = 53): ArtShape => ({
  d: `M44.5 ${y}Q47.3 ${y + 4} 50 ${y + 0.5}Q52.7 ${y + 4} 55.5 ${y}`,
  stroke: color,
  width,
});

function cheeks(color: string, opacity: number, sides: 'both' | 'left' = 'both'): ArtShape[] {
  const left = { d: ellipsePath(25, 53, 6.5, 4), fill: color, opacity };
  return sides === 'both' ? [left, { ...left, d: ellipsePath(75, 53, 6.5, 4) }] : [left];
}

const whiskers = (color: string, width: number, sides: 'both' | 'left' = 'both'): ArtShape => ({
  d: 'M4 46L16 48M4 53L16 52' + (sides === 'both' ? 'M96 46L84 48M96 53L84 52' : ''),
  stroke: color,
  width,
});

/** A collar band from edge to edge, sagging towards the middle. */
const collar = (fill: string, width: number): ArtShape => ({
  d: 'M4.6 56Q50 72 95.4 56L94.9 62Q50 78 5.1 62Z',
  fill,
  stroke: INK,
  width,
});

function bell(y: number, r: number, fill: string, edge: string, width: number): ArtShape[] {
  return [
    { d: circlePath(50, y, r), fill, stroke: edge, width },
    {
      d: `M${50 - r * 0.86} ${y - 2}Q50 ${y + 0.2} ${50 + r * 0.86} ${y - 2}M50 ${y + 2.5}L50 ${y + r}`,
      stroke: edge,
      width: width * 0.72,
    },
  ];
}

/** The raised paw on the cat's right side (the viewer's right). */
function pawRight(fill: string, edge: string, pad: string, width: number): ArtShape[] {
  return [
    { d: 'M79 63Q75 44 81 35Q89 29 93 39Q95 51 91 63', fill, stroke: edge, width },
    { d: 'M84 35.5L84.8 39M88.6 33.8L88.9 37.4', stroke: edge, width: width * 0.65 },
    { d: ellipsePath(86.5, 46, 3.6, 3), fill: pad },
  ];
}

/** A gold koban (oval coin) with its inner rim. */
function koban(y: number, rx: number, ry: number, width: number): ArtShape[] {
  return [
    { d: ellipsePath(50, y, rx, ry), fill: GOLD, stroke: INK, width },
    { d: ellipsePath(50, y, rx * 0.72, ry * 0.74), stroke: GOLD_DARK, width: width * 0.62 },
  ];
}

// ── The nine looks (sizes 1–9) ──────────────────────────────────────────────────

export const CAT_LOOKS: readonly CatLook[] = [
  {
    name: 'Sakura',
    color: '#F8BFCB',
    shapes: [
      ...ears('#F8BFCB', '#F8BFCB', '#EF8FA6', 5),
      body('#F8BFCB'),
      { d: ellipsePath(50, 80, 21, 13), fill: '#FFE4EA' },
      ...cheeks('#EF8FA6', 0.8),
      closedEyes(INK, 4.2),
      mouth(INK, 4, 52),
      highlight(5, 0.55),
      outline(5),
    ],
    number: { y: 80, size: 22, color: INK, halo: '#FFE4EA' },
  },
  {
    name: 'Mint',
    color: '#8DD5C2',
    shapes: [
      ...ears('#8DD5C2', '#8DD5C2', '#F6A9B5', 4.4),
      body('#8DD5C2'),
      ...cheeks('#F59AA8', 0.75),
      ...openEyes(),
      nose(),
      mouth(INK, 3.2),
      {
        d: 'M24 61Q50 72 76 61Q75 90 50 93Q25 90 24 61Z',
        fill: '#D9483B',
        stroke: INK,
        width: 3.6,
      },
      ...[
        [33, 71],
        [67, 71],
        [36, 86],
        [64, 86],
      ].map(([x, y]) => ({ d: circlePath(x ?? 0, y ?? 0, 2.4), fill: '#FFF4F0' })),
      highlight(4.4, 0.55),
      outline(4.4),
    ],
    number: { y: 79.5, size: 19, color: WHITE, halo: '#D9483B' },
  },
  {
    name: 'Tangerine',
    color: '#F5A85E',
    shapes: [
      ...ears('#F5A85E', '#F5A85E', '#FBD3B6', 3.9),
      body('#F5A85E'),
      {
        d: 'M44 9L45.5 17M50 7L50 16M56 9L54.5 17M5 44L14 45.5M6 52L14 51.5M95 44L86 45.5M94 52L86 51.5',
        stroke: '#C8692A',
        width: 3.4,
      },
      ...cheeks('#EF7D63', 0.55),
      ...openEyes(),
      nose(),
      mouth(INK, 3),
      {
        d: 'M4.6 56Q50 74 95.4 56L94.9 64Q50 82 5.1 64Z',
        fill: '#4F7FC4',
        stroke: INK,
        width: 3.2,
      },
      { d: circlePath(50, 81, 12), fill: GOLD, stroke: INK, width: 3 },
      highlight(4, 0.5),
      outline(3.9),
    ],
    number: { y: 81, size: 15.5, color: INK, halo: GOLD },
  },
  {
    name: 'Lavender',
    color: '#B8A4E6',
    shapes: [
      ...ears('#B8A4E6', '#B8A4E6', '#F4B8CB', 3.5),
      body('#B8A4E6'),
      { d: ellipsePath(50, 87, 18, 9.5), fill: '#ECE4FA' },
      ...cheeks('#F29BB0', 0.65, 'left'),
      closedEyes(INK, 3),
      nose(48, INK, 1.5),
      mouth(INK, 2.8),
      whiskers(INK, 1.8, 'left'),
      collar('#6C50AE', 2.8),
      ...bell(72, 7, '#E4E7EF', INK, 2.4),
      ...pawRight('#B8A4E6', INK, '#F4B8CB', 3),
      highlight(3.8, 0.5),
      outline(3.5),
    ],
    number: { y: 88, size: 14, color: INK, halo: '#ECE4FA' },
  },
  {
    name: 'Sky',
    color: '#8CC4EF',
    shapes: [
      ...ears('#8CC4EF', '#8CC4EF', '#F5B3C3', 3.1),
      body('#8CC4EF'),
      ...cheeks('#F29BB0', 0.65),
      ...openEyes(),
      nose(48, INK, 1.5),
      mouth(INK, 2.8),
      whiskers(INK, 1.8),
      { d: 'M5.8 66A47 47 0 0 0 94.2 66Z', fill: '#4E8CCB', stroke: INK, width: 3 },
      {
        // Seigaiha waves on the belly band.
        d:
          'M12 78A6 6 0 0 1 24 78M24 78A6 6 0 0 1 36 78M64 78A6 6 0 0 1 76 78M76 78A6 6 0 0 1 88 78' +
          'M15 78A3 3 0 0 1 21 78M27 78A3 3 0 0 1 33 78M67 78A3 3 0 0 1 73 78M79 78A3 3 0 0 1 85 78' +
          'M25 90A5 5 0 0 1 35 90M65 90A5 5 0 0 1 75 90',
        stroke: WHITE,
        width: 2.2,
      },
      ...bell(63.5, 6, GOLD, INK, 2.2),
      { d: circlePath(50, 82, 12), fill: WHITE, stroke: INK, width: 2.6 },
      highlight(3.6, 0.5),
      outline(3.1),
    ],
    number: { y: 82, size: 15.5, color: INK, halo: WHITE },
  },
  {
    name: 'Calico',
    color: '#F2A04A',
    shapes: [
      ...ears('#F2A04A', '#3A3036', '#F49FB0', 2.8),
      body('#FFF8EE'),
      { d: 'M8 42Q10 18 32 8Q42 18 34 30Q22 34 8 42Z', fill: '#F2A04A' },
      { d: 'M92 40Q91 20 72 9Q62 16 68 28Q80 32 92 40Z', fill: '#3A3036' },
      ...cheeks('#F49FB0', 0.75, 'left'),
      closedEyes(INK, 2.6),
      nose(48, INK, 1.4),
      mouth(INK, 2.6),
      whiskers(INK, 1.6, 'left'),
      collar('#D9483B', 2.6),
      ...bell(72, 7.5, GOLD, INK, 2.4),
      ...pawRight('#FFF8EE', INK, '#F49FB0', 2.8),
      outline(2.8),
    ],
    number: { y: 88, size: 13, color: INK, halo: '#FFF8EE' },
  },
  {
    name: 'Matcha',
    color: '#A8CB74',
    shapes: [
      ...ears('#A8CB74', '#A8CB74', '#F4AFC0', 2.5),
      body('#A8CB74'),
      ...cheeks('#F29BB0', 0.6),
      ...openEyes(41, 4.4, 5.4),
      nose(47, INK, 1.4),
      mouth(INK, 2.4, 52),
      whiskers(INK, 1.5),
      collar('#F29BB0', 2.3),
      ...koban(79, 16, 17, 2.4),
      { d: ellipsePath(33, 80, 7, 6.5), fill: '#A8CB74', stroke: INK, width: 2.3 },
      { d: ellipsePath(67, 80, 7, 6.5), fill: '#A8CB74', stroke: INK, width: 2.3 },
      {
        d: 'M30.5 75.4L31 78M35 75L35.2 77.6M69.5 75.4L69 78M65 75L64.8 77.6',
        stroke: INK,
        width: 1.4,
      },
      highlight(3.2, 0.5),
      outline(2.5),
    ],
    number: { y: 79.5, size: 15, color: INK, halo: GOLD },
  },
  {
    name: 'Daruma',
    color: '#EC7A62',
    shapes: [
      ...ears('#EC7A62', '#EC7A62', '#FFD9C8', 2.2),
      body('#EC7A62'),
      { d: ellipsePath(50, 43, 29, 21), fill: '#FFF4E6', stroke: INK, width: 2.2 },
      ink('M31 31Q37 27 43 31M57 31Q63 27 69 31', 2.6),
      { d: ellipsePath(31, 51, 5, 3), fill: '#F29BB0', opacity: 0.75 },
      { d: ellipsePath(69, 51, 5, 3), fill: '#F29BB0', opacity: 0.75 },
      ...openEyes(41, 4.8, 5.8, 12),
      nose(47, INK, 1.3),
      mouth(INK, 2.3, 52),
      {
        d: 'M8 60Q18 72 32 64Q34 60 30 59M92 60Q82 72 68 64Q66 60 70 59M14 76Q20 82 28 79M86 76Q80 82 72 79',
        stroke: '#F7C65A',
        width: 3.2,
      },
      { d: circlePath(50, 80, 13), fill: GOLD, stroke: INK, width: 2.2 },
      { d: circlePath(50, 80, 9.5), stroke: GOLD_DARK, width: 1.4 },
      highlight(3, 0.45),
      outline(2.2),
    ],
    number: { y: 80, size: 15, color: INK, halo: GOLD },
  },
  {
    name: 'Indigo',
    color: '#4A5799',
    shapes: [
      ...ears('#4A5799', '#4A5799', '#E8A3B8', 2),
      body('#4A5799'),
      ...cheeks('#E8A3B8', 0.5),
      ...goldEyes('#2A1E1A'),
      nose(47.5, '#2A1E1A', 1.2),
      mouth(CREAM, 2.2, 52.5),
      whiskers(CREAM, 1.5),
      ...[
        [18, 58],
        [24.4, 62],
        [30.8, 65],
        [37.2, 67.2],
        [43.6, 68.6],
        [56.4, 68.6],
        [62.8, 67.2],
        [69.2, 65],
        [75.6, 62],
        [82, 58],
      ].map(([x, y]) => ({
        d: circlePath(x ?? 0, y ?? 0, 2.8),
        fill: GOLD,
        stroke: INK,
        width: 1.2,
      })),
      { d: circlePath(50, 69, 3), stroke: GOLD, width: 2 },
      ...koban(83, 12.5, 14, 2),
      highlight(2.8, 0.3),
      outline(2),
    ],
    number: { y: 83, size: 14.5, color: INK, halo: GOLD },
  },
];

/** The look of a cat of `tier`: the same at every stage, because looks repeat with the sizes. */
export function catLook(tier: number): CatLook {
  const index = (((tier - 1) % STAGE_TIER_STEP) + STAGE_TIER_STEP) % STAGE_TIER_STEP;
  return CAT_LOOKS[index] as CatLook;
}

/**
 * The body's outer edge in box units: the circle plus half its outline. The game scales each look
 * so this edge lands exactly on the physics radius, so touching cats touch on screen too.
 */
export function bodyEdge(look: CatLook): number {
  const body = circlePath(50, 50, ART_BODY_RADIUS);
  let width = 0;
  for (const shape of look.shapes) {
    if (shape.d === body && shape.stroke) width = shape.width ?? 0;
  }
  return ART_BODY_RADIUS + width / 2;
}

/** How far below the cat's centre its number sits, as a fraction of the radius. */
export function numberOffset(look: CatLook): number {
  return (look.number.y - 50) / bodyEdge(look);
}
