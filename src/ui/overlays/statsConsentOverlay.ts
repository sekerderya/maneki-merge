import { catIcon } from '../catIcon';
import { button, el } from '../dom';
import { privacyLink } from '../privacyLink';
import { setUiArtProperties } from '../uiArt';

export interface StatsConsentView {
  readonly visible: boolean;
  /** Shows the card and resolves with the answer: true for yes. */
  ask(): Promise<boolean>;
  /** Closes the card as a no (the back button). */
  decline(): void;
}

/**
 * The play statistics card (GAME_DESIGN §2.8): asked once, after the first loading, in a build
 * that has a statistics service. Nothing is sent before its yes, and Settings' "Play statistics"
 * changes the answer later. It lies over everything (the menu, a run coming back paused); with
 * `art` it is built from the rewarded ad card's pieces (panel-art.css).
 */
export function createStatsConsentOverlay(root: HTMLElement, art = false): StatsConsentView {
  const overlay = el('div', 'overlay game-overlay ad-offer-overlay stats-consent-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = 'stats-consent';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Play statistics');
  overlay.hidden = true;

  const panel = el('div', 'overlay-panel');
  const title = el('h2', 'overlay-title', 'Play statistics');
  const cat = el('div', 'ad-offer-ball');
  cat.append(catIcon(1));
  const line = el(
    'p',
    'ad-offer-line',
    'Help make the game better? Share anonymous play statistics and crash reports: which stages are too hard and what goes wrong.',
  );
  const note = el(
    'p',
    'stats-consent-note',
    'No name, no account. Change it any time in Settings. ',
  );
  note.append(privacyLink('stats-consent-privacy'));

  const yes = button('btn btn-primary overlay-main-btn', 'Yes, share');
  yes.dataset['testid'] = 'stats-consent-yes';
  const no = button('btn btn-secondary', 'No thanks');
  no.dataset['testid'] = 'stats-consent-no';

  panel.append(title, cat, line, yes, no, note);
  overlay.append(panel);
  root.append(overlay);

  let answer: ((yes: boolean) => void) | null = null;
  const close = (granted: boolean): void => {
    const resolve = answer;
    answer = null;
    overlay.hidden = true;
    resolve?.(granted);
  };
  yes.addEventListener('click', () => close(true));
  no.addEventListener('click', () => close(false));

  return {
    get visible() {
      return !overlay.hidden;
    },
    ask() {
      close(false);
      overlay.hidden = false;
      return new Promise((resolve) => (answer = resolve));
    },
    decline() {
      close(false);
    },
  };
}
