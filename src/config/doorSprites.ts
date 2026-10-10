/**
 * The stage doors' art (GAME_DESIGN §7.1, docs/ART_ASSETS.md phase 6): a picture the four doors
 * share and one empty door frame, prepared by tools/build-art.ts. The measured data is in
 * doorSpriteData.ts. Pure data.
 */
import { DOOR_SPRITE_DATA } from './doorSpriteData';

export interface DoorSprite {
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

export interface DoorSprites {
  /** The picture across the closed doors; each door shows a quarter of it. */
  readonly picture: DoorSprite;
  /**
   * One door's frame. Its middle is an open hole that starts this many pixels inside each edge:
   * the frame is a nine-slice whose sides stretch to the screen's height.
   */
  readonly panel: DoorSprite & {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

/** Where the sprites live, relative to the app's base URL. */
export const DOOR_SPRITE_DIR = 'assets/doors/';

export const DOOR_ART: DoorSprites = DOOR_SPRITE_DATA;
