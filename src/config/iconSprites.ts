/**
 * The icon kit (docs/ART_ASSETS.md §5): round medallion icons by id (an upgrade's, a pick's, …),
 * made by tools/build-art.ts from the owner's images. Each sprite is a square centred on the
 * medallion's circle. Pure data, no DOM.
 */
import type { CatSprite } from './catSprites';
import { ICON_SPRITE_DATA } from './iconSpriteData';
import { pickPicture } from './pickSprites';

/** Where the sprites live, relative to the app's base URL. */
export const ICON_SPRITE_DIR = 'assets/icons/';

/**
 * Ids whose cards show their ball instead of an icon (ui/pickArt.ts): the Katana's (v0.55.3, the
 * owner's call; its icon-kit icon from v0.55.0 is no longer shown).
 */
const BALL_CARDS: ReadonlySet<string> = new Set(['katana', 'quickKatana']);

/**
 * True when `id`'s icon shows: not on a ball card, nor on a pick whose own picture has come
 * (the Katana family's, docs/ART_ASSETS.md §4.21, replace their icons one by one).
 */
const shown = (id: string): boolean => !BALL_CARDS.has(id) && !pickPicture(id);

/** The icon for `id`, or null when the art has none yet (the code-drawn icon stays). */
export function iconSprite(id: string): CatSprite | null {
  return shown(id) ? (ICON_SPRITE_DATA[id] ?? null) : null;
}

/** Every icon that shows, for preloading. */
export function iconSprites(): CatSprite[] {
  return Object.entries(ICON_SPRITE_DATA)
    .filter(([id]) => shown(id))
    .map(([, sprite]) => sprite);
}
