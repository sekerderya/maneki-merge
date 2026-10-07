/**
 * The raster art the canvas draws (GAME_DESIGN §13.1): the cats, the jar's two layers and the paw.
 * Boot loads and decodes them with the fonts (main.ts), before the game is created; the
 * background is a DOM image and loads by itself.
 */
import { CAT_ART_LOAD_TIMEOUT_MS, CAT_SPRITE_DIR, CAT_SPRITES } from '../config/catSprites';
import { JAR_ART, PAW_ART, SCENE_SPRITE_DIR } from '../config/sceneSprites';

export interface ArtImages {
  /** The cat looks, in look order. */
  readonly cats: readonly HTMLImageElement[];
  readonly jarBack: HTMLImageElement;
  readonly jarFront: HTMLImageElement;
  readonly paw: HTMLImageElement;
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
  const loads = Promise.all([
    Promise.all(CAT_SPRITES.map(({ file }) => image(`${baseUrl}${CAT_SPRITE_DIR}${file}`))),
    scene(JAR_ART.back),
    scene(JAR_ART.front),
    scene(PAW_ART.file),
  ]).then(([cats, jarBack, jarFront, paw]) => ({ cats, jarBack, jarFront, paw }));
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
