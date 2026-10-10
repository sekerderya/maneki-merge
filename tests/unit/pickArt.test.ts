import { describe, expect, it } from 'vitest';
import { CAT_SPRITE_DIR, CAT_SPRITES } from '../../src/config/catSprites';
import { PICK_IDS } from '../../src/config/picks';
import { PICK_SPRITE_DIR, pickPicture } from '../../src/config/pickSprites';
import { DROP_SIZES } from '../../src/config/stages';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR } from '../../src/config/specialSprites';
import { PICK_BALL_SHARE, PICK_PICTURE_SHARE, pickArt } from '../../src/ui/pickArt';

const special = (sprite: { file: string }): string => `${SPECIAL_SPRITE_DIR}${sprite.file}`;

describe("a pick card's icon is the game's own art (GAME_DESIGN §15.5)", () => {
  it('shows the ball each pick is about, its body the same share of every medallion', () => {
    expect(pickArt('bigBoulders', 2).path).toBe(
      pickPicture('bigBoulders')
        ? `${PICK_SPRITE_DIR}bigBoulders.webp`
        : special(SPECIAL_ART.boulders[0] ?? { file: '' }),
    );
    expect(pickArt('moreMagnets', 0).path).toBe(special(SPECIAL_ART.magnet));
    expect(pickArt('hanabi', 1).path).toBe(special(SPECIAL_ART.hanabi));
    expect(pickArt('joker', 0).path).toBe(special(SPECIAL_ART.joker));
    const { side, radius } = SPECIAL_ART.joker;
    expect(pickArt('joker', 0).width * 2 * radius).toBeCloseTo(PICK_BALL_SHARE * side);
  });

  it('shows Iron Bands as the boulder the pick makes, one band more than now', () => {
    expect(pickArt('ironBands', 0).path).toBe(special(SPECIAL_ART.boulders[1] ?? { file: '' }));
    expect(pickArt('ironBands', 1).path).toBe(special(SPECIAL_ART.boulders[2] ?? { file: '' }));
    expect(pickArt('ironBands', 2).path).toBe(special(SPECIAL_ART.boulders[3] ?? { file: '' }));
  });

  it('shows the biggest drop for Big Drops and a glowing cat for Golden Cats', () => {
    expect(pickArt('bigDrops', 0).path).toBe(
      `${CAT_SPRITE_DIR}${CAT_SPRITES[DROP_SIZES - 1]?.file}`,
    );
    expect(pickArt('bigDrops', 0).golden).toBe(false);
    const golden = pickArt('goldenCats', 0);
    expect(golden.path.startsWith(CAT_SPRITE_DIR)).toBe(true);
    expect(golden.golden).toBe(true);
  });

  it("shows a pick's own picture when it has one, fitted in the medallion", () => {
    const heap = pickPicture('moreBoulders');
    expect(heap).not.toBeNull();
    const art = pickArt('moreBoulders', 0);
    expect(art.path).toBe(`${PICK_SPRITE_DIR}${heap?.file}`);
    expect(art.width).toBeLessThanOrEqual(PICK_PICTURE_SHARE);
    expect(art.width).toBeGreaterThan(PICK_PICTURE_SHARE / 2);
  });

  it('has art for every pick', () => {
    for (const id of PICK_IDS) expect(pickArt(id, 0).path).toMatch(/.webp$/);
  });
});
