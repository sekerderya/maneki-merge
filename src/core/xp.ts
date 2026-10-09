/**
 * The run's XP and levels (GAME_DESIGN §15.6): what a merge gives, what each level needs, and the
 * running total. Pure.
 */
import {
  XP_COMBO_MAX_STEPS,
  XP_COMBO_STEP,
  XP_FIRST_LEVEL,
  XP_LEVEL_GROWTH,
  XP_START_LEVEL,
} from '../config/xp';
import { roundStable } from './math';

/** The XP from `level` to the next level. */
export function xpToNext(level: number): number {
  return Math.round(XP_FIRST_LEVEL * XP_LEVEL_GROWTH ** (level - XP_START_LEVEL));
}

/** The combo's share on top of a merge's XP: XP_COMBO_STEP per step past the first, capped. */
export function xpComboBonus(combo: number): number {
  return XP_COMBO_STEP * Math.min(Math.max(combo - 1, 0), XP_COMBO_MAX_STEPS);
}

/**
 * A merge that makes a cat of `size` (1–9) at `combo`: size × (1 + combo bonus), halves rounded
 * up.
 */
export function mergeXp(size: number, combo: number): number {
  return roundStable(size * (1 + xpComboBonus(combo)));
}

/** The run's level and the XP towards the next one. */
export class XpTracker {
  private currentLevel = XP_START_LEVEL;
  private currentXp = 0;

  get level(): number {
    return this.currentLevel;
  }

  /** XP gathered towards the next level. */
  get xp(): number {
    return this.currentXp;
  }

  get toNext(): number {
    return xpToNext(this.currentLevel);
  }

  /** Adds XP; returns how many levels it gained (several when one gain crosses more than one). */
  add(amount: number): number {
    if (!(amount > 0)) return 0;
    this.currentXp += amount;
    let gained = 0;
    while (this.currentXp >= this.toNext) {
      this.currentXp -= this.toNext;
      this.currentLevel++;
      gained++;
    }
    return gained;
  }
}
