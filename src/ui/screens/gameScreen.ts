import { createBanners } from '../banners/banner';
import type { BannerView } from '../banners/banner';
import { createHint } from '../banners/hint';
import type { HintView } from '../banners/hint';
import { el } from '../dom';
import { createCoinFly } from '../fx/coinFly';
import type { CoinFlyView } from '../fx/coinFly';
import { createHud } from '../hud/hud';
import type { HudActions, HudView } from '../hud/hud';
import { JAR_GLASS } from '../../config/jarArt';
import { JAR_CORNER_RADIUS, JAR_WIDTH } from '../../config/stages';
import { SCENERY_JAR, SCENERY_VIEW, sceneryMarkup } from '../scenery';

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
}

/**
 * Game screen (GAME_DESIGN §2.3): the play area fills the screen, with the shrine garden
 * (ui/scenery.ts) behind the transparent canvas, and the DOM HUD floats over its top.
 */
export function createGameScreen(root: HTMLElement, actions: HudActions): GameScreenView {
  root.replaceChildren();
  root.classList.add('game-screen');

  const playArea = el('div', 'play-area');
  playArea.dataset['testid'] = 'play-area';
  playArea.insertAdjacentHTML('beforeend', sceneryMarkup());
  const scenery = playArea.lastElementChild as SVGSVGElement;
  // The jar's glass: it never moves on screen while playing, so the DOM draws it once.
  const glass = el('div', 'jar-glass');
  playArea.append(glass);
  const hint = createHint(playArea);
  const banners = createBanners(playArea);

  const hudRoot = el('header');
  const hud = createHud(hudRoot, actions);

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
      // Scale and move the drawing so its jar lands on the real one.
      const scale = (box.right - box.left) / SCENERY_JAR.width;
      const style = scenery.style;
      style.left = `${(box.left + box.right) / 2 - SCENERY_JAR.cx * scale}px`;
      style.top = `${box.bottom - SCENERY_JAR.floor * scale}px`;
      style.width = `${SCENERY_VIEW.width * scale}px`;
      style.height = `${SCENERY_VIEW.height * scale}px`;
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
  };
}
