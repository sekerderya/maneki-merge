/**
 * The loading screen's bar (GAME_DESIGN §2.0, docs/ART_ASSETS.md §4.17): the owner's long score
 * card with an empty caramel well, and the gold that fills the well as the game loads. The data
 * comes from tools/buildLoading.ts (`npm run art`).
 */
import { LOADING_BAR_SPRITE, LOADING_FILL_SPRITE } from './loadingSpriteData';

/** A three-slice strip: `left` and `right` source pixels stay whole, the middle stretches. */
export interface LoadingBarSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
}

/** The gold, a strip whose caps match the bar's columns, placed at `x`, `y` on the bar. */
export interface LoadingFillSprite extends LoadingBarSprite {
  readonly x: number;
  readonly y: number;
}

/** Where the sprites live, relative to the app's base URL. */
export const LOADING_SPRITE_DIR = 'assets/loading/';

export const LOADING_BAR_ART: LoadingBarSprite = LOADING_BAR_SPRITE;
export const LOADING_FILL_ART: LoadingFillSprite = LOADING_FILL_SPRITE;
