/**
 * A run tied to the player's profile (GAME_DESIGN §5, §9, §11): it starts with the profile's
 * upgrade levels, banks every payout into the wallet before the payout's event fires, and keeps
 * records and stats up to date while it plays, so quitting, a reload or a crash loses nothing.
 */
import type { EventBus } from '../core/events';
import type { GameEvents } from '../core/events';
import type { Profile } from '../core/profile';
import { RunController } from './RunController';

export interface ProfileRunOptions {
  readonly seed: number;
  /** Subscribe before passing it in: the run emits `runStarted` while it is being built. */
  readonly events?: EventBus<GameEvents>;
  readonly instantExpansion?: boolean;
}

export function startProfileRun(profile: Profile, options: ProfileRunOptions): RunController {
  profile.runStarted();
  const run = new RunController({
    ...options,
    upgrades: profile.upgrades,
    bank: (coins) => profile.earn(coins),
  });
  const events = run.events;
  events.on('merged', (e) => profile.merged(e.newTier));
  events.on('jackpot', () => profile.jackpot());
  events.on('scoreChanged', () => profile.recordProgress(run.score, run.stage));
  events.on('expansionRevealed', () => profile.recordProgress(run.score, run.stage));
  // A run's end is a natural moment to write everything that is still pending.
  events.on('gameOver', () => profile.flush());
  return run;
}
