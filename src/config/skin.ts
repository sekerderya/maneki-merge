/**
 * Placeholder art data (GAME_DESIGN §13.2, `?skin=placeholder`), read by PlaceholderSkin and the
 * placeholder DOM icons, and the colours of the danger flash, the aim guide and the texts over the
 * jar. The lucky-cat art lives in `catArt.ts`, the jar's in `jarArt.ts`, the paw's in `pawArt.ts`.
 */
import { STAGE_TIER_STEP } from './tiers';

/**
 * Body colour per size, index 0 is size 1. Neighbouring sizes differ in hue and lightness. The
 * colours repeat every STAGE_TIER_STEP tiers, so every stage looks the same.
 */
export const TIER_COLORS: readonly string[] = [
  '#9be7ff', // 1 light cyan
  '#7ed957', // 2 green
  '#ffe066', // 3 yellow
  '#ff8c1a', // 4 orange
  '#ff8fab', // 5 pink
  '#b197fc', // 6 lavender
  '#38d9a9', // 7 mint
  '#f06595', // 8 magenta
  '#4dabf7', // 9 blue
];

/** The body colour of a cat of `tier` (sprites and DOM icons alike). */
export function tierColor(tier: number): string {
  return TIER_COLORS[(tier - 1) % STAGE_TIER_STEP] ?? '#cccccc';
}

/** The outline is the body colour darkened by this fraction. */
export const OUTLINE_DARKEN = 0.38;

export const NUMBER_FILL = '#ffffff';
export const NUMBER_STROKE = '#3b1a10';
/** Stroke width of the tier number, as a fraction of its height. */
export const NUMBER_STROKE_RATIO = 0.16;

/** Danger (GAME_DESIGN §6): the rim's line and caps flash in this red. */
export const DANGER_RED = 0xd9483b;
/** The aim guide's dots and the ghost of the landing cat. */
export const AIM_LINE_COLOR = 0x8b6650;
export const AIM_LINE_ALPHA = 0.75;
/** The danger countdown over the jar. */
export const COUNTDOWN_FILL = '#d9483b';
export const COUNTDOWN_STROKE = '#fff8ee';
/** Floating "+coins" over the jar. */
export const COINS_TEXT_FILL = '#f2b83b';
export const COINS_TEXT_STROKE = '#4a2e25';

/**
 * The special balls (GAME_DESIGN §15), drawn in code and kept simple until the owner's art: the
 * magnet is a cream disc with a red horseshoe magnet, a boulder is grey stone with one iron band
 * per extra merge it needs, a golden cat has a gold glow behind it, a hanabi is a navy ball with a
 * firework burst and a fuse, and a joker is a white ball with a rainbow ring and a gold star.
 * Outlines follow the cats'
 * (CAT_OUTLINE_RATIO of the radius, at least CAT_OUTLINE_MIN).
 */
export const SPECIAL_INK = '#3b2620';
export const MAGNET_DISC = '#fff4e2';
export const MAGNET_RED = '#d9483b';
export const MAGNET_RED_DARK = '#a63c2c';
export const MAGNET_STEEL = '#d5dbe0';
export const BOULDER_STONE = '#9d968d';
export const BOULDER_LIGHT = '#bdb6ab';
export const BOULDER_DARK = '#746d65';
export const BOULDER_BAND = '#56606b';
export const BOULDER_BAND_LIGHT = '#8b97a3';
export const BOULDER_RIVET = '#e6eaee';
/** Chips and sparks: a boulder's colour, and a band's when one is knocked off. */
export const BOULDER_CHIPS = 0x8a837a;
export const BOULDER_SPARKS = 0xcfd8e0;
export const GOLDEN_GLOW = '#ffd34d';
export const HANABI_BALL = '#2f3d72';
export const HANABI_BURST = ['#ff5a4e', '#ffd34d', '#7fe0ff', '#ff9ad5'] as const;
export const HANABI_FUSE = '#8a5a3b';
/** A hanabi's blast: its sparks. */
export const HANABI_SPARKS = 0xffb347;
export const JOKER_BALL = '#fffaf2';
export const JOKER_RAINBOW = [
  '#ff5a4e',
  '#ffa63d',
  '#ffd34d',
  '#6fcf6a',
  '#58a8ff',
  '#a77bff',
] as const;
export const JOKER_STAR = '#f2b83b';
/** The magnet's selection ring round the chosen ball. */
export const SELECT_RING = 0xf2b83b;
