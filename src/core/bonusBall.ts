/**
 * The bonus ball a rewarded ad gives (GAME_DESIGN §2.7): one of AD_BALL_KINDS per stage, rolled on
 * a generator of its own from the run's seed and the stage, so it is the same every time the
 * stage is played with that seed and never moves the run's other rolls.
 */
import { AD_BALL_KINDS, AD_BALL_SALT } from '../config/ads';
import type { AdBallKind } from '../config/ads';
import { Rng } from './rng';

/** Spreads the stages apart before they meet the seed (the golden ratio's 32 bits). */
const STAGE_MIX = 0x9e3779b1;

export function bonusBallKind(seed: number, stage: number): AdBallKind {
  const rng = new Rng((seed ^ AD_BALL_SALT ^ Math.imul(stage, STAGE_MIX)) >>> 0);
  return AD_BALL_KINDS[rng.int(0, AD_BALL_KINDS.length - 1)] as AdBallKind;
}
