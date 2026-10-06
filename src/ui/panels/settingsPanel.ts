import { formatVersionLabel } from '../../core/version';
import { button, el } from '../dom';
import {
  ICON_CHECK,
  ICON_CHEVRON,
  ICON_CLOSE,
  ICON_HELP,
  ICON_MOTION,
  ICON_SOUND_ON,
  ICON_VIBRATE,
} from '../icons';

/** The settings the panel switches (GAME_DESIGN §2.4); each one is a save setting. */
export type SettingKey = 'sound' | 'haptics' | 'reduceMotion';

export interface SettingsActions {
  onToggle(key: SettingKey): void;
  /** "How to play": the first-run hints show again in the next run. */
  onReplayTips(): void;
  onClose(): void;
}

export interface SettingsView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
  setValues(values: Readonly<Record<SettingKey, boolean>>): void;
  /** Haptics only exist where the browser can vibrate (Android); elsewhere the row hides. */
  setHapticsSupported(supported: boolean): void;
}

interface SwitchRow {
  readonly row: HTMLButtonElement;
  readonly text: HTMLElement;
}

/**
 * Settings panel over the main menu (GAME_DESIGN §2.4): sound effects, haptics, reduce motion,
 * "How to play" and the version. Each switch is a whole row, so the target is the full width.
 */
export function createSettingsPanel(root: HTMLElement, actions: SettingsActions): SettingsView {
  const overlay = el('div', 'overlay settings-overlay');
  overlay.dataset['testid'] = 'settings-panel';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Settings');
  overlay.hidden = true;
  // A tap on the dimmed menu around the card closes it.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) actions.onClose();
  });

  const card = el('section', 'settings-card');
  const header = el('header', 'settings-header');
  const close = button('icon-btn settings-close', '', ICON_CLOSE);
  close.setAttribute('aria-label', 'Close');
  close.dataset['testid'] = 'settings-close';
  close.addEventListener('click', actions.onClose);
  header.append(el('h2', 'settings-title', 'Settings'), close);

  const list = el('div', 'settings-list');
  const rowParts = (icon: string, label: string, sub: string): HTMLButtonElement => {
    const row = button('settings-row', '');
    const tile = el('span', 'settings-icon');
    tile.insertAdjacentHTML('beforeend', icon);
    const text = el('span', 'settings-text');
    text.append(el('span', 'settings-label', label), el('span', 'settings-sub', sub));
    row.append(tile, text);
    return row;
  };
  const switchRow = (key: SettingKey, icon: string, label: string, sub: string): SwitchRow => {
    const row = rowParts(icon, label, sub);
    row.setAttribute('role', 'switch');
    row.dataset['testid'] = `setting-${key}`;
    row.addEventListener('click', () => actions.onToggle(key));
    const track = el('span', 'switch');
    const text = el('span', 'switch-text', 'ON');
    track.append(text, el('span', 'switch-knob'));
    row.append(track);
    list.append(row);
    return { row, text };
  };
  const switches: Record<SettingKey, SwitchRow> = {
    sound: switchRow('sound', ICON_SOUND_ON, 'Sound effects', 'Merges, coins and buttons'),
    haptics: switchRow('haptics', ICON_VIBRATE, 'Haptics', 'Vibration on Android phones'),
    reduceMotion: switchRow(
      'reduceMotion',
      ICON_MOTION,
      'Reduce motion',
      'Less shake, fewer sparkles',
    ),
  };

  const tips = rowParts(ICON_HELP, 'How to play', 'Show the first-run tips again');
  tips.dataset['testid'] = 'setting-tips';
  const tipsMark = el('span', 'settings-chevron');
  tipsMark.insertAdjacentHTML('beforeend', ICON_CHEVRON);
  tips.append(tipsMark);
  const tipsSub = tips.querySelector('.settings-sub') as HTMLElement;
  tips.addEventListener('click', () => {
    actions.onReplayTips();
    tips.classList.add('is-done');
    tipsSub.textContent = 'Tips will show in your next run';
    tipsMark.innerHTML = ICON_CHECK;
  });
  list.append(tips);

  const version = el('p', 'settings-version', formatVersionLabel(__APP_VERSION__, __BUILD_HASH__));
  version.dataset['testid'] = 'version';

  card.append(header, list, version);
  overlay.append(card);
  root.append(overlay);

  return {
    get visible() {
      return !overlay.hidden;
    },
    show() {
      tips.classList.remove('is-done');
      tipsSub.textContent = 'Show the first-run tips again';
      tipsMark.innerHTML = ICON_CHEVRON;
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
    setValues(values) {
      for (const key of Object.keys(switches) as SettingKey[]) {
        const { row, text } = switches[key];
        const on = values[key];
        row.setAttribute('aria-checked', String(on));
        row.classList.toggle('is-on', on);
        text.textContent = on ? 'ON' : 'OFF';
      }
    },
    setHapticsSupported(supported) {
      switches.haptics.row.hidden = !supported;
    },
  };
}
