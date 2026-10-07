/**
 * Placeholder art data (GAME_DESIGN §13.2, `?skin=placeholder`), read by PlaceholderSkin and the
 * placeholder DOM icons, and the colours of the danger flash, the aim guide and the texts over the
 * jar. The lucky-cat art lives in `catArt.ts`, the jar's in `jarArt.ts`, the paw's in `pawArt.ts`.
 */
import { STAGE_TIER_STEP } from './tiers';

/**
 * Body colour per size, index 0 is size 1. Neighbouring sizes differ in hue and lightness. The
 * colours repeat every STAGE_TIER_STEP tiers: a stage's last cat (size 10) has the colour of size
 * 1, because it becomes the next stage's first cat, and every stage looks the same.
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
