import { button, el } from '../dom';
import { ICON_BACK } from '../icons';

export interface GameScreenActions {
  /** The temporary Back control (replaced by the pause button in M5). */
  onBack(): void;
}

/**
 * Game screen skeleton: a HUD row and an empty play area. The Phaser canvas mounts into the
 * play area in M5.
 */
export function createGameScreen(root: HTMLElement, actions: GameScreenActions): HTMLElement {
  root.replaceChildren();
  root.classList.add('game-screen');

  const hud = el('header', 'game-hud');
  const back = button('icon-btn back-btn', '', ICON_BACK);
  back.setAttribute('aria-label', 'Back to menu');
  back.dataset['testid'] = 'back';
  back.addEventListener('click', actions.onBack);
  hud.append(back);

  const playArea = el('div', 'play-area');
  playArea.dataset['testid'] = 'play-area';
  playArea.append(el('p', 'play-area-placeholder', 'The jar arrives soon'));

  root.append(hud, playArea);
  return playArea;
}
