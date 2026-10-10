/**
 * The raster art the canvas draws (GAME_DESIGN §13.1): the cats, the jar's two layers, the paw and
 * the special balls.
 * Boot loads and decodes them with the fonts (main.ts), before the game is created, with the
 * main menu's and the stage doors' images; the backgrounds are DOM images.
 */
import { CAT_ART_LOAD_TIMEOUT_MS, CAT_SPRITE_DIR, CAT_SPRITES } from '../config/catSprites';
import { DOOR_ART, DOOR_SPRITE_DIR } from '../config/doorSprites';
import { HUD_BADGE_ART, HUD_SPRITE_DIR } from '../config/hudSprites';
import { MENU_SPRITE_DIR, menuSprites } from '../config/menuSprites';
import { JAR_ART, PAW_ART, SCENE_SPRITE_DIR } from '../config/sceneSprites';
import { SPECIAL_ART, SPECIAL_SPRITE_DIR } from '../config/specialSprites';

export interface ArtImages {
  /** The cat looks, in look order. */
  readonly cats: readonly HTMLImageElement[];
  readonly jarBack: HTMLImageElement;
  readonly jarFront: HTMLImageElement;
  readonly paw: HTMLImageElement;
  readonly specials: SpecialImages;
}

/** The special balls' images (config/specialSprites.ts). */
export interface SpecialImages {
  readonly magnet: HTMLImageElement;
  readonly hanabi: HTMLImageElement;
  readonly joker: HTMLImageElement;
  /** With 0, 1, 2 and 3 iron bands. */
  readonly boulders: readonly HTMLImageElement[];
}

async function image(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
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
    Promise.all(SPECIAL_ART.boulders.map(({ file }) => special(file))),
  ]).then(([magnet, hanabi, joker, boulders]) => ({ magnet, hanabi, joker, boulders }));
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
  ]).then(([cats, jarBack, jarFront, paw, , , , specials]) => ({
    cats,
    jarBack,
    jarFront,
    paw,
    specials,
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
