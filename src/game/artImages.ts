/**
 * The raster art the canvas draws (GAME_DESIGN §13.1): the cats, the jar's two layers, the paw, the
 * special balls and the effects (Heavy Drop's flames, Porcelain's cracks and seams, the dice).
 * Boot loads and decodes them with the fonts (main.ts), before the game is created, with the
 * main menu's, the stage doors' and the Upgrades screen's images; the backgrounds are DOM images.
 * The loading screen (`preloadImages`) loads every other image too, so nothing pops in later.
 */
import { PRELOAD_TIMEOUT_MS } from '../config/platform';
import { CAT_ART_LOAD_TIMEOUT_MS, CAT_SPRITE_DIR, CAT_SPRITES } from '../config/catSprites';
import { DOOR_ART, DOOR_SPRITE_DIR } from '../config/doorSprites';
import { FX_ART, FX_SPRITE_DIR } from '../config/fxSprites';
import { HUD_BADGE_ART, HUD_SPRITE_DIR } from '../config/hudSprites';
import { ICON_SPRITE_DIR, iconSprites } from '../config/iconSprites';
import { MENU_SPRITE_DIR, menuSprites } from '../config/menuSprites';
import { PICK_SPRITE_DIR, pickPictures } from '../config/pickSprites';
import { LIGHTNING_SPRITE_DIR, lightningSprites } from '../config/lightningSprites';
import { JAR_ART, PAW_ART, SCENE_SPRITE_DIR } from '../config/sceneSprites';
import { SHOP_ART, SHOP_SPRITE_DIR } from '../config/shopSprites';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR } from '../config/specialSprites';

export interface ArtImages {
  /** The cat looks, in look order. */
  readonly cats: readonly HTMLImageElement[];
  readonly jarBack: HTMLImageElement;
  readonly jarFront: HTMLImageElement;
  readonly paw: HTMLImageElement;
  readonly specials: SpecialImages;
  readonly fx: FxImages;
}

/** The effect art (config/fxSprites.ts), in the order of FX_ART's lists. */
export interface FxImages {
  readonly flames: readonly HTMLImageElement[];
  readonly cracks: readonly HTMLImageElement[];
  readonly seams: readonly HTMLImageElement[];
  /** Dice's lucky and unlucky die, the cursed cat's stone patterns (Batch 19). */
  readonly dice: readonly HTMLImageElement[];
  readonly stones: readonly HTMLImageElement[];
  /**
   * The Lightning blessing's sheets (config/lightningSprites.ts, in the order of
   * `lightningSprites`), empty until they are in.
   */
  readonly lightning: readonly HTMLImageElement[];
}

/** The special balls' images (config/specialSprites.ts). */
export interface SpecialImages {
  readonly magnet: HTMLImageElement;
  readonly hanabi: HTMLImageElement;
  readonly joker: HTMLImageElement;
  /** Null until the owner's image comes (docs/ART_ASSETS.md §4.16). */
  readonly lightning: HTMLImageElement | null;
  /** With 0, 1, 2 and 3 iron bands. */
  readonly boulders: readonly HTMLImageElement[];
}

/**
 * Every image loaded so far, by URL, kept for the app's lifetime: held images stay in the
 * browser's memory cache, so an `<img>` or a CSS background with the same URL shows at once
 * instead of asking the service worker again and popping in (the coins, the Upgrades screen).
 */
const loaded = new Map<string, Promise<HTMLImageElement>>();

function image(url: string): Promise<HTMLImageElement> {
  let loading = loaded.get(url);
  if (!loading) {
    const img = new Image();
    img.src = url;
    loading = img.decode().then(() => img);
    loaded.set(url, loading);
  }
  return loading;
}

/**
 * Loads and decodes every image the game shows (`__PRELOAD_IMAGES__`, listed by vite.config.ts:
 * all of public/assets and the clips' posters), calling `onProgress` with the share done (0–1).
 * An image that fails or takes longer than PRELOAD_TIMEOUT_MS is skipped (the DOM loads it later).
 * `loadArt` then finds its images here.
 */
