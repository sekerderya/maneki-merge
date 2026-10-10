import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SPECIAL_ART,
  SPECIAL_SPRITE_DIR,
  boulderSprite,
  specialSprites,
} from '../../src/config/specialSprites';

describe('special ball art (GAME_DESIGN §15, docs/ART_ASSETS.md phase 7)', () => {
  it('ships every image', () => {
    for (const { file } of specialSprites()) {
      expect(existsSync(`public/${SPECIAL_SPRITE_DIR}${file}`), file).toBe(true);
    }
  });

  it('fits each body circle inside its sprite, with room only for what sticks out', () => {
    for (const sprite of specialSprites()) {
      expect(sprite.radius, sprite.file).toBeGreaterThan(sprite.side / 4);
      expect(sprite.radius, sprite.file).toBeLessThanOrEqual(sprite.side / 2);
      expect(sprite.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('has a boulder for 0 to 3 iron bands, and clamps beyond them', () => {
    expect(SPECIAL_ART.boulders).toHaveLength(4);
    for (let bands = 0; bands < 4; bands++) {
      expect(boulderSprite(bands)).toBe(SPECIAL_ART.boulders[bands]);
    }
    expect(boulderSprite(-1)).toBe(SPECIAL_ART.boulders[0]);
    expect(boulderSprite(7)).toBe(SPECIAL_ART.boulders[3]);
  });
});
