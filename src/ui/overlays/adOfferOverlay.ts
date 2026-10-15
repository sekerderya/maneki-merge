import { ICON_SPRITE_DIR, iconSprite } from '../../config/iconSprites';
import type { Drop } from '../../core/dropQueue';
import { catIcon, paintDropIcon } from '../catIcon';
import { button, el } from '../dom';
import { ICON_PLAY } from '../icons';
import { artImage, setUiArtProperties } from '../uiArt';

/** What a rewarded ad's card asks (GAME_DESIGN §2.7). */
export interface AdOffer {
  readonly title: string;
  readonly line: string;
  /** The ball the ad gives (the bonus ball), shown above the line. */
  readonly ball?: Drop;
  /** The quiet button's word: "Not now", "No thanks". */
  readonly decline: string;
}

export type AdOfferChoice = 'watch' | 'decline';

export interface AdOfferView {
  readonly visible: boolean;
  /** Shows the card and resolves with the player's choice. */
  ask(offer: AdOffer): Promise<AdOfferChoice>;
  /** Closes the card as declined (the back button, leaving the game). */
  decline(): void;
}

/**
 * The card that offers a rewarded ad (GAME_DESIGN §2.7): a title, the ball it gives, one line,
 * "Watch ad" with the play medallion and a quiet decline. Nothing plays without the tap on
 * "Watch ad". It lies over the game and under the pause overlay; with `art` it is built from the
 * pause overlay's pieces (panel-art.css).
 */
export function createAdOfferOverlay(root: HTMLElement, art = false): AdOfferView {
  const overlay = el('div', 'overlay game-overlay ad-offer-overlay');
  overlay.classList.toggle('is-art', art);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = 'ad-offer';
  overlay.setAttribute('role', 'dialog');
  overlay.hidden = true;

  const panel = el('div', 'overlay-panel');
  const title = el('h2', 'overlay-title');
  const ballBox = el('div', 'ad-offer-ball');
  const ball = catIcon(1);
  ballBox.append(ball);
  const line = el('p', 'ad-offer-line');

  const watch = button('btn btn-primary overlay-main-btn ad-offer-watch', '');
  watch.dataset['testid'] = 'ad-offer-watch';
  const play = el('span', 'ad-offer-play');
  const playArt = art ? iconSprite('clip') : null;
  if (playArt) play.append(artImage(`${ICON_SPRITE_DIR}${playArt.file}`, 'ad-offer-play-art'));
  else play.insertAdjacentHTML('beforeend', ICON_PLAY);
  watch.append(play, el('span', 'btn-label', 'Watch ad'));
  const decline = button('btn btn-secondary', '');
  decline.dataset['testid'] = 'ad-offer-decline';

  panel.append(title, ballBox, line, watch, decline);
  overlay.append(panel);
  root.append(overlay);

  let answer: ((choice: AdOfferChoice) => void) | null = null;
  const close = (choice: AdOfferChoice): void => {
    const resolve = answer;
    answer = null;
    overlay.hidden = true;
    resolve?.(choice);
  };
  watch.addEventListener('click', () => close('watch'));
  decline.addEventListener('click', () => close('decline'));

  return {
    get visible() {
      return !overlay.hidden;
    },
    ask(offer) {
      close('decline');
      title.textContent = offer.title;
      overlay.setAttribute('aria-label', offer.title);
      line.textContent = offer.line;
      decline.textContent = offer.decline;
      ballBox.hidden = !offer.ball;
      if (offer.ball) paintDropIcon(ball, offer.ball);
      overlay.hidden = false;
      return new Promise((resolve) => (answer = resolve));
    },
    decline() {
      close('decline');
    },
  };
}
