import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HUD_COINS_ART,
  HUD_NEXT_ART,
  HUD_PAUSE_ART,
  HUD_SCORE_ART,
  HUD_SPRITE_DIR,
} from '../../src/config/hudSprites';

describe('HUD art sprites (GAME_DESIGN §13.1)', () => {
  it('ships every image', () => {
    for (const { file } of [HUD_SCORE_ART, HUD_COINS_ART, HUD_NEXT_ART, HUD_PAUSE_ART]) {
      expect(existsSync(`public/${HUD_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('gives both cards the same panel, with room for text after the icon', () => {
    expect([HUD_SCORE_ART.width, HUD_SCORE_ART.height]).toEqual([
      HUD_COINS_ART.width,
      HUD_COINS_ART.height,
    ]);
    for (const card of [HUD_SCORE_ART, HUD_COINS_ART]) {
      expect(card.iconX).toBeLessThan(card.textLeft);
      expect(card.textRight - card.textLeft).toBeGreaterThan(0.5);
      expect(card.iconY).toBeGreaterThan(0.3);
      expect(card.iconY).toBeLessThan(0.7);
    }
  });

  it('measures the bubble’s circle under its tag', () => {
    expect(HUD_NEXT_ART.tagY).toBeLessThan(HUD_NEXT_ART.cy - 0.3);
    expect(HUD_NEXT_ART.r).toBeGreaterThan(0.4);
  });
});
