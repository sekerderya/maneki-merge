import {
  HUD_COIN_ART,
  HUD_NEXT_ART,
  HUD_PAUSE_ART,
  HUD_SCORE_CARD_ART,
  HUD_SPRITE_DIR,
  HUD_XP_ART,
} from '../../config/hudSprites';
import type { HudSprite } from '../../config/hudSprites';
import type { Drop } from '../../core/dropQueue';
import { formatNumber } from '../../core/format';
import { catIcon, paintDropIcon } from '../catIcon';
import { button, el } from '../dom';
import { ICON_COIN, ICON_PAUSE, NEXT_BUBBLE_BACK, NEXT_BUBBLE_SHINE } from '../icons';
import { scoreCardLayout } from './scoreCard';

export interface HudActions {
  onPause(): void;
}

export interface HudView {
  setScore(score: number): void;
  setCoins(coins: number): void;
  setStage(stage: number): void;
  /** The run's level and how far the XP bar is towards the next one (0–1). */
  setLevel(level: number, progress: number): void;
  /** XP came in: the XP card pulses; a level up flashes it. */
  pulseXp(levelUp: boolean): void;
  /** The ball after the one in the dropper: a cat, the magnet or a boulder. */
  setNext(drop: Drop): void;
  /** A coin landed on the counter. */
  pulseCoins(): void;
  /** Where flying coins land. */
  readonly coinTarget: HTMLElement;
}

function artPath(sprite: HudSprite): string {
  return `${import.meta.env.BASE_URL}${HUD_SPRITE_DIR}${sprite.file}`;
}

/** An `<img>` of a HUD sprite. */
function artImage(sprite: HudSprite, className: string): HTMLImageElement {
  const image = el('img', className);
  image.src = artPath(sprite);
  image.alt = '';
  image.draggable = false;
  return image;
}

/** The CSS `url()` of a HUD sprite. */
function artUrl(sprite: HudSprite): string {
  return `url("${artPath(sprite)}")`;
}

/** The HUD art's images and measurements, as CSS custom properties on the HUD. */
function setArtProperties(root: HTMLElement): void {
  const set = (name: string, value: string | number): void =>
    root.style.setProperty(name, String(value));
  set('--hud-next-art', artUrl(HUD_NEXT_ART));
  set('--hud-pause-art', artUrl(HUD_PAUSE_ART));
  set('--hud-next-ratio', `${HUD_NEXT_ART.width} / ${HUD_NEXT_ART.height}`);
  set('--hud-next-cy', `${HUD_NEXT_ART.cy * 100}%`);
  set('--hud-next-tag', `${HUD_NEXT_ART.tagY * 100}%`);
  const card = scoreCardLayout();
  const art = HUD_SCORE_CARD_ART;
  set('--hud-score-art', artUrl(art));
  set('--hud-score-slice', `0 ${art.sliceRight} 0 ${art.sliceLeft} fill`);
  set('--hud-score-slice-left', `${card.sliceLeft}px`);
  set('--hud-score-slice-right', `${card.sliceRight}px`);
  set('--hud-score-height', `${card.height}px`);
  set('--hud-score-min-width', `${card.minWidth}px`);
  set('--hud-score-label-top', `${card.labelTop}px`);
  set('--hud-score-label-height', `${card.labelHeight}px`);
  set('--hud-score-label-left', `${card.labelLeft}px`);
  set('--hud-score-label-right', `${card.labelRight}px`);
  set('--hud-score-well-top', `${card.wellTop}px`);
  set('--hud-score-well-height', `${card.wellHeight}px`);
  set('--hud-score-margin-left', `${card.scoreMarginLeft}px`);
  set('--hud-score-margin-right', `${card.scoreMarginRight}px`);
  const xp = HUD_XP_ART;
  const dir = `${import.meta.env.BASE_URL}${HUD_SPRITE_DIR}`;
  set('--hud-xp-empty', `url("${dir}${xp.empty}")`);
  set('--hud-xp-full', `url("${dir}${xp.full}")`);
  set('--hud-xp-ratio', `${xp.width} / ${xp.height}`);
  set('--hud-xp-well-left', `${(xp.wellLeft / xp.width) * 100}%`);
  set('--hud-xp-well-right', `${(1 - xp.wellRight / xp.width) * 100}%`);
  set('--hud-xp-well-top', `${(xp.wellTop / xp.height) * 100}%`);
  set('--hud-xp-well-bottom', `${(1 - xp.wellBottom / xp.height) * 100}%`);
}

