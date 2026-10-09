/**
 * The score card's art (v0.22, config/hudSprites.ts) as CSS: a horizontal 3-slice `border-image`
 * (the paw on the left, the well's round end on the right, the plain middle stretching for long
 * scores), "SCORE:" over the well and the score in it. Pure math, unit-tested in Node.
 */
import { HUD_SCORE_CARD_ART } from '../../config/hudSprites';
import type { HudScoreCardSprite } from '../../config/hudSprites';

/** The card is drawn this many CSS pixels tall. */
export const SCORE_CARD_HEIGHT = 66;
/** The score keeps this far from the well's ends, CSS pixels. */
export const SCORE_WELL_PADDING = 4;

/** CSS pixels. Margins are for the score inside the card's content box (between the slices). */
export interface ScoreCardLayout {
  readonly height: number;
  /** The card at its narrowest: the image's own width. */
  readonly minWidth: number;
  readonly sliceLeft: number;
  readonly sliceRight: number;
  /** "SCORE:": from the card's top outline down to the well, centred on the card's body. */
  readonly labelTop: number;
  readonly labelHeight: number;
  readonly labelLeft: number;
  readonly labelRight: number;
  /** The score: the well, less its padding, reaching into both slices (negative margins). */
  readonly wellTop: number;
  readonly wellHeight: number;
  readonly scoreMarginLeft: number;
  readonly scoreMarginRight: number;
}

export function scoreCardLayout(
  art: HudScoreCardSprite = HUD_SCORE_CARD_ART,
  height = SCORE_CARD_HEIGHT,
): ScoreCardLayout {
  const s = height / art.height;
  const sliceLeft = art.sliceLeft * s;
  const sliceRight = art.sliceRight * s;
  const wellLeft = art.wellLeft * s;
  const wellRight = (art.width - art.wellRight) * s;
  return {
    height,
    minWidth: art.width * s,
    sliceLeft,
    sliceRight,
    labelTop: art.top * s,
    labelHeight: (art.wellTop - art.top) * s,
    // Like the owner's reference (v0.23.2): over the card's body, not just the well.
    labelLeft: art.cardLeft * s,
    labelRight: (art.width - art.cardRight) * s,
    wellTop: art.wellTop * s,
    wellHeight: (art.wellBottom - art.wellTop) * s,
    scoreMarginLeft: wellLeft + SCORE_WELL_PADDING - sliceLeft,
    scoreMarginRight: wellRight + SCORE_WELL_PADDING - sliceRight,
  };
}
