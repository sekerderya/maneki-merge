import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { connectRunFeedback } from '../../src/feedback';

describe('run feedback wiring (GAME_DESIGN §12)', () => {
  it('maps run events to sounds and haptics', () => {
    const events = new EventBus<GameEvents>();
    const log: string[] = [];
    const off = connectRunFeedback(events, {
      play: (name, value) => log.push(value === undefined ? name : `${name}:${value}`),
      vibrate: (name) => log.push(`buzz:${name}`),
    });
    const at = { x: 0, y: 0 };
    events.emit('catDropped', { tier: 1, golden: false, x: 0 });
    // Stage 2: tier 16 is size 5, and the pitch follows the size.
    events.emit('merged', {
      id: 1,
      tier: 15,
      newTier: 16,
      newSize: 5,
      golden: false,
      at,
      score: 1,
      coins: 1,
      combo: 1,
    });
    events.emit('comboChanged', { combo: 1 });
    events.emit('comboChanged', { combo: 3 });
    events.emit('jackpot', { tier: 7, golden: false, at, score: 1, coins: 1, combo: 1 });
    events.emit('catPopped', { id: 2, tier: 1, golden: false, at, coins: 1, reason: 'cashOut' });
    events.emit('stageCleared', { stage: 1, tier: 12, next: 'expand' });
    events.emit('expansionStarted', { from: 1, to: 2 });
    events.emit('expansionRevealed', { stage: 2, newTiers: [13, 23] });
    events.emit('luckySave', { savesLeft: 0 });
    events.emit('dangerTick', { secondsLeft: 2 });
    events.emit('gameOver', { score: 0, stage: 1, coins: 0, highestTier: 0 });
    expect(log).toEqual([
      'drop',
      'merge:5',
      'coin',
      'buzz:tick',
      'combo:3',
      'jackpot',
      'buzz:jackpot',
      'coin',
      'jackpot',
      'buzz:jackpot',
      'whoosh',
      'buzz:expansion',
      'chime',
      'chime',
      'buzz:luckySave',
      'dangerTick:2',
      'gameOver',
    ]);

    off();
    events.emit('catDropped', { tier: 1, golden: false, x: 0 });
    expect(log).toHaveLength(17);
  });
});
