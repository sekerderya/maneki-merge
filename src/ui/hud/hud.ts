import {
  HUD_NEXT_ART,
  HUD_PAUSE_ART,
  HUD_SCORE_CARD_ART,
  HUD_SPRITE_DIR,
} from '../../config/hudSprites';
import type { HudSprite } from '../../config/hudSprites';
import { MENU_ART, MENU_SPRITE_DIR } from '../../config/menuSprites';
import { stageInfo } from '../../config/stages';
import { SIZE_COUNT } from '../../config/tiers';
import type { Drop } from '../../core/dropQueue';
import { formatNumber } from '../../core/format';
import { catIcon, paintCatIcon, paintDropIcon } from '../catIcon';
import { button, el } from '../dom';
import { coinIcon } from '../coinIcon';
import { ICON_PAUSE, NEXT_BUBBLE_BACK, NEXT_BUBBLE_SHINE } from '../icons';
import { artImage } from '../uiArt';
import { scoreCardLayout } from './scoreCard';

export interface HudActions {
  onPause(): void;
}

export interface HudView {
  setScore(score: number): void;
  setCoins(coins: number): void;
  /** A stage starts (or the run is shown): its cats on the goal strip, made up to `bestSize`. */
  setStage(stage: number, bestSize: number): void;
  /** The stage's jar has its first cat of `size`: the strip's cats up to it light up and pop. */
  reachSize(size: number): void;
  /** The ball after the one in the dropper: a cat, the magnet or a boulder. */
  setNext(drop: Drop): void;
  /** NEXT took another size (Copycat, GAME_DESIGN §15.13): its cat pops like a merged one. */
  popNext(): void;
  /** A coin landed on the counter. */
  pulseCoins(): void;
  /** Where flying coins land. */
  readonly coinTarget: HTMLElement;
}

function artPath(sprite: HudSprite): string {
  return `${import.meta.env.BASE_URL}${HUD_SPRITE_DIR}${sprite.file}`;
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
}

/**
 * In-game HUD (GAME_DESIGN §2.3), floating over the top of the play area: the goal strip along the
 * top, left of the pause button; on the right the pink pause button, the coins card and the next
 * cat in a round glass bubble under it; on the left the score card, level with the coins card (v0.26). Only
 * the pause button takes touches; the rest lets them through to the game. With `art` the score
 * card, the bubble, the button and the coin are the owner's images (config/hudSprites.ts); the
 * coins card is CSS drawn after the owner's reference image.
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

  const left = el('div', 'hud-left');
  left.append(scoreCard);

  // The goal strip (v0.48, the owner's mockup): the torii with the stage number, the stage's cats
  // in order, and its last cat, the goal, in a gold ring. Cats the stage hasn't had yet are pale.
  const goal = el('div', 'hud-goal hud-card');
  goal.dataset['testid'] = 'hud-goal';
  const stageMark = el('div', 'hud-goal-stage');
  if (art) stageMark.append(artImage(`${MENU_SPRITE_DIR}${MENU_ART.torii.file}`, 'hud-goal-torii'));
  const stage = el('span', 'hud-goal-number', '1');
  stage.dataset['testid'] = 'hud-stage';
  stageMark.append(stage);
  const goalCats = el('div', 'hud-goal-cats');
  const cats = Array.from({ length: SIZE_COUNT }, (_, i) => catIcon(i + 1));
  goalCats.append(...cats.slice(0, -1));
  const slot = el('div', 'hud-goal-slot');
  slot.append(cats[SIZE_COUNT - 1] as HTMLElement);
  goal.append(stageMark, goalCats, slot);
  let goalBest = 0;
  const paintGoal = (best: number, pop: boolean): void => {
    cats.forEach((cat, i) => {
      const made = i < best;
      if (pop && made && i >= goalBest) playAnimation(cat, 'is-reached');
      cat.classList.toggle('is-unmade', !made);
    });
    goalBest = best;
  };

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
  const coin = coinIcon();
  coins.append(coin);
  const coinValue = el('span', '', '0');
  coins.append(coinValue);
  coinsCard.append(el('span', 'hud-label', 'Coins'), coins);

  // The pause button on top, the coins card under it, the bubble under that.
  const right = el('div', 'hud-right');
  right.append(coinsCard, next, pause);

  root.append(goal, left, right);

  function restartAnimation(node: HTMLElement, className: string): void {
    node.classList.remove(className);
    void node.offsetWidth; // restart the CSS animation
    node.classList.add(className);
  }
  /**
   * Starts a CSS animation by adding its class, without restarting it the costly way: reading
   * offsetWidth lays the page out in the middle of the game's frame (the goal strip's pops come
   * from a merge in the physics step). Only one still running restarts like that.
   */
  function playAnimation(node: HTMLElement, className: string): void {
    if (node.classList.contains(className)) restartAnimation(node, className);
    else node.classList.add(className);
  }
  for (const cat of cats) {
    // Cancelled when the game screen hides mid-pop: the class goes too, so the next pop plays.
    const done = (): void => cat.classList.remove('is-reached');
    cat.addEventListener('animationend', done);
    cat.addEventListener('animationcancel', done);
  }
  coinsCard.addEventListener('animationend', () => coinsCard.classList.remove('is-pulsing'));
  nextCat.addEventListener('animationend', () => nextCat.classList.remove('is-copied'));

  return {
    setScore(value) {
      score.textContent = formatNumber(value);
    },
    setCoins(value) {
      coinValue.textContent = formatNumber(value);
    },
    setStage(value, bestSize) {
      stage.textContent = art ? String(value) : `Stage ${value}`;
      stage.classList.toggle('is-long', value >= 100);
      goal.setAttribute('aria-label', `Stage ${value}`);
      const first = stageInfo(value).firstTier;
      cats.forEach((cat, i) => paintCatIcon(cat, first + i));
      paintGoal(bestSize, false);
    },
    reachSize(size) {
      if (size > goalBest) paintGoal(size, true);
    },
    setNext(drop) {
      paintDropIcon(nextCat, drop);
    },
    popNext() {
      restartAnimation(nextCat, 'is-copied');
    },
    pulseCoins() {
      restartAnimation(coinsCard, 'is-pulsing');
    },
    coinTarget: coin,
  };
}
