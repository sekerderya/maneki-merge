/**
 * Which piece of the game's own art a trial or blessing card shows as its icon (GAME_DESIGN §15.5,
 * the owner's call in v0.32.1): the ball the pick is about. Iron Bands shows the boulder as the
 * pick will make it, with one band more than now. A pick with a picture of its own (pickSprites.ts,
 * like More Boulders' heap of boulders) shows that instead. Pure data, no DOM, so it is unit-tested
 * in Node.
 */
import { CAT_SPRITE_DIR, CAT_SPRITES } from '../config/catSprites';
import type { CatSprite } from '../config/catSprites';
import { PICK_SPRITE_DIR, pickPicture } from '../config/pickSprites';
import { DROP_SIZES } from '../config/stages';
import type { PickId } from '../config/picks';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR, boulderSprite } from '../config/specialSprites';

export interface PickArt {
  /** The image, relative to the app's base URL. */
  readonly path: string;
  /** Its width as a share of the medallion's. */
  readonly width: number;
  /** A golden cat: it glows. */
  readonly golden: boolean;
}

/** A ball's body fills this share of its medallion's width. */
export const PICK_BALL_SHARE = 0.62;
/** A picture fits in a square of this share of its medallion's width. */
export const PICK_PICTURE_SHARE = 0.72;

/** The art for a card of `id` whose level is `level` now. */
export function pickArt(id: PickId, level: number): PickArt {
  const picture = pickPicture(id);
  if (picture) {
    const narrow = Math.min(1, picture.width / picture.height);
    return {
      path: `${PICK_SPRITE_DIR}${picture.file}`,
      width: PICK_PICTURE_SHARE * narrow,
      golden: false,
    };
  }
  const ball = (dir: string, sprite: CatSprite, golden = false): PickArt => ({
    path: `${dir}${sprite.file}`,
    width: (PICK_BALL_SHARE * sprite.side) / (2 * sprite.radius),
    golden,
  });
  const special = (sprite: CatSprite): PickArt => ball(SPECIAL_SPRITE_DIR, sprite);
  const cat = (size: number, golden: boolean): PickArt => {
    const sprite = CAT_SPRITES[size - 1];
    if (!sprite) throw new RangeError(`No cat art for size ${size}`);
    return ball(CAT_SPRITE_DIR, sprite, golden);
  };
  switch (id) {
    case 'moreBoulders':
    case 'bigBoulders':
      return special(boulderSprite(0));
    // A boulder has one band per Iron Bands level: the pick adds one.
    case 'ironBands':
      return special(boulderSprite(level + 1));
    case 'moreMagnets':
      return special(SPECIAL_ART.magnet);
    case 'hanabi':
      return special(SPECIAL_ART.hanabi);
    case 'joker':
      return special(SPECIAL_ART.joker);
    // The biggest cat the paw drops.
    case 'bigDrops':
      return cat(DROP_SIZES, false);
    case 'goldenCats':
      return cat(1, true);
    // Until their own pictures come (docs/ART_ASSETS.md §4.12): the cat each is about.
    case 'wind':
    case 'porcelain':
    case 'hubris':
      return cat(1, false);
    case 'heavyDrop':
      return cat(2, false);
    case 'echo':
      return cat(4, false);
  }
}
