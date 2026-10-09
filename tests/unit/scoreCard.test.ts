import { describe, expect, it } from 'vitest';
import { HUD_NEXT_ART, HUD_SCORE_CARD_ART } from '../../src/config/hudSprites';
import { SCORE_CARD_HEIGHT, SCORE_WELL_PADDING, scoreCardLayout } from '../../src/ui/hud/scoreCard';

describe('score card art (GAME_DESIGN §13.1, v0.22)', () => {
  const art = HUD_SCORE_CARD_ART;

  it('measures a well inside the card and two slices that leave a plain middle', () => {
    expect(art.top).toBeLessThan(art.wellTop);
    expect(art.wellTop).toBeLessThan(art.wellBottom);
    expect(art.wellBottom).toBeLessThan(art.bottom);
    expect(art.bottom).toBeLessThanOrEqual(art.height);
    // The paw's arm covers the well's left end; the right end is round, near the card's edge.
    expect(art.wellLeft).toBeLessThan(art.sliceLeft);
    expect(art.wellRight).toBeGreaterThan(art.width - art.sliceRight);
    expect(art.sliceLeft + art.sliceRight).toBeLessThan(art.width * 0.6);
    // About 2.1 times as wide as tall, like the owner's reference.
    expect(art.width / art.height).toBeGreaterThan(1.8);
    expect(art.width / art.height).toBeLessThan(2.4);
  });

  it('draws the image at its own width with the score centred over the well', () => {
    const l = scoreCardLayout();
    const s = SCORE_CARD_HEIGHT / art.height;
    expect(l.height).toBe(SCORE_CARD_HEIGHT);
    expect(l.minWidth).toBeCloseTo(art.width * s, 9);
    // At the narrowest the score spans the well less its padding, across both slices.
    const content = l.minWidth - l.sliceLeft - l.sliceRight;
    const scoreLeft = l.sliceLeft + l.scoreMarginLeft;
    const scoreRight = l.sliceLeft + content - l.scoreMarginRight;
    expect(scoreLeft).toBeCloseTo(art.wellLeft * s + SCORE_WELL_PADDING, 9);
    expect(scoreRight).toBeCloseTo(art.wellRight * s - SCORE_WELL_PADDING, 9);
    expect(l.scoreMarginLeft).toBeLessThan(0);
    expect(l.scoreMarginRight).toBeLessThan(0);
    expect(l.wellHeight).toBeGreaterThan(24);
    expect(l.labelHeight).toBeGreaterThan(16);
    // "SCORE:" is centred on the card's body, which the paw sticks out of (v0.23.2).
    expect(art.cardLeft).toBeGreaterThan(0);
    expect(art.cardLeft).toBeLessThan(art.wellLeft);
    expect(art.cardRight).toBeGreaterThan(art.wellRight);
    expect(art.cardRight).toBeLessThanOrEqual(art.width);
    const centre = (l.labelLeft + l.minWidth - l.labelRight) / 2;
    expect(centre).toBeCloseTo(((art.cardLeft + art.cardRight) / 2) * s, 9);
  });

  it('has a round NEXT bubble with the label on the outline’s top', () => {
    expect(HUD_NEXT_ART.cx).toBe(0.5);
    expect(Math.abs(HUD_NEXT_ART.cy - 0.5)).toBeLessThan(0.02);
    expect(Math.abs(HUD_NEXT_ART.width / HUD_NEXT_ART.height - 1)).toBeLessThan(0.02);
    expect(HUD_NEXT_ART.tagY).toBeLessThan(0.06);
  });
});
