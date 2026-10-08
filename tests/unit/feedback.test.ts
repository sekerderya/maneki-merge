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
    events.emit('catDropped', { tier: 1, x: 0 });
    // Stage 2: tier 15 is size 5, and the pitch follows the size.
    events.emit('merged', {
      id: 1,
      tier: 14,
      newTier: 15,
      newSize: 5,
      golden: false,
      at,
      score: 1,
      coins: 1,
      combo: 1,
    });
    events.emit('comboChanged', { combo: 1 });
    events.emit('comboChanged', { combo: 3 });
    events.emit('jackpot', { tier: 7, at, score: 1, coins: 1, combo: 1 });
    events.emit('catPopped', { id: 2, tier: 1, at, coins: 1, reason: 'cashOut' });
    events.emit('stageCleared', { stage: 1, tier: 11, next: 'expand' });
    events.emit('expansionStarted', { from: 1, to: 2 });
    events.emit('expansionRevealed', { stage: 2, newTiers: [12, 21] });
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
    events.emit('catDropped', { tier: 1, x: 0 });
    expect(log).toHaveLength(17);
  });

  it('rings a bell when a golden cat merges', () => {
    const events = new EventBus<GameEvents>();
    const log: string[] = [];
    connectRunFeedback(events, {
      play: (name) => log.push(name),
      vibrate: (name) => log.push('buzz:' + name),
    });
    const at = { x: 0, y: 0 };
    const merge = { id: 1, tier: 3, newTier: 4, newSize: 4, at, score: 1, coins: 3, combo: 1 };
    events.emit('merged', { ...merge, golden: true });
    events.emit('jackpot', { tier: 46, at, score: 1, coins: 1, combo: 1 });
    expect(log).toEqual(['merge', 'coin', 'chime', 'buzz:tick', 'jackpot', 'buzz:jackpot']);
  });
});
