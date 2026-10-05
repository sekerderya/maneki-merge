import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';

interface TestEvents {
  ping: { n: number };
  pong: string;
}

describe('EventBus', () => {
  it('delivers typed payloads to subscribers in order', () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];
    bus.on('ping', ({ n }) => calls.push(`a${n}`));
    bus.on('ping', ({ n }) => calls.push(`b${n}`));
    bus.on('pong', (s) => calls.push(s));
    bus.emit('ping', { n: 1 });
    bus.emit('pong', 'x');
    expect(calls).toEqual(['a1', 'b1', 'x']);
  });

  it('does nothing when no one listens', () => {
    expect(() => new EventBus<TestEvents>().emit('ping', { n: 1 })).not.toThrow();
  });

  it('unsubscribes with the returned function or off()', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on('ping', a);
    bus.on('ping', b);
    offA();
    offA(); // twice is harmless
    bus.emit('ping', { n: 1 });
    bus.off('ping', b);
    bus.off('pong', b); // never subscribed
    bus.emit('ping', { n: 2 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('ping')).toBe(0);
  });

  it('removes only one registration of a handler subscribed twice', () => {
    const bus = new EventBus<TestEvents>();
    const h = vi.fn();
    bus.on('ping', h);
    bus.on('ping', h);
    bus.off('ping', h);
    bus.emit('ping', { n: 1 });
    expect(h).toHaveBeenCalledTimes(1);
  });

  it('delivers once() a single time', () => {
    const bus = new EventBus<TestEvents>();
    const h = vi.fn();
    bus.once('ping', h);
    bus.emit('ping', { n: 1 });
    bus.emit('ping', { n: 2 });
    expect(h).toHaveBeenCalledExactlyOnceWith({ n: 1 });

    const cancelled = vi.fn();
    bus.once('ping', cancelled)();
    bus.emit('ping', { n: 3 });
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('lets handlers subscribe and unsubscribe during delivery without skipping anyone', () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];
    const late = (): void => void calls.push('late');
    const c = (): void => void calls.push('c');
    bus.on('ping', () => {
      calls.push('a');
      bus.off('ping', c);
      bus.on('ping', late);
    });
    bus.on('ping', () => calls.push('b'));
    bus.on('ping', c);
    bus.emit('ping', { n: 1 });
    // The list was fixed when emit started: c still runs once, late waits for the next emit.
    expect(calls).toEqual(['a', 'b', 'c']);
    calls.length = 0;
    bus.emit('ping', { n: 2 });
    expect(calls).toEqual(['a', 'b', 'late']);
  });

  it('clears one type or everything', () => {
    const bus = new EventBus<TestEvents>();
    bus.on('ping', vi.fn());
    bus.on('pong', vi.fn());
    bus.clear('ping');
    expect(bus.listenerCount('ping')).toBe(0);
    expect(bus.listenerCount('pong')).toBe(1);
    bus.clear();
    expect(bus.listenerCount('pong')).toBe(0);
  });

  it('carries the game events', () => {
    const bus = new EventBus<GameEvents>();
    const h = vi.fn();
    bus.on('merged', h);
    const payload = {
      tier: 3,
      newTier: 4,
      golden: false,
      at: { x: 0, y: -100 },
      score: 8,
      coins: 3,
      combo: 1,
    };
    bus.emit('merged', payload);
    expect(h).toHaveBeenCalledWith(payload);
  });
});
