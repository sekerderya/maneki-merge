import { button, el } from '../dom';
import { ICON_SOUND_OFF, ICON_SOUND_ON, ICON_VIBRATE } from '../icons';

export interface PauseActions {
  onResume(): void;
  onToggleSound(): void;
  onToggleHaptics(): void;
  onQuit(): void;
}

export interface PauseView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
  setSoundOn(on: boolean): void;
  setHapticsOn(on: boolean): void;
}

/** Pause overlay (GAME_DESIGN §2.3): Resume, Sound, Haptics, Quit to Menu. */
export function createPauseOverlay(root: HTMLElement, actions: PauseActions): PauseView {
  const overlay = el('div', 'overlay game-overlay pause-overlay');
  overlay.dataset['testid'] = 'pause-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Paused');
  overlay.hidden = true;

  const panel = el('div', 'overlay-panel');
  panel.append(el('h2', 'overlay-title', 'Paused'));

  const resume = button('btn btn-primary overlay-main-btn', 'Resume');
  resume.dataset['testid'] = 'resume';
  resume.addEventListener('click', actions.onResume);

  const toggles = el('div', 'overlay-toggles');
  const sound = button('btn btn-toggle', 'Sound');
  sound.dataset['testid'] = 'pause-sound';
  sound.addEventListener('click', actions.onToggleSound);
  const haptics = button('btn btn-toggle', 'Haptics', ICON_VIBRATE);
  haptics.dataset['testid'] = 'pause-haptics';
  haptics.addEventListener('click', actions.onToggleHaptics);
  toggles.append(sound, haptics);

  const quit = button('btn btn-secondary', 'Quit to Menu');
  quit.dataset['testid'] = 'quit';
  quit.addEventListener('click', actions.onQuit);

  panel.append(resume, toggles, quit);
  overlay.append(panel);
  root.append(overlay);

  const setToggle = (node: HTMLButtonElement, on: boolean): void => {
    node.setAttribute('aria-pressed', String(on));
    node.classList.toggle('is-off', !on);
  };

  return {
    get visible() {
      return !overlay.hidden;
    },
    show() {
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
    setSoundOn(on) {
      sound.querySelector('svg')?.remove();
      sound.insertAdjacentHTML('afterbegin', on ? ICON_SOUND_ON : ICON_SOUND_OFF);
      setToggle(sound, on);
    },
    setHapticsOn(on) {
      setToggle(haptics, on);
    },
  };
}
