/**
 * The icon kit (docs/ART_ASSETS.md §5): round medallion icons by id (an upgrade's, a pick's, …),
 * made by tools/build-art.ts from the owner's images. Each sprite is a square centred on the
 * medallion's circle. Pure data, no DOM.
 */
import type { CatSprite } from './catSprites';
import { ICON_SPRITE_DATA } from './iconSpriteData';

/** Where the sprites live, relative to the app's base URL. */
export const ICON_SPRITE_DIR = 'assets/icons/';

/** The icon for `id`, or null when the art has none yet (the code-drawn icon stays). */
export function iconSprite(id: string): CatSprite | null {
  return ICON_SPRITE_DATA[id] ?? null;
}

/** Every icon, for preloading. */
export function iconSprites(): CatSprite[] {
  return Object.values(ICON_SPRITE_DATA);
}
