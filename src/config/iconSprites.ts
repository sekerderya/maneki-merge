/**
 * The icon kit (docs/ART_ASSETS.md §5): round medallion icons by id (an upgrade's, a pick's, …),
 * made by tools/build-art.ts from the owner's images. Each sprite is a square centred on the
 * medallion's circle. Pure data, no DOM.
 */
import type { CatSprite } from './catSprites';
import { ICON_SPRITE_DATA } from './iconSpriteData';

/** Where the sprites live, relative to the app's base URL. */
export const ICON_SPRITE_DIR = 'assets/icons/';

/**
 * Ids whose cards show their ball instead of an icon (ui/pickArt.ts): the Katana's (v0.55.3, the
 * owner's call; its icon-kit icon from v0.55.0 is no longer shown).
 */
const BALL_CARDS: ReadonlySet<string> = new Set(['katana', 'quickKatana']);

/** The icon for `id`, or null when the art has none yet (the code-drawn icon stays). */
export function iconSprite(id: string): CatSprite | null {
  if (BALL_CARDS.has(id)) return null;
  return ICON_SPRITE_DATA[id] ?? null;
}

/** Every icon, for preloading. */
export function iconSprites(): CatSprite[] {
  return Object.values(ICON_SPRITE_DATA);
}
