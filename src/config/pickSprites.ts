/**
 * The pick cards' own pictures (GAME_DESIGN §15.5, docs/ART_ASSETS.md §4.9), for the picks that a
 * single ball doesn't show well (More Boulders: a heap of boulders), made by tools/build-art.ts.
 * Pure data, no DOM.
 */
import { PICK_SPRITE_DATA } from './pickSpriteData';

export interface PickPicture {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

/** Where the pictures live, relative to the app's base URL. */
export const PICK_SPRITE_DIR = 'assets/picks/';

/** The picture for a pick, or null when it has none (its card shows its ball). */
export function pickPicture(id: string): PickPicture | null {
  return PICK_SPRITE_DATA[id] ?? null;
}

/** Every picture, for preloading. */
export function pickPictures(): PickPicture[] {
  return Object.values(PICK_SPRITE_DATA);
}
