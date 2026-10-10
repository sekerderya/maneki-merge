/**
 * The growth clouds (GAME_DESIGN §7.1): when the jar grows, the owner's clouds well up from below
 * the play area and cover it, `onCovered` swaps the background behind them, and they part to the
 * left and right, the middle first. Every cloud runs one Web Animation for the whole transition,
 * so pausing pauses it all. With reduced motion they only fade in and out where they stand.
 */
import { CLOUD_SPRITE_DIR, CLOUD_SPRITES } from '../../config/cloudSprites';
import {
  CLOUD_PART_DISTANCE,
  CLOUD_PART_GROW,
  CLOUD_PART_MS,
  CLOUD_PART_RISE,
  CLOUD_RISE_MS,
} from '../../config/view';
import { reducedMotion } from '../../platform';
import { el } from '../dom';
import { CLOUDS_COVER_MS, CLOUDS_PART_MS, CLOUDS_TOTAL_MS, cloudLayout } from './cloudLayout';

/** Rising slows down as the clouds arrive; parting speeds up as they leave. */
const RISE_EASING = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
const PART_EASING = 'cubic-bezier(0.5, 0, 0.75, 0.5)';
/** A parting cloud is fully there until this share of its way, then fades out. */
const PART_FADE_FROM = 0.55;

export interface GrowthCloudsView {
  /** Plays the clouds over the play area; `onCovered` runs once they cover it. */
  play(onCovered: () => void): void;
  /** Freezes the clouds where they are while the run is paused. */
  setPaused(paused: boolean): void;
  /** Ends the clouds at once (a new run, a restored one). */
  clear(): void;
}

export function createGrowthClouds(root: HTMLElement): GrowthCloudsView {
  const layer = el('div', 'growth-clouds');
  layer.hidden = true;
  root.append(layer);
  const urls = CLOUD_SPRITES.map((s) => `${import.meta.env.BASE_URL}${CLOUD_SPRITE_DIR}${s.file}`);
  // They load ahead, so the first growth never shows a cloud missing.
  for (const url of urls) new Image().src = url;
  let animations: Animation[] = [];
  let paused = false;

  const clear = (): void => {
    const running = animations;
    animations = [];
    for (const animation of running) animation.cancel();
    layer.replaceChildren();
    layer.hidden = true;
  };
  const at = (ms: number): number => Math.min(1, Math.max(0, ms / CLOUDS_TOTAL_MS));

  return {
    play(onCovered) {
      clear();
      const width = root.clientWidth;
      const height = root.clientHeight;
      const places = cloudLayout(width, height);
      if (places.length === 0) {
        onCovered();
        return;
      }
      const still = reducedMotion();
      layer.hidden = false;
      // A cream wash under the clouds at the moment they cover everything, so no gap shows the
      // background changing.
      const wash = el('div', 'growth-clouds-wash');
      layer.append(wash);
      const timing = { duration: CLOUDS_TOTAL_MS, fill: 'both' as const };
      animations.push(
        wash.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: at(CLOUD_RISE_MS) },
            { opacity: 1, offset: at(CLOUDS_COVER_MS) },
            { opacity: 1, offset: at(CLOUDS_PART_MS) },
            { opacity: 0, offset: at(CLOUDS_PART_MS + CLOUD_PART_MS / 3) },
            { opacity: 0, offset: 1 },
          ],
          timing,
        ),
      );
      for (const place of places) {
        const image = el('img', 'growth-cloud');
        image.src = urls[place.sprite] ?? '';
        image.alt = '';
        image.draggable = false;
        const s = image.style;
        s.left = `${place.x - place.width / 2}px`;
        s.top = `${place.y - place.height / 2}px`;
        s.width = `${place.width}px`;
        s.height = `${place.height}px`;
        layer.append(image);
        const riseStart = place.riseDelayMs;
        const riseEnd = riseStart + CLOUD_RISE_MS;
        const partStart = CLOUDS_PART_MS + place.partDelayMs;
        const partEnd = partStart + CLOUD_PART_MS;
        const fadeFrom = partStart + PART_FADE_FROM * CLOUD_PART_MS;
        let frames: Keyframe[];
        if (still) {
          frames = [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: at(riseStart) },
            { opacity: 1, offset: at(riseEnd) },
            { opacity: 1, offset: at(partStart) },
            { opacity: 0, offset: at(partEnd) },
            { opacity: 0, offset: 1 },
          ];
        } else {
          // The wall rises as one, each cloud by the play area's height plus its own.
          const below = `translate(0px, ${height + place.height}px)`;
          const away = place.side * (width * CLOUD_PART_DISTANCE + Math.abs(place.x - width / 2));
          const gone = `translate(${away}px, ${-height * CLOUD_PART_RISE}px) scale(${1 + CLOUD_PART_GROW})`;
          const fading = `translate(${away * PART_FADE_FROM ** 2}px, ${-height * CLOUD_PART_RISE * PART_FADE_FROM}px) scale(${1 + CLOUD_PART_GROW * PART_FADE_FROM})`;
          frames = [
            { transform: below, opacity: 1, offset: 0 },
            { transform: below, opacity: 1, offset: at(riseStart), easing: RISE_EASING },
            { transform: 'none', opacity: 1, offset: at(riseEnd) },
            { transform: 'none', opacity: 1, offset: at(partStart), easing: PART_EASING },
            { transform: fading, opacity: 1, offset: at(fadeFrom) },
            { transform: gone, opacity: 0, offset: at(partEnd) },
            { transform: gone, opacity: 0, offset: 1 },
          ];
        }
        animations.push(image.animate(frames, timing));
      }
      // The background changes when every cloud is up; the layer goes when the last has left.
      const cover = layer.animate([], { duration: CLOUDS_COVER_MS });
      cover.addEventListener('finish', onCovered);
      const end = layer.animate([], { duration: CLOUDS_TOTAL_MS });
      end.addEventListener('finish', clear);
      animations.push(cover, end);
      if (paused) for (const animation of animations) animation.pause();
    },
    setPaused(value) {
      paused = value;
      for (const animation of animations) {
        if (value && animation.playState === 'running') animation.pause();
        else if (!value && animation.playState === 'paused') animation.play();
      }
    },
    clear,
  };
}
