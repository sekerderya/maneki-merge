import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HUD_BADGE_ART,
  HUD_COIN_ART,
  HUD_NEXT_ART,
  HUD_PAUSE_ART,
  HUD_SPRITE_DIR,
} from '../../src/config/hudSprites';

describe('HUD art sprites (GAME_DESIGN §13.1)', () => {
  it('ships every image', () => {
    for (const { file } of [HUD_BADGE_ART, HUD_COIN_ART, HUD_NEXT_ART, HUD_PAUSE_ART]) {
      expect(existsSync(`public/${HUD_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('cuts the coin and the paw badge as squares', () => {
    for (const sprite of [HUD_COIN_ART, HUD_BADGE_ART]) expect(sprite.width).toBe(sprite.height);
  });

  it('measures the bubble’s circle under its tag', () => {
    expect(HUD_NEXT_ART.tagY).toBeLessThan(HUD_NEXT_ART.cy - 0.3);
    expect(HUD_NEXT_ART.r).toBeGreaterThan(0.4);
  });
});
