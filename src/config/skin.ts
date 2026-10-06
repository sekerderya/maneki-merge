/**
 * Placeholder art data (GAME_DESIGN §13.2, `?skin=placeholder`), read by PlaceholderSkin and the
 * placeholder DOM icons, and the colours of the jar and the texts over it. The lucky-cat art lives
 * in `catArt.ts`.
 */
import { STAGE_TIER_STEP } from './tiers';

/**
 * Body colour per size, index 0 is size 1. Neighbouring sizes differ in hue and lightness. The
 * colours repeat every STAGE_TIER_STEP tiers: a stage's last cat (size 11) has the colour of size
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
  '#f8f9fa', // 10 white
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

/**
 * The jar (GAME_DESIGN §13): a glass jar in a bamboo frame on a wooden floor, gold knobs on the
 * posts marking the rim, and the dashed danger line across the opening.
 */
export const JAR_INK = 0x4a2e25;
export const JAR_BAMBOO = 0xd8b66e;
export const JAR_BAMBOO_NODE = 0xb8924a;
export const JAR_GLASS = 0xfffdf8;
export const JAR_GLASS_ALPHA = 0.55;
export const JAR_SHEEN_ALPHA = 0.4;
export const JAR_FLOOR = 0xe7c79e;
export const JAR_FLOOR_LINE = 0xd6b184;
export const JAR_SHADOW_ALPHA = 0.12;
export const JAR_RIM = 0xf2b83b;
/** The danger line's opacity while safe (the flash shows it fully). */
export const JAR_RIM_LINE_ALPHA = 0.3;
export const DANGER_RED = 0xd9483b;
export const AIM_LINE_COLOR = 0x4a2e25;
export const AIM_LINE_ALPHA = 0.35;
/** The danger countdown over the jar. */
export const COUNTDOWN_FILL = '#d9483b';
export const COUNTDOWN_STROKE = '#fff8ee';
/** Floating "+coins" over the jar. */
export const COINS_TEXT_FILL = '#f2b83b';
export const COINS_TEXT_STROKE = '#4a2e25';
