import { createBanners } from '../banners/banner';
import type { BannerView } from '../banners/banner';
import { createHint } from '../banners/hint';
import type { HintView } from '../banners/hint';
import { button, el } from '../dom';
import { createCoinFly } from '../fx/coinFly';
import type { CoinFlyView } from '../fx/coinFly';
import { createHud } from '../hud/hud';
import type { HudActions, HudView } from '../hud/hud';
import { JAR_GLASS } from '../../config/jarArt';
import { JAR_CORNER_RADIUS, JAR_WIDTH } from '../../config/stages';
import { BACKGROUND_ART, BACKGROUND_JAR, SCENE_SPRITE_DIR } from '../../config/sceneSprites';
import { TAKE_ARM_MS, TAKE_BUTTON_GAP } from '../../config/view';
import { SCENERY_JAR, SCENERY_VIEW, sceneryMarkup } from '../scenery';

export interface GameScreenActions extends HudActions {
  /** The magnet's Take button (GAME_DESIGN §15.2). */
  onTake(): void;
}

/** Where the Take button goes: above the selected ball `id`, in CSS pixels of the play area. */
export type ScreenTakePrompt = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
} | null;

/** The jar's inside on screen, in CSS pixels of the play area. */
export interface ScreenJarBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface GameScreenView {
  readonly hud: HudView;
  readonly hint: HintView;
  readonly banners: BannerView;
  /** Coins flying from payouts to the HUD counter. */
  readonly coins: CoinFlyView;
  /** The Phaser canvas mounts here; it fills the whole screen, under the HUD. */
  readonly playArea: HTMLElement;
  /** How far down the play area the HUD reaches, in CSS pixels. */
  hudBottom(): number;
  /** Calls `listener` whenever the HUD changes size (the jar has to fit below it). */
  onHudResize(listener: () => void): void;
  /**
   * Lines the garden and the glass up with the jar on screen. While the jar grows the canvas
   * draws the glass, so the DOM glass hides.
   */
  setJarBox(box: ScreenJarBox, growing: boolean): void;
  /**
   * Shows the magnet's Take button above the selected ball, or hides it (null). A new selection
   * ignores taps for TAKE_ARM_MS, so a quick double tap can't take a ball by mistake.
   */
  setTakePrompt(prompt: ScreenTakePrompt): void;
}

/**
 * Game screen (GAME_DESIGN §2.3): the play area fills the screen, with the shrine garden behind
 * the transparent canvas, and the DOM HUD floats over its top. The garden is the owner's painted
 * background with `sceneArt` (config/sceneSprites.ts), else the vector one (ui/scenery.ts).
 */
export function createGameScreen(
  root: HTMLElement,
  actions: GameScreenActions,
  sceneArt = false,
): GameScreenView {
  root.replaceChildren();
  root.classList.add('game-screen');

  const playArea = el('div', 'play-area');
  playArea.dataset['testid'] = 'play-area';
  let scenery: HTMLElement | SVGSVGElement;
  if (sceneArt) {
    const image = el('img', 'play-scenery is-art');
    image.src = `${import.meta.env.BASE_URL}${SCENE_SPRITE_DIR}${BACKGROUND_ART.file}`;
    image.alt = '';
    image.draggable = false;
    playArea.append(image);
    playArea.classList.add('has-scene-art');
    playArea.style.setProperty('--scene-sky', BACKGROUND_ART.sky);
    playArea.style.setProperty('--scene-ground', BACKGROUND_ART.ground);
    scenery = image;
  } else {
    playArea.insertAdjacentHTML('beforeend', sceneryMarkup());
    scenery = playArea.lastElementChild as SVGSVGElement;
  }
  // The jar's glass: it never moves on screen while playing, so the DOM draws it once.
  const glass = el('div', 'jar-glass');
  playArea.append(glass);
  const hint = createHint(playArea);
  const banners = createBanners(playArea);
  // The magnet's Take button floats over the play area, above the selected ball.
  const take = button('btn take-btn', 'Take');
  take.dataset['testid'] = 'take';
  take.hidden = true;
  playArea.append(take);
  let takeId: number | null = null;
  let takeArmedAt = 0;
  take.addEventListener('click', () => {
    if (performance.now() < takeArmedAt) return;
    actions.onTake();
  });

  const hudRoot = el('header');
  const hud = createHud(hudRoot, actions, sceneArt);

  root.append(playArea, hudRoot);
  const coins = createCoinFly(root, playArea, hud.coinTarget);

  const hudListeners: (() => void)[] = [];
  new ResizeObserver(() => {
    for (const listener of hudListeners) listener();
  }).observe(hudRoot);

  return {
    hud,
    hint,
    banners,
    coins,
    playArea,
    hudBottom() {
      return hudRoot.getBoundingClientRect().bottom - playArea.getBoundingClientRect().top;
    },
    onHudResize(listener) {
      hudListeners.push(listener);
    },
    setJarBox(box, growing) {
      // Scale and move the drawing so its jar lands on the real one. The painted background also
      // always spans the play area's width (on wide screens its rug is then wider than the jar).
      const jar = sceneArt ? BACKGROUND_JAR : SCENERY_JAR;
      const view = sceneArt ? BACKGROUND_ART : SCENERY_VIEW;
      let scale = (box.right - box.left) / jar.width;
      if (sceneArt) scale = Math.max(scale, playArea.clientWidth / view.width);
      const style = scenery.style;
      style.left = `${(box.left + box.right) / 2 - jar.cx * scale}px`;
      style.top = `${box.bottom - jar.floor * scale}px`;
      style.width = `${view.width * scale}px`;
      style.height = `${view.height * scale}px`;
      // World units → CSS pixels for the glass.
      const unit = (box.right - box.left) / JAR_WIDTH;
      const g = glass.style;
      g.left = `${box.left}px`;
      g.top = `${box.top}px`;
      g.width = `${box.right - box.left}px`;
      g.height = `${box.bottom - box.top}px`;
      g.setProperty('--glass-radius', `${JAR_CORNER_RADIUS * unit}px`);
      g.setProperty('--glass-inset', `${JAR_GLASS.lineInset * unit}px`);
      g.setProperty('--glass-line', `${JAR_GLASS.lineWidth * unit}px`);
      glass.classList.toggle('is-hidden', growing);
    },
    setTakePrompt(prompt) {
      if (!prompt) {
        take.hidden = true;
        takeId = null;
        return;
      }
      if (prompt.id !== takeId) {
        takeId = prompt.id;
        takeArmedAt = performance.now() + TAKE_ARM_MS;
      }
      take.hidden = false;
      // Centred over the ball, its bottom TAKE_BUTTON_GAP above the ring, kept inside the area.
      const half = take.offsetWidth / 2;
      const x = Math.min(Math.max(prompt.x, half + 8), playArea.clientWidth - half - 8);
      const y = Math.max(prompt.y - TAKE_BUTTON_GAP, take.offsetHeight + 8);
      take.style.left = `${x}px`;
      take.style.top = `${y}px`;
    },
  };
}
