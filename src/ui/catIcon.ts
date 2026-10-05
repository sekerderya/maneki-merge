import { GOLD_RING, OUTLINE_DARKEN, TIER_COLORS } from '../config/skin';
import { darken } from '../core/color';
import { el } from './dom';

/**
 * A cat as a DOM icon (TECH_SPEC §7): a CSS circle with the tier number, coloured from the same
 * skin data as the placeholder sprites. Size comes from CSS (`--size`).
 */
export function catIcon(tier: number, golden: boolean): HTMLElement {
  const icon = el('span', 'cat-icon', String(tier));
  paintCatIcon(icon, tier, golden);
  return icon;
}

export function paintCatIcon(icon: HTMLElement, tier: number, golden: boolean): void {
  const color = TIER_COLORS[tier - 1] ?? '#cccccc';
  icon.textContent = String(tier);
  icon.style.setProperty('--cat-color', color);
  icon.style.setProperty('--cat-outline', golden ? GOLD_RING : darken(color, OUTLINE_DARKEN));
  icon.classList.toggle('is-golden', golden);
  icon.classList.toggle('is-two-digits', tier >= 10);
  icon.dataset['tier'] = String(tier);
}
