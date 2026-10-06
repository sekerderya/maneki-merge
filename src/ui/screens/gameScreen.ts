import { createBanners } from '../banners/banner';
import type { BannerView } from '../banners/banner';
import { createHint } from '../banners/hint';
import type { HintView } from '../banners/hint';
import { el } from '../dom';
import { createCoinFly } from '../fx/coinFly';
import type { CoinFlyView } from '../fx/coinFly';
import { createHud } from '../hud/hud';
import type { HudActions, HudView } from '../hud/hud';

export interface GameScreenView {
  readonly hud: HudView;
  readonly hint: HintView;
  readonly banners: BannerView;
  /** Coins flying from payouts to the HUD counter. */
  readonly coins: CoinFlyView;
  /** The Phaser canvas mounts here; it fills the play band below the HUD. */
  readonly playArea: HTMLElement;
}

/**
 * The shrine garden behind the jar (GAME_DESIGN §13): sakura branches either side of the dropper,
 * a torii and a shrine seen through the glass. The canvas draws the jar and floor on top.
 */
const SCENERY = `<svg class="play-scenery" viewBox="0 0 390 684" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<path d="M-60 360Q100 310 200 340Q300 370 450 320V700H-60Z" fill="#f6dcc5"/>
<g fill="#d98a78"><path d="M30 170Q95 158 160 170L157 181Q95 171 33 181Z"/><rect x="44" y="196" width="102" height="8"/><rect x="56" y="178" width="11" height="170"/><rect x="123" y="178" width="11" height="170"/></g>
<path d="M220 240Q300 210 380 240L372 250Q300 226 228 250Z" fill="#b98265"/>
<rect x="240" y="246" width="124" height="100" fill="#f1dec6"/>
<g fill="#c99876"><rect x="248" y="246" width="8" height="100"/><rect x="348" y="246" width="8" height="100"/></g>
<rect x="276" y="270" width="52" height="76" fill="#e6cba8"/>
<g fill="none" stroke="#9b6a50" stroke-width="6" stroke-linecap="round"><path d="M-10 62Q40 36 112 40"/><path d="M400 62Q350 36 278 40"/></g>
<g fill="#f7c9d2"><circle cx="18" cy="52" r="18"/><circle cx="46" cy="36" r="16"/><circle cx="76" cy="32" r="14"/><circle cx="102" cy="42" r="11"/><circle cx="62" cy="16" r="11"/><circle cx="372" cy="52" r="18"/><circle cx="344" cy="36" r="16"/><circle cx="314" cy="32" r="14"/><circle cx="288" cy="42" r="11"/><circle cx="328" cy="16" r="11"/></g>
<g fill="#f2afbf"><circle cx="34" cy="44" r="8"/><circle cx="86" cy="38" r="7"/><circle cx="356" cy="44" r="8"/><circle cx="304" cy="38" r="7"/></g>
<g fill="#f2a7b8"><ellipse cx="140" cy="12" rx="4.5" ry="2.6" transform="rotate(30 140 12)"/><ellipse cx="252" cy="20" rx="4.5" ry="2.6" transform="rotate(-25 252 20)"/><ellipse cx="96" cy="170" rx="4" ry="2.4" transform="rotate(60 96 170)"/><ellipse cx="300" cy="140" rx="4" ry="2.4" transform="rotate(-40 300 140)"/></g>
</svg>`;

/** Game screen (GAME_DESIGN §2.3): the DOM HUD on top, the play band with the canvas below. */
export function createGameScreen(root: HTMLElement, actions: HudActions): GameScreenView {
  root.replaceChildren();
  root.classList.add('game-screen');

  const hudRoot = el('header');
  const hud = createHud(hudRoot, actions);

  const playArea = el('div', 'play-area');
  playArea.dataset['testid'] = 'play-area';
  playArea.insertAdjacentHTML('beforeend', SCENERY);
  const hint = createHint(playArea);
  const banners = createBanners(playArea);

  root.append(hudRoot, playArea);
  const coins = createCoinFly(root, playArea, hud.coinTarget);
  return { hud, hint, banners, coins, playArea };
}
