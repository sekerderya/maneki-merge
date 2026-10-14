import { button, el } from '../dom';
import {
  ICON_MUSIC_OFF,
  ICON_MUSIC_ON,
  ICON_SOUND_OFF,
  ICON_SOUND_ON,
  ICON_VIBRATE,
  ICON_VIBRATE_OFF,
} from '../icons';
import { setUiArtProperties } from '../uiArt';

export interface PauseActions {
  onResume(): void;
  onToggleSound(): void;
  onToggleMusic(): void;
  onToggleHaptics(): void;
  /** A scene only (GAME_DESIGN §2.6): the same scene again, for another take. */
  onRestart(): void;
  onQuit(): void;
}

export interface PauseView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
  setSoundOn(on: boolean): void;
  setMusicOn(on: boolean): void;
  setHapticsOn(on: boolean): void;
  /** Restart shows only while a scene is played. */
  setRestartVisible(visible: boolean): void;
}

/**
 * Pause overlay (GAME_DESIGN §2.3): Resume, Sound, Music, Haptics, Quit to Menu, and Restart scene while
 * a scene is played (§2.6). With `art` (the art skin) it is the owner's approved mockup
 * (docs/ART_ASSETS.md §4.14) built from the Upgrades and menu pieces (panel-art.css); otherwise
 * the code-drawn card of v0.14.
 */
export function createPauseOverlay(
  root: HTMLElement,
  actions: PauseActions,
  art = false,
): PauseView {
  const overlay = el('div', 'overlay game-overlay pause-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = 'pause-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Paused');
  overlay.hidden = true;

  const panel = el('div', 'overlay-panel');
  panel.append(el('h2', 'overlay-title', 'Paused'));

  const resume = button('btn btn-primary overlay-main-btn', 'Resume');
  resume.dataset['testid'] = 'resume';
  resume.addEventListener('click', actions.onResume);

  // Three icon-only switches (v0.47: the music made a third, and three labels don't fit).
  const toggles = el('div', 'overlay-toggles');
  const toggle = (label: string, testid: string, onClick: () => void): HTMLButtonElement => {
    const node = button('btn btn-toggle', '');
    node.setAttribute('aria-label', label);
    node.title = label;
    node.dataset['testid'] = testid;
    node.addEventListener('click', onClick);
    return node;
  };
  const sound = toggle('Sound', 'pause-sound', actions.onToggleSound);
  const music = toggle('Music', 'pause-music', actions.onToggleMusic);
  const haptics = toggle('Haptics', 'pause-haptics', actions.onToggleHaptics);
  toggles.append(sound, music, haptics);

  const restart = button('btn btn-ghost', 'Restart scene');
  restart.dataset['testid'] = 'restart-scene';
  restart.hidden = true;
  restart.addEventListener('click', actions.onRestart);

  const quit = button('btn btn-ghost', 'Quit to Menu');
  quit.dataset['testid'] = 'quit';
  quit.addEventListener('click', actions.onQuit);

  panel.append(resume, toggles, restart, quit);
  overlay.append(panel);
  root.append(overlay);

  const setToggle = (node: HTMLButtonElement, on: boolean, icon: string): void => {
    node.querySelector('svg')?.remove();
    node.insertAdjacentHTML('afterbegin', icon);
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
      setToggle(sound, on, on ? ICON_SOUND_ON : ICON_SOUND_OFF);
    },
    setMusicOn(on) {
      setToggle(music, on, on ? ICON_MUSIC_ON : ICON_MUSIC_OFF);
    },
    setHapticsOn(on) {
      setToggle(haptics, on, on ? ICON_VIBRATE : ICON_VIBRATE_OFF);
    },
    setRestartVisible(visible) {
      restart.hidden = !visible;
    },
  };
}
