import { describe, expect, it } from 'vitest';
import { CAT_SPRITE_DIR, CAT_SPRITES } from '../../src/config/catSprites';
import { PICK_IDS } from '../../src/config/picks';
import { DROP_SIZES } from '../../src/config/stages';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR } from '../../src/config/specialSprites';
import { pickArt } from '../../src/ui/pickArt';

describe("a pick card's icon is the game's own art (GAME_DESIGN §15.5)", () => {
  it('shows the ball each pick is about', () => {
    expect(pickArt('moreBoulders', 0).sprite).toBe(SPECIAL_ART.boulders[0]);
    expect(pickArt('bigBoulders', 2).sprite).toBe(SPECIAL_ART.boulders[0]);
    expect(pickArt('moreMagnets', 0).sprite).toBe(SPECIAL_ART.magnet);
    expect(pickArt('hanabi', 1).sprite).toBe(SPECIAL_ART.hanabi);
    expect(pickArt('joker', 0).sprite).toBe(SPECIAL_ART.joker);
    for (const id of ['moreBoulders', 'ironBands', 'moreMagnets', 'hanabi', 'joker'] as const) {
      expect(pickArt(id, 0).dir).toBe(SPECIAL_SPRITE_DIR);
    }
  });

  it('shows Iron Bands as the boulder the pick makes, one band more than now', () => {
    expect(pickArt('ironBands', 0).sprite).toBe(SPECIAL_ART.boulders[1]);
    expect(pickArt('ironBands', 1).sprite).toBe(SPECIAL_ART.boulders[2]);
    expect(pickArt('ironBands', 2).sprite).toBe(SPECIAL_ART.boulders[3]);
  });

  it('shows the biggest drop for Big Drops and a glowing cat for Golden Cats', () => {
    expect(pickArt('bigDrops', 0)).toEqual({
      dir: CAT_SPRITE_DIR,
      sprite: CAT_SPRITES[DROP_SIZES - 1],
      golden: false,
    });
    const golden = pickArt('goldenCats', 0);
    expect(golden.dir).toBe(CAT_SPRITE_DIR);
    expect(golden.golden).toBe(true);
  });

  it('has art for every pick', () => {
    for (const id of PICK_IDS) expect(pickArt(id, 0).sprite.file).toMatch(/\.webp$/);
  });
});
