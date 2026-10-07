import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAT_SPRITE_DIR, CAT_SPRITES, catSprite } from '../../src/config/catSprites';
import { STAGES } from '../../src/config/stages';
import { SIZE_COUNT, STAGE_TIER_STEP } from '../../src/config/tiers';

const HEX = /^#[0-9a-f]{6}$/i;

describe('cat art sprites (GAME_DESIGN §13.1)', () => {
  it('has one sprite per look, and size 10 wears size 1’s at every stage', () => {
    expect(CAT_SPRITES).toHaveLength(STAGE_TIER_STEP);
    expect(new Set(CAT_SPRITES.map((s) => s.file)).size).toBe(CAT_SPRITES.length);
    for (const { stage, firstTier } of STAGES) {
      for (let size = 1; size <= SIZE_COUNT; size++) {
        const sprite = catSprite(firstTier + size - 1);
        expect(sprite, `stage ${stage} size ${size}`).toBe(
          CAT_SPRITES[(size - 1) % STAGE_TIER_STEP],
        );
      }
    }
  });

  it('ships every sprite with a body circle inside it and valid colours', () => {
    for (const sprite of CAT_SPRITES) {
      expect(existsSync(`public/${CAT_SPRITE_DIR}${sprite.file}`), sprite.file).toBe(true);
      expect(sprite.radius).toBeGreaterThan(sprite.side * 0.35);
      expect(sprite.radius).toBeLessThanOrEqual(sprite.side / 2);
      expect(sprite.color).toMatch(HEX);
    }
  });

  it('rejects tiers it has no look for', () => {
    expect(() => catSprite(Number.NaN)).toThrow(RangeError);
  });
});
