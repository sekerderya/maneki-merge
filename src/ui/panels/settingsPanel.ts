import {
  ACCOUNT_RESET_TAPS,
  TESTER_RESET_TAP_WINDOW_MS,
  TESTER_RESET_TAPS,
} from '../../config/app';
import { SHOP_ART, SHOP_SPRITE_DIR } from '../../config/shopSprites';
import { formatVersionLabel } from '../../core/version';
import { button, el } from '../dom';
import {
  ICON_CHART,
  ICON_CHECK,
  ICON_CHEVRON,
  ICON_CLOSE,
  ICON_HELP,
  ICON_MOON,
  ICON_MOTION,
  ICON_SHIELD,
  ICON_SOUND_ON,
  ICON_VIBRATE,
} from '../icons';
import { privacyLink } from '../privacyLink';
import { artImage, setUiArtProperties } from '../uiArt';

/** The settings the panel switches (GAME_DESIGN §2.4); each one is a save setting. */
export type SettingKey = 'sound' | 'haptics' | 'reduceMotion' | 'dayNight' | 'statistics';

export interface SettingsActions {
  onToggle(key: SettingKey): void;
  /** "How to play": the first-run hints show again in the next run. */
  onReplayTips(): void;
  /**
   * Seven quick taps on the version: the tester reset (GAME_DESIGN §2.4), a fresh save with a
   * million coins and every upgrade open, and the menu's Scenes button on (§2.6).
   */
  onTesterReset(): void;
  /** Exactly five taps on the version, then a pause: the account reset, a new player's save. */
  onAccountReset(): void;
  /** "Privacy options" (the Android app): AdMob's form to change the ad consent answer. */
  onPrivacyOptions(): void;
  onClose(): void;
}

export interface SettingsView {
  readonly visible: boolean;
  show(): void;
  hide(): void;
  setValues(values: Readonly<Record<SettingKey, boolean>>): void;
  /** Haptics only exist where the browser can vibrate (Android); elsewhere the row hides. */
  setHapticsSupported(supported: boolean): void;
  /** "Privacy options" shows only in the Android app, while AdMob says it is needed. */
  setPrivacyOptionsVisible(visible: boolean): void;
  /** "Play statistics" shows only where the build has a statistics service (TECH_SPEC §17). */
  setStatisticsAvailable(available: boolean): void;
}

interface SwitchRow {
  readonly row: HTMLButtonElement;
  readonly text: HTMLElement;
}

/**
 * Settings panel over the main menu (GAME_DESIGN §2.4): sound effects, haptics, reduce motion,
 * day and night, play statistics, "How to play" and the version. Each switch is a whole row, so the target is the full width.
 * With `art` (the art skin) it is the owner's approved mockup (docs/ART_ASSETS.md §4.14), built
 * from the Upgrades and menu pieces (panel-art.css): gold-rimmed icons, gold switches.
 */
export function createSettingsPanel(
  root: HTMLElement,
  actions: SettingsActions,
  art = false,
): SettingsView {
  const overlay = el('div', 'overlay settings-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = 'settings-panel';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Settings');
  overlay.hidden = true;
  // A tap on the dimmed menu around the card closes it.
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) actions.onClose();
  });

  const card = el('section', 'settings-card');
  // Taller than a small phone's screen with every row (375 × 667): it scrolls under a finger, so
  // the version and the privacy policy at its foot stay reachable.
  card.dataset['scrollable'] = '';
  const header = el('header', 'settings-header');
  const close = button('icon-btn settings-close', '', art ? '' : ICON_CLOSE);
  if (art) close.append(artImage(`${SHOP_SPRITE_DIR}${SHOP_ART.close.file}`, 'settings-close-art'));
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
    dayNight: switchRow('dayNight', ICON_MOON, 'Day and night', 'The garden follows your clock'),
    statistics: switchRow(
      'statistics',
      ICON_CHART,
      'Play statistics',
      'Anonymous stats and crash reports',
    ),
  };
  switches.statistics.row.hidden = true;

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

  const privacyOptions = rowParts(ICON_SHIELD, 'Privacy options', 'Your choices for the ads');
  privacyOptions.dataset['testid'] = 'setting-privacy-options';
  const privacyMark = el('span', 'settings-chevron');
  privacyMark.insertAdjacentHTML('beforeend', ICON_CHEVRON);
  privacyOptions.append(privacyMark);
  privacyOptions.hidden = true;
  privacyOptions.addEventListener('click', actions.onPrivacyOptions);
  list.append(privacyOptions);

  const footer = el('p', 'settings-version');
  const versionLabel = formatVersionLabel(__APP_VERSION__, __BUILD_HASH__);
  const version = el('span', '', versionLabel);
  version.dataset['testid'] = 'version';
  // Seven taps make the tester reset at once; exactly five and a pause make the account reset.
  let taps = 0;
  let tapTimer = 0;
  version.addEventListener('click', () => {
    taps++;
    window.clearTimeout(tapTimer);
    if (taps >= TESTER_RESET_TAPS) {
      taps = 0;
      actions.onTesterReset();
      return;
    }
    tapTimer = window.setTimeout(() => {
      const count = taps;
      taps = 0;
      if (count === ACCOUNT_RESET_TAPS) actions.onAccountReset();
    }, TESTER_RESET_TAP_WINDOW_MS);
  });
  const privacy = privacyLink('settings-privacy');
  privacy.dataset['testid'] = 'privacy-link';
  footer.append(version, el('span', '', '·'), privacy);

  card.append(header, list, footer);
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
    setPrivacyOptionsVisible(visible) {
      privacyOptions.hidden = !visible;
    },
    setStatisticsAvailable(available) {
      switches.statistics.row.hidden = !available;
    },
  };
}