/**
 * In-game HUD (GAME_DESIGN §2.3), floating over the top of the play area: the stage in words at
 * the top in the middle; on the left the score card and the XP card under it (v0.25); on the right
 * the pink pause button, the coins card and the next cat in a round glass bubble under it. Only the
 * pause button takes touches; the rest lets them through to the game. With `art` the score card,
 * the XP card, the bubble, the button and the coin are the owner's images (config/hudSprites.ts);
 * the coins card is CSS drawn after the owner's reference image.
 */
export function createHud(root: HTMLElement, actions: HudActions, art = false): HudView {
  root.replaceChildren();
  root.classList.add('game-hud');
  root.classList.toggle('is-art', art);
  if (art) setArtProperties(root);

  const scoreCard = el('div', 'hud-card hud-score-card');
  const score = el('span', 'hud-score', '0');
  score.dataset['testid'] = 'hud-score';
  // "SCORE:" centred on top, the score in a well (with `art`, the card's image: ui/hud/scoreCard.ts).
  scoreCard.append(el('span', 'hud-label', 'Score'), score);

  // The XP card under the score card: the gold fills its well as the run's level comes closer.
  const xpCard = el('div', 'hud-xp-card');
  const xpFill = el('div', 'hud-xp-fill');
  xpFill.dataset['testid'] = 'hud-xp-fill';
  const level = el('span', 'hud-xp-level', 'Lv 1');
  level.dataset['testid'] = 'hud-level';
  xpCard.append(xpFill, level);

  const left = el('div', 'hud-left');
  left.append(scoreCard, xpCard);

  // The stage: words only, at the top in the middle of the screen.
  const stage = el('span', 'hud-stage', 'Stage 1');
  stage.dataset['testid'] = 'hud-stage';

  // The next cat in a round glass bubble under the coins card.
  const next = el('div', 'hud-next');
  next.dataset['testid'] = 'hud-next';
  const bubble = el('div', 'hud-next-bubble');
  if (!art) bubble.insertAdjacentHTML('beforeend', NEXT_BUBBLE_BACK);
  const nextCats = el('div', 'hud-next-cats');
  const nextCat = catIcon(1);
  nextCats.append(nextCat);
  bubble.append(nextCats);
  if (!art) bubble.insertAdjacentHTML('beforeend', NEXT_BUBBLE_SHINE);
  next.append(el('span', 'hud-next-label', 'Next'), bubble);

  // The art's button has its own bars.
  const pause = button('pause-btn', '', art ? undefined : ICON_PAUSE);
  pause.setAttribute('aria-label', 'Pause');
  pause.dataset['testid'] = 'pause';
  pause.addEventListener('click', actions.onPause);

  const coinsCard = el('div', 'hud-card hud-coins-card');
  const coins = el('span', 'hud-coins');
  coins.dataset['testid'] = 'hud-coins';
  // Flying coins land on the coin before the number.
  const coin = art ? artImage(HUD_COIN_ART, 'hud-coin') : null;
  if (coin) coins.append(coin);
  else coins.insertAdjacentHTML('beforeend', ICON_COIN);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);
  coinsCard.append(el('span', 'hud-label', 'Coins'), coins);

  // The pause button on top, the coins card under it, the bubble under that.
  const right = el('div', 'hud-right');
  right.append(coinsCard, next, pause);

  root.append(stage, left, right);

  const restartAnimation = (node: HTMLElement, className: string): void => {
    node.classList.remove(className);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(className);
  };
  coinsCard.addEventListener('animationend', () => coinsCard.classList.remove('is-pulsing'));
  xpCard.addEventListener('animationend', () =>
    xpCard.classList.remove('is-pulsing', 'is-levelling'),
  );

  return {
    setScore(value) {
      score.textContent = formatNumber(value);
    },
    setCoins(value) {
      coinValue.textContent = formatNumber(value);
    },
    setStage(value) {
      stage.textContent = `Stage ${value}`;
    },
    setLevel(value, progress) {
      level.textContent = `Lv ${value}`;
      const p = Math.max(0, Math.min(1, progress));
      // The art's gold starts at the well's left edge, beside the paw's arm.
      const { wellLeft, wellRight, width } = HUD_XP_ART;
      const right = art ? (wellLeft + p * (wellRight - wellLeft)) / width : p;
      xpFill.style.clipPath = `inset(0 ${(1 - right) * 100}% 0 0)`;
    },
    setNext(drop) {
      paintDropIcon(nextCat, drop);
    },
    pulseCoins() {
      restartAnimation(coinsCard, 'is-pulsing');
    },
    pulseXp(levelUp) {
      xpCard.classList.remove('is-pulsing', 'is-levelling');
      restartAnimation(xpCard, levelUp ? 'is-levelling' : 'is-pulsing');
    },
    coinTarget: coin ?? coins,
  };
}
