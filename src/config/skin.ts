/**
 * Placeholder art data (GAME_DESIGN §13.1). The game's PlaceholderSkin and the DOM icons (HUD
 * preview, banners, Game Over) both read it, so a cat looks the same everywhere.
 */
import { STAGE_TIER_STEP } from './tiers';

/**
 * Body colour per size, index 0 is size 1. Neighbouring sizes differ in hue and lightness. The
 * colours repeat every STAGE_TIER_STEP tiers: a stage's last cat (size 12) has the colour of size
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
  '#a1724e', // 11 brown
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

export const GOLD_RING = '#f6c343';
export const GOLD_RING_DARK = '#a8691a';
export const GOLD_SHIMMER = '#fff4c2';

/** Jar (a simple rounded wooden box) and danger colours. */
export const JAR_WOOD = 0x9a6a3a;
export const JAR_WOOD_DARK = 0x5c3a1a;
export const JAR_INTERIOR = 0x2b0f0a;
export const JAR_INTERIOR_ALPHA = 0.32;
export const JAR_RIM = 0xf6c343;
export const DANGER_RED = 0xff3b30;
export const AIM_LINE_COLOR = 0xfff8ec;
export const AIM_LINE_ALPHA = 0.55;
