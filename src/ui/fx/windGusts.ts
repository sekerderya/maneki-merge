/**
 * The wind (GAME_DESIGN §15.8), so the player sees it before dropping: sakura petals (the
 * garden's petal shape, ui/scenery.ts) and a few thin streaks drift across the top of the play
 * area the way the run's wind blows, more and faster with its level. Each runs one endless Web
 * Animation (transform only), so pausing pauses them all. With reduced motion a few slow petals
 * and no streaks; nothing while Wind is at level 0.
 */
import {
  WIND_BAND,
  WIND_CALM_CROSS_MS,
  WIND_CALM_PETALS,
  WIND_CROSS_MS,
  WIND_CROSS_MS_PER_LEVEL,
  WIND_LAYOUT_SEED,
  WIND_PETALS,
  WIND_PETALS_PER_LEVEL,
  WIND_STREAKS_PER_LEVEL,
} from '../../config/view';
import { Rng } from '../../core/rng';
import { reducedMotion } from '../../platform';
import { el } from '../dom';

export interface WindGustsView {
  /** Shows the wind at `level` (0: none) blowing right (1) or left (−1). */
  set(level: number, direction: 1 | -1): void;
  /** Freezes the petals while the run is paused. */
  setPaused(paused: boolean): void;
}

export function createWindGusts(root: HTMLElement): WindGustsView {
  const layer = el('div', 'wind-gusts');
  layer.hidden = true;
  root.append(layer);
  let animations: Animation[] = [];
  let paused = false;
  let shown = '';

  const clear = (): void => {
    for (const animation of animations) animation.cancel();
    animations = [];
    layer.replaceChildren();
    layer.hidden = true;
  };

  /** One piece crossing the band from one side to the other, again and again. */
  const drift = (
    piece: HTMLElement,
    rng: Rng,
    direction: 1 | -1,
    crossMs: number,
    sway: number,
    /** Degrees it turns over a crossing; null for a streak, which stays level. */
    turn: number | null,
  ): void => {
    const width = root.clientWidth;
    const height = root.clientHeight * WIND_BAND;
    const y = (0.04 + 0.92 * rng.next()) * height;
    const from = direction > 0 ? -60 : width + 60;
    const to = direction > 0 ? width + 60 : -60;
    const duration = crossMs * (0.8 + 0.4 * rng.next());
    const spin = turn === null ? 0 : rng.next() * 360;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const x = from + (to - from) * t;
      const dy = sway * Math.sin((t + rng.next() * 0.2) * Math.PI * 2);
      frames.push({
        transform: `translate(${x}px, ${y + dy}px) rotate(${spin + (turn ?? 0) * t}deg)`,
      });
    }
    layer.append(piece);
    const animation = piece.animate(frames, {
      duration,
      iterations: Infinity,
      // Spread over the crossing, so they don't arrive together.
      delay: -duration * rng.next(),
    });
    if (paused) animation.pause();
    animations.push(animation);
  };

  return {
    set(level, direction) {
      const still = reducedMotion();
      const key = level > 0 ? `${level}:${direction}:${still}` : '';
      if (key === shown) return;
      shown = key;
      clear();
      if (level <= 0) return;
      layer.hidden = false;
      const rng = new Rng(WIND_LAYOUT_SEED);
      const petals = still ? WIND_CALM_PETALS : WIND_PETALS + WIND_PETALS_PER_LEVEL * level;
      const crossMs = still ? WIND_CALM_CROSS_MS : WIND_CROSS_MS - WIND_CROSS_MS_PER_LEVEL * level;
      for (let i = 0; i < petals; i++) {
        const petal = el('span', 'wind-petal');
        const size = 8 + 5 * rng.next();
        petal.style.width = `${size}px`;
        petal.style.height = `${size * 0.55}px`;
        drift(petal, rng, direction, crossMs, 18, still ? 90 : 540 * direction);
      }
      if (still) return;
      for (let i = 0; i < WIND_STREAKS_PER_LEVEL * level; i++) {
        const streak = el('span', `wind-streak${direction < 0 ? ' is-left' : ''}`);
        streak.style.width = `${40 + 50 * rng.next()}px`;
        drift(streak, rng, direction, crossMs * 0.7, 6, null);
      }
    },
    setPaused(value) {
      paused = value;
      for (const animation of animations) {
        if (value && animation.playState === 'running') animation.pause();
        else if (!value && animation.playState === 'paused') animation.play();
      }
    },
  };
}
