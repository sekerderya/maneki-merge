/**
 * Sound and haptics for a run (GAME_DESIGN §12): maps the run's events to sound effects and
 * vibration patterns. Composition only; the sounds live in `audio/`, the vibration in `platform/`.
 */
import type { SoundName } from './config/audio';
import type { HapticPattern } from './config/platform';
import { COMBO_BANNER_MIN } from './config/economy';
import type { EventBus, GameEvents } from './core/events';

export interface FeedbackOutputs {
  play(name: SoundName, value?: number): void;
  vibrate(name: HapticPattern): void;
}

/** Subscribes a run's events; returns the matching unsubscribe function. */
export function connectRunFeedback(events: EventBus<GameEvents>, out: FeedbackOutputs): () => void {
  const offs = [
    events.on('catDropped', () => out.play('drop')),
    events.on('merged', (e) => {
      // Lower for bigger cats: every stage sounds the same.
      out.play('merge', e.newSize);
      out.play('coin');
      out.vibrate('tick');
    }),
    events.on('comboChanged', (e) => {
      if (e.combo >= COMBO_BANNER_MIN) out.play('combo', e.combo);
    }),
    events.on('jackpot', () => {
      out.play('jackpot');
      out.vibrate('jackpot');
    }),
    events.on('catPopped', () => out.play('coin')),
    // The stage's last cat: the big fanfare, whether or not the jar can grow.
    events.on('stageCleared', () => {
      out.play('jackpot');
      out.vibrate('jackpot');
    }),
    events.on('expansionStarted', () => {
      out.play('whoosh');
      out.vibrate('expansion');
    }),
    events.on('expansionRevealed', () => out.play('chime')),
    events.on('luckySave', () => {
      out.play('chime');
      out.vibrate('luckySave');
    }),
    events.on('dangerTick', (e) => out.play('dangerTick', e.secondsLeft)),
    events.on('gameOver', () => out.play('gameOver')),
  ];
  return () => {
    for (const off of offs) off();
  };
}
