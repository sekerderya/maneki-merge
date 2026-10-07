import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HUD_BADGE_ART,
  HUD_COINS_ART,
  HUD_NEXT_ART,
  HUD_PAUSE_ART,
  HUD_SPRITE_DIR,
} from '../../src/config/hudSprites';

describe('HUD art sprites (GAME_DESIGN §13.1)', () => {
  it('ships every image', () => {
    for (const { file } of [HUD_BADGE_ART, HUD_COINS_ART, HUD_NEXT_ART, HUD_PAUSE_ART]) {
      expect(existsSync(`public/${HUD_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('leaves room for text after the coin, and a square paw badge', () => {
    const card = HUD_COINS_ART;
    expect(card.iconX).toBeLessThan(card.textLeft);
    expect(card.textRight - card.textLeft).toBeGreaterThan(0.5);
    expect(card.iconY).toBeGreaterThan(0.3);
    expect(card.iconY).toBeLessThan(0.7);
    expect(HUD_BADGE_ART.width).toBe(HUD_BADGE_ART.height);
  });

  it('measures the bubble’s circle under its tag', () => {
    expect(HUD_NEXT_ART.tagY).toBeLessThan(HUD_NEXT_ART.cy - 0.3);
    expect(HUD_NEXT_ART.r).toBeGreaterThan(0.4);
  });
});