export async function preloadImages(
  baseUrl: string,
  onProgress: (done: number) => void,
): Promise<void> {
  const files = __PRELOAD_IMAGES__;
  let settled = 0;
  const loads = files.map((file) =>
    image(`${baseUrl}${file}`)
      .catch(() => undefined)
      .finally(() => onProgress(++settled / files.length)),
  );
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, PRELOAD_TIMEOUT_MS));
  await Promise.race([Promise.all(loads), timeout]);
}

/**
 * Loads and decodes every image. Rejects if one fails or they take longer than
 * CAT_ART_LOAD_TIMEOUT_MS (the caller then falls back to the vector art).
 */
export function loadArt(baseUrl: string): Promise<ArtImages> {
  const scene = (file: string): Promise<HTMLImageElement> =>
    image(`${baseUrl}${SCENE_SPRITE_DIR}${file}`);
  const special = (file: string): Promise<HTMLImageElement> =>
    image(`${baseUrl}${SPECIAL_SPRITE_DIR}${file}`);
  const specials = Promise.all([
    special(SPECIAL_ART.magnet.file),
    special(SPECIAL_ART.hanabi.file),
    special(SPECIAL_ART.joker.file),
    SPECIAL_ART.lightning ? special(SPECIAL_ART.lightning.file) : null,
    Promise.all(SPECIAL_ART.boulders.map(({ file }) => special(file))),
  ]).then(([magnet, hanabi, joker, lightning, boulders]) => ({
    magnet,
    hanabi,
    joker,
    lightning,
    boulders,
  }));
  const fxList = (list: readonly { file: string }[]): Promise<HTMLImageElement[]> =>
    Promise.all(list.map(({ file }) => image(`${baseUrl}${FX_SPRITE_DIR}${file}`)));
  const fx = Promise.all([
    fxList(FX_ART.flames),
    fxList(FX_ART.cracks),
    fxList(FX_ART.seams),
    fxList(FX_ART.dice),
    fxList(FX_ART.stones),
    Promise.all(
      lightningSprites().map(({ file }) => image(`${baseUrl}${LIGHTNING_SPRITE_DIR}${file}`)),
    ),
  ]).then(([flames, cracks, seams, dice, stones, lightning]) => ({
    flames,
    cracks,
    seams,
    dice,
    stones,
    lightning,
  }));
  const loads = Promise.all([
    Promise.all(CAT_SPRITES.map(({ file }) => image(`${baseUrl}${CAT_SPRITE_DIR}${file}`))),
    scene(JAR_ART.back),
    scene(JAR_ART.front),
    scene(PAW_ART.file),
    // The menu's pieces, so the first screen shows up whole (the DOM uses them by URL).
    Promise.all(menuSprites().map(({ file }) => image(`${baseUrl}${MENU_SPRITE_DIR}${file}`))),
    image(`${baseUrl}${HUD_SPRITE_DIR}${HUD_BADGE_ART.file}`),
    // The stage doors (DOM), so they shut whole at the first stage clear.
    Promise.all(
      [DOOR_ART.picture, DOOR_ART.panel].map(({ file }) =>
        image(`${baseUrl}${DOOR_SPRITE_DIR}${file}`),
      ),
    ),
    specials,
    fx,
    // The Upgrades screen's pieces and icons and the pick cards' pictures (DOM).
    Promise.all([
      ...Object.values(SHOP_ART).map(({ file }) => image(`${baseUrl}${SHOP_SPRITE_DIR}${file}`)),
      ...iconSprites().map(({ file }) => image(`${baseUrl}${ICON_SPRITE_DIR}${file}`)),
      ...pickPictures().map(({ file }) => image(`${baseUrl}${PICK_SPRITE_DIR}${file}`)),
    ]),
  ]).then(([cats, jarBack, jarFront, paw, , , , specials, fx]) => ({
    cats,
    jarBack,
    jarFront,
    paw,
    specials,
    fx,
  }));
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(() => reject(new Error('Art timed out')), CAT_ART_LOAD_TIMEOUT_MS),
  );
  return Promise.race([loads, timeout]);
}

/** A canvas copy of `img` (canvas textures can be refreshed after a WebGL context loss). */
export function imageCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')?.drawImage(img, 0, 0);
  return canvas;
}
