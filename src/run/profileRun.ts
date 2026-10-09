/**
 * A run tied to the player's profile (GAME_DESIGN §5, §9, §11): it starts with the profile's
 * upgrade levels, banks every payout into the wallet before the payout's event fires, and keeps
 * records and stats up to date while it plays, so quitting, a reload or a crash loses nothing.
 */
import type { EventBus } from '../core/events';
import type { GameEvents } from '../core/events';
import type { Profile } from '../core/profile';
import type { RunSnapshot } from '../core/runSave';
import { RunController } from './RunController';

export interface ProfileRunOptions {
  readonly seed: number;
  /** Subscribe before passing it in: the run emits `runStarted` while it is being built. */
  readonly events?: EventBus<GameEvents>;
  readonly instantExpansion?: boolean;
}

/**
 * Continues a saved run (GAME_DESIGN §11) with the upgrades it started with. It doesn't count as
 * a new run. Throws a RangeError when this version can't hold the snapshot.
 */
export function resumeProfileRun(
  profile: Profile,
  saved: RunSnapshot,
  options: Omit<ProfileRunOptions, 'seed'> = {},
): RunController {
  return connect(
    profile,
    RunController.restore(saved, { ...options, bank: (coins) => profile.earn(coins) }),
  );
}

export function startProfileRun(profile: Profile, options: ProfileRunOptions): RunController {
  profile.runStarted();
  const run = new RunController({
    ...options,
    upgrades: profile.upgrades,
    bank: (coins) => profile.earn(coins),
  });
  return connect(profile, run);
}

/** Keeps the profile's records and stats up to date while the run plays. */
function connect(profile: Profile, run: RunController): RunController {
  const events = run.events;
  events.on('merged', (e) => profile.merged(e.newTier));
  events.on('jackpot', () => profile.jackpot());
  events.on('scoreChanged', () => profile.recordProgress(run.score, run.stage));
  events.on('expansionRevealed', () => profile.recordProgress(run.score, run.stage));
  // A run's end is a natural moment to write everything that is still pending.
  events.on('gameOver', () => profile.flush());
  return run;
}
