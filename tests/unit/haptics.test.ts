import { describe, expect, it, vi } from 'vitest';
import { HAPTIC_PATTERNS, HAPTIC_TICK_INTERVAL_MS } from '../../src/config/platform';
import { Haptics } from '../../src/platform/haptics';
import type { Vibrate } from '../../src/platform/haptics';

function setup(vibrate: Vibrate | null = vi.fn(() => true)) {
  let now = 1000;
  const haptics = new Haptics(vibrate, () => now);
  return {
    haptics,
    vibrate,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('Haptics (GAME_DESIGN §12)', () => {
  it('vibrates the configured patterns', () => {
    const { haptics, vibrate } = setup();
    expect(haptics.supported).toBe(true);
    haptics.play('jackpot');
    haptics.play('expansion');
    expect(vibrate).toHaveBeenNthCalledWith(1, [...HAPTIC_PATTERNS.jackpot]);
    expect(vibrate).toHaveBeenNthCalledWith(2, [...HAPTIC_PATTERNS.expansion]);
  });

  it('rate-limits merge ticks', () => {
    const { haptics, vibrate, advance } = setup();
    haptics.play('tick');
    haptics.play('tick');
    advance(HAPTIC_TICK_INTERVAL_MS - 1);
    haptics.play('tick');
    advance(1);
    haptics.play('tick');
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('respects the setting and stops a running pattern when turned off', () => {
    const { haptics, vibrate } = setup();
    haptics.setEnabled(false);
    expect(vibrate).toHaveBeenCalledWith(0);
    haptics.play('jackpot');
    expect(vibrate).toHaveBeenCalledTimes(1);
    haptics.setEnabled(true);
    haptics.play('jackpot');
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a vibration API (iOS) and survives a throwing one', () => {
    const none = setup(null);
    expect(none.haptics.supported).toBe(false);
    expect(() => none.haptics.play('jackpot')).not.toThrow();
    const broken = setup(() => {
      throw new Error('blocked');
    });
    expect(() => broken.haptics.play('jackpot')).not.toThrow();
  });

  it('binds to a navigator that has vibrate', () => {
    const vibrate = vi.fn(() => true);
    const haptics = Haptics.forNavigator({ vibrate } as unknown as Navigator);
    haptics.play('luckySave');
    expect(vibrate).toHaveBeenCalledWith([...HAPTIC_PATTERNS.luckySave]);
    expect(Haptics.forNavigator({} as Navigator).supported).toBe(false);
  });
});
