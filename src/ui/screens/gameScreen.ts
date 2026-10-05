import { createHint } from '../banners/hint';
import type { HintView } from '../banners/hint';
import { el } from '../dom';
import { createHud } from '../hud/hud';
import type { HudActions, HudView } from '../hud/hud';

export interface GameScreenView {
  readonly hud: HudView;
  readonly hint: HintView;
  /** The Phaser canvas mounts here; it fills the play band below the HUD. */
  readonly playArea: HTMLElement;
}

/** Game screen (GAME_DESIGN §2.3): the DOM HUD on top, the play band with the canvas below. */
export function createGameScreen(root: HTMLElement, actions: HudActions): GameScreenView {
  root.replaceChildren();
  root.classList.add('game-screen');

  const hudRoot = el('header');
  const hud = createHud(hudRoot, actions);

  const playArea = el('div', 'play-area');
  playArea.dataset['testid'] = 'play-area';
  const hint = createHint(playArea);

  root.append(hudRoot, playArea);
  return { hud, hint, playArea };
}
