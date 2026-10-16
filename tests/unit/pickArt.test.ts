import { describe, expect, it } from 'vitest';
import { CAT_SPRITE_DIR, CAT_SPRITES } from '../../src/config/catSprites';
import { iconSprite } from '../../src/config/iconSprites';
import { PICK_IDS } from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { PICK_SPRITE_DIR, pickPicture } from '../../src/config/pickSprites';
import { DROP_SIZES } from '../../src/config/stages';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR } from '../../src/config/specialSprites';
import { PICK_BALL_SHARE, PICK_PICTURE_SHARE, pickArt } from '../../src/ui/pickArt';
import type { PickArt } from '../../src/ui/pickArt';

/** The Katana's upgrades with icon-kit icons, not a ball (GAME_DESIGN §15.16). */
const KATANA_ICONS: readonly PickId[] = ['moreBlades', 'wideBlade'];

const special = (sprite: { file: string }): string => `${SPECIAL_SPRITE_DIR}${sprite.file}`;

/** A card that has its art. */
function artOf(id: PickId, level: number): PickArt {
  const art = pickArt(id, level);
  if (!art) throw new Error(`No art for ${id}`);
  return art;
}

describe("a pick card's icon is the game's own art (GAME_DESIGN §15.5)", () => {
  it('shows the ball each pick is about, its body the same share of every medallion', () => {
    expect(artOf('bigBoulders', 2).path).toBe(
      pickPicture('bigBoulders')
        ? `${PICK_SPRITE_DIR}bigBoulders.webp`
        : special(SPECIAL_ART.boulders[0] ?? { file: '' }),
    );
    expect(artOf('moreMagnets', 0).path).toBe(special(SPECIAL_ART.magnet));
    expect(artOf('hanabi', 1).path).toBe(special(SPECIAL_ART.hanabi));
    expect(artOf('joker', 0).path).toBe(special(SPECIAL_ART.joker));
    const { side, radius } = SPECIAL_ART.joker;
    expect(artOf('joker', 0).width * 2 * radius).toBeCloseTo(PICK_BALL_SHARE * side);
  });

  it('shows Iron Bands as the boulder the pick makes, one band more than now', () => {
    expect(artOf('ironBands', 0).path).toBe(special(SPECIAL_ART.boulders[1] ?? { file: '' }));
    expect(artOf('ironBands', 1).path).toBe(special(SPECIAL_ART.boulders[2] ?? { file: '' }));
    expect(artOf('ironBands', 2).path).toBe(special(SPECIAL_ART.boulders[3] ?? { file: '' }));
  });

  it('shows the biggest drop for Big Drops and a glowing cat for Golden Cats', () => {
    expect(artOf('bigDrops', 0).path).toBe(`${CAT_SPRITE_DIR}${CAT_SPRITES[DROP_SIZES - 1]?.file}`);
    expect(artOf('bigDrops', 0).golden).toBe(false);
    const golden = artOf('goldenCats', 0);
    expect(golden.path.startsWith(CAT_SPRITE_DIR)).toBe(true);
    expect(golden.golden).toBe(true);
  });

  it("shows a pick's own picture when it has one, fitted in the medallion", () => {
    const heap = pickPicture('moreBoulders');
    expect(heap).not.toBeNull();
    const art = artOf('moreBoulders', 0);
    expect(art.path).toBe(`${PICK_SPRITE_DIR}${heap?.file}`);
    expect(art.width).toBeLessThanOrEqual(PICK_PICTURE_SHARE);
    expect(art.width).toBeGreaterThan(PICK_PICTURE_SHARE / 2);
    expect(art.picture).toBe(true);
  });

  it('marks a ball as no picture, so a card never turns a cat round', () => {
    expect(artOf('goldenCats', 0).picture).toBe(false);
    // Batch 18's picks show their cat until the owner's pictures come.
    if (!pickPicture('wind')) expect(artOf('wind', 0).picture).toBe(false);
  });

  it("has art for every pick, but the lightning ball's until its image comes", () => {
    for (const id of PICK_IDS) {
      if (KATANA_ICONS.includes(id)) continue;
      if (id === 'lightning' && !SPECIAL_ART.lightning) expect(pickArt(id, 0)).toBeNull();
      else expect(artOf(id, 0).path).toMatch(/.webp$/);
    }
  });

  it('shows the katana ball for the Katana, its family picture for Quick Katana, icons for the other two', () => {
    for (const id of ['katana', 'quickKatana'] as const) expect(iconSprite(id)).toBeNull();
    expect(artOf('katana', 0).path).toBe(`${SPECIAL_SPRITE_DIR}katana-ball.webp`);
    // The ball with an hourglass (docs/ART_ASSETS.md §4.21, picture 8).
    expect(artOf('quickKatana', 0).path).toBe(`${PICK_SPRITE_DIR}quickKatana.webp`);
    expect(artOf('quickKatana', 0).picture).toBe(true);
    for (const id of KATANA_ICONS) expect(pickArt(id, 0)).toBeNull();
    expect(iconSprite('moreBlades')?.file).toBe('moreBlades.webp');
    expect(iconSprite('wideBlade')?.file).toBe('wideBlade.webp');
  });
});
