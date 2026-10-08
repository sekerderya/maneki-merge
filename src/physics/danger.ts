/**
 * The danger line (GAME_DESIGN §6). A cat is over the line when its top edge is above the rim.
 * It only counts once it has landed (first contact) and LANDING_GRACE_MS has passed. When at
 * least one counted cat stays over the line for DANGER_TIMEOUT_MS without a break, the run ends,
 * unless a Lucky Save replaces the game over.
 */
import { LUCKY_SAVE_SMALLEST_POPS } from '../config/economy';
import { PHYSICS_STEP_MS, stepsFor } from '../config/physics';
import { DANGER_TIMEOUT_MS, LANDING_GRACE_MS } from '../config/timings';
import type { BallView } from './balls';

export function isOverLine(cat: BallView, rimY: number): boolean {
  return cat.y - cat.radius < rimY;
}

/** Landed, and the landing grace is over. Half a step of slack absorbs floating-point noise. */
export function countsForDanger(cat: BallView, nowMs: number): boolean {
  return cat.landedMs >= 0 && nowMs - cat.landedMs >= LANDING_GRACE_MS - PHYSICS_STEP_MS / 2;
}

export type DangerStatus = 'safe' | 'danger' | 'timeout';

/** The over-the-line timer. Call `update` once per physics step. */
export class DangerMonitor {
  private readonly timeoutSteps: number;
  private overSteps = 0;
  private graceSteps = 0;

  constructor(timeoutMs = DANGER_TIMEOUT_MS) {
    this.timeoutSteps = stepsFor(timeoutMs);
  }

  /** True while a counted cat is over the line (the rim flashes and the countdown shows). */
  get active(): boolean {
    return this.overSteps > 0;
  }

  /** Time left before the timer runs out; the full timeout while safe. */
  get remainingMs(): number {
    return (this.timeoutSteps - this.overSteps) * PHYSICS_STEP_MS;
  }

  /** True while the danger check is off after a Lucky Save. */
  get inGrace(): boolean {
    return this.graceSteps > 0;
  }

  update(cats: readonly BallView[], rimY: number, nowMs: number): DangerStatus {
    if (this.graceSteps > 0) {
      this.graceSteps--;
      this.overSteps = 0;
      return 'safe';
    }
    let over = false;
    for (const cat of cats) {
      if (countsForDanger(cat, nowMs) && isOverLine(cat, rimY)) {
        over = true;
        break;
      }
    }
    if (!over) {
      this.overSteps = 0;
      return 'safe';
    }
    this.overSteps++;
    return this.overSteps >= this.timeoutSteps ? 'timeout' : 'danger';
  }

  /** Clears the timer and turns the check off for `graceMs` (a Lucky Save, an expansion). */
  reset(graceMs = 0): void {
    this.overSteps = 0;
    this.graceSteps = stepsFor(graceMs);
  }
}

/**
 * The balls a Lucky Save pops (GAME_DESIGN §6): every landed ball over the line (boulders too,
 * §15.3), plus the `count` smallest of the other landed cats (smaller tier first, then older
 * first; boulders don't count among them). A ball still falling from the dropper is left alone.
 * Returned oldest first.
 */
export function luckySaveVictims<T extends BallView>(
  cats: readonly T[],
  rimY: number,
  count = LUCKY_SAVE_SMALLEST_POPS,
): T[] {
  const over: T[] = [];
  const rest: T[] = [];
  for (const cat of cats) {
    if (cat.landedMs < 0) continue;
    if (isOverLine(cat, rimY)) over.push(cat);
    else if (cat.kind === 'cat') rest.push(cat);
  }
  rest.sort((a, b) => a.tier - b.tier || a.id - b.id);
  const victims = over.concat(rest.slice(0, count));
  return victims.sort((a, b) => a.id - b.id);
}
