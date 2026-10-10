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
import { JAR_WIDTH } from '../../config/stages';
import { BACKGROUND_JAR, backgroundArt, SCENE_SPRITE_DIR } from '../../config/sceneSprites';
import type { BackgroundSprite } from '../../config/sceneSprites';
import { EXPANSION_ZOOM_MS } from '../../config/timings';
import { STAGE_ZOOM, TAKE_ARM_MS, TAKE_BUTTON_GAP } from '../../config/view';
import { reducedMotion } from '../../platform';
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
  /**
   * Shows jar `jar`'s background (GAME_DESIGN §7: 1 for stages 1–5, 2 for 6–10, …). With `grow`
   * the old garden shrinks towards the jar's feet and fades out over the zoom, as the camera pulls
   * back, uncovering the new one; else it just switches. Only the painted backgrounds change.
   */
  setJar(jar: number, grow: boolean): void;
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
  let art: BackgroundSprite = backgroundArt(1);
  const showArt = (image: HTMLImageElement): void => {
    image.src = `${import.meta.env.BASE_URL}${SCENE_SPRITE_DIR}${art.file}`;
    playArea.style.setProperty('--scene-sky', art.sky);
    playArea.style.setProperty('--scene-ground', art.ground);
  };
  // The old background while it leaves after the jar grew (setJar).
  let leaving: Animation | null = null;
  let lastBox: ScreenJarBox | null = null;
  if (sceneArt) {
    const image = el('img', 'play-scenery is-art');
    image.alt = '';
    image.draggable = false;
    showArt(image);
    playArea.append(image);
    // The grown jars' gardens load ahead, so the first growth never shows a blank one.
    for (let jar = 2; backgroundArt(jar) !== backgroundArt(jar - 1); jar++) {
      new Image().src = `${import.meta.env.BASE_URL}${SCENE_SPRITE_DIR}${backgroundArt(jar).file}`;
    }
    playArea.classList.add('has-scene-art');
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

  /** Scales and moves the drawing so its jar lands on the real one. */
  const placeScenery = (box: ScreenJarBox): void => {
    // The painted background also always spans the play area's width (on wide screens its rug
    // is then wider than the jar).
    const jar = sceneArt ? BACKGROUND_JAR : SCENERY_JAR;
    const view = sceneArt ? art : SCENERY_VIEW;
    let scale = (box.right - box.left) / jar.width;
    if (sceneArt) scale = Math.max(scale, playArea.clientWidth / view.width);
    const style = scenery.style;
    style.left = `${(box.left + box.right) / 2 - jar.cx * scale}px`;
    style.top = `${box.bottom - jar.floor * scale}px`;
    style.width = `${view.width * scale}px`;
    style.height = `${view.height * scale}px`;
  };

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
      lastBox = box;
      placeScenery(box);
      // World units → CSS pixels for the glass.
      const unit = (box.right - box.left) / JAR_WIDTH;
      const g = glass.style;
      g.left = `${box.left}px`;
      g.top = `${box.top}px`;
      g.width = `${box.right - box.left}px`;
      g.height = `${box.bottom - box.top}px`;
      g.setProperty('--glass-inset', `${JAR_GLASS.lineInset * unit}px`);
      g.setProperty('--glass-line', `${JAR_GLASS.lineWidth * unit}px`);
      glass.classList.toggle('is-hidden', growing);
    },
    setJar(jar, grow) {
      const next = backgroundArt(jar);
      if (!sceneArt || next === art || !(scenery instanceof HTMLImageElement)) return;
      leaving?.finish();
      if (grow) {
        // A copy of the old garden on top: it shrinks towards the jar's feet as it fades out.
        const old = scenery.cloneNode() as HTMLImageElement;
        old.classList.add('is-leaving');
        old.style.transformOrigin = `${(BACKGROUND_JAR.cx / art.width) * 100}% ${(BACKGROUND_JAR.floor / art.height) * 100}%`;
        scenery.after(old);
        const end = reducedMotion()
          ? { opacity: 0 }
          : { opacity: 0, transform: `scale(${1 / STAGE_ZOOM})` };
        const animation = old.animate([{ opacity: 1, transform: 'scale(1)' }, end], {
          duration: EXPANSION_ZOOM_MS,
          easing: 'ease-in-out',
          fill: 'forwards',
        });
        leaving = animation;
        const done = (): void => {
          old.remove();
          if (leaving === animation) leaving = null;
        };
        animation.addEventListener('finish', done);
        animation.addEventListener('cancel', done);
      }
      art = next;
      showArt(scenery);
      if (lastBox) placeScenery(lastBox);
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
