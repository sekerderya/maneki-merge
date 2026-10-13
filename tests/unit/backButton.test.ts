import { describe, expect, it, vi } from 'vitest';
import { BackStack } from '../../src/platform/backButton';
import type { HistoryLike, PopStateTarget } from '../../src/platform/backButton';

/** A browser history stand-in: `back()` pops an entry and fires popstate asynchronously-ish. */
class FakeBrowser implements HistoryLike, PopStateTarget {
  entries = 1;
  private listeners: (() => void)[] = [];

  pushState(): void {
    this.entries++;
  }

  back(): void {
    if (this.entries <= 1) return;
    this.entries--;
    for (const listener of this.listeners) listener();
  }

  /** The hardware back button or a swipe-back gesture. */
  pressBack(): void {
    this.back();
  }

  addEventListener(_type: 'popstate', listener: () => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: 'popstate', listener: () => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
}

/** A browser whose `back()` lands later, like a real one: `land()` delivers it. */
class SlowBrowser extends FakeBrowser {
  private queued = 0;

  override back(): void {
    this.queued++;
  }

  land(): void {
    for (; this.queued > 0; this.queued--) super.back();
  }
}

describe('BackStack', () => {
  it('pushes a layer opened while its own back is on the way only once that back has landed', () => {
    const browser = new SlowBrowser();
    const stack = new BackStack(browser, browser);
    const panel = stack.push(vi.fn());
    expect(browser.entries).toBe(2);
    // A Scenes row: the panel closes and the game opens in the same tap.
    stack.release(panel);
    const onGameBack = vi.fn();
    stack.push(onGameBack);
    expect(browser.entries).toBe(2);
    browser.land();
    expect(browser.entries).toBe(2);
    expect(stack.depth).toBe(1);
    // Back leaves the game, not the app.
    browser.pressBack();
    browser.land();
    expect(onGameBack).toHaveBeenCalledOnce();
    expect(browser.entries).toBe(1);
  });

  it('drops a layer released before its entry was pushed', () => {
    const browser = new SlowBrowser();
    const stack = new BackStack(browser, browser);
    stack.release(stack.push(vi.fn()));
    const late = stack.push(vi.fn());
    stack.release(late);
    browser.land();
    expect(browser.entries).toBe(1);
    expect(stack.depth).toBe(0);
  });

  it('runs the topmost handler when back is pressed', () => {
    const browser = new FakeBrowser();
    const stack = new BackStack(browser, browser);
    const game = vi.fn();
    const pause = vi.fn();
    stack.push(game);
    stack.push(pause);

    browser.pressBack();
    expect(pause).toHaveBeenCalledOnce();
    expect(game).not.toHaveBeenCalled();
    expect(stack.depth).toBe(1);

    browser.pressBack();
    expect(game).toHaveBeenCalledOnce();
    expect(stack.depth).toBe(0);
    expect(browser.entries).toBe(1);
  });

  it('removes the history entry when a layer is closed from the UI, without running its handler', () => {
    const browser = new FakeBrowser();
    const stack = new BackStack(browser, browser);
    const onBack = vi.fn();
    const token = stack.push(onBack);
    expect(browser.entries).toBe(2);

    stack.release(token);
    expect(onBack).not.toHaveBeenCalled();
    expect(stack.depth).toBe(0);
    expect(browser.entries).toBe(1);
  });

  it('keeps the history from growing over many open/close cycles', () => {
    const browser = new FakeBrowser();
    const stack = new BackStack(browser, browser);
    for (let i = 0; i < 20; i++) stack.release(stack.push(() => undefined));
    expect(browser.entries).toBe(1);
  });

  it('ignores releasing a layer that is not on top or already gone', () => {
    const browser = new FakeBrowser();
    const stack = new BackStack(browser, browser);
    const first = stack.push(() => undefined);
    stack.push(() => undefined);

    stack.release(first);
    expect(stack.depth).toBe(2);

    browser.pressBack();
    browser.pressBack();
    stack.release(first);
    expect(stack.depth).toBe(0);
    expect(browser.entries).toBe(1);
  });

  it('lets back fall through to the system when no layer is open', () => {
    const browser = new FakeBrowser();
    const stack = new BackStack(browser, browser);
    expect(() => browser.pressBack()).not.toThrow();
    expect(stack.depth).toBe(0);
  });

  it('stops listening after dispose', () => {
    const browser = new FakeBrowser();
    const stack = new BackStack(browser, browser);
    const onBack = vi.fn();
    stack.push(onBack);
    stack.dispose();
    browser.pressBack();
    expect(onBack).not.toHaveBeenCalled();
  });
});
