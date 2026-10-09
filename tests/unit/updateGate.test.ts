import { describe, expect, it, vi } from 'vitest';
import { UPDATE_APPLY_DELAY_MS } from '../../src/config/platform';
import { UpdateGate } from '../../src/platform/updateGate';

function setup() {
  const timers: (() => void)[] = [];
  const deps = {
    activate: vi.fn(),
    reload: vi.fn(),
    schedule: vi.fn((run: () => void, delayMs: number) => {
      expect(delayMs).toBe(UPDATE_APPLY_DELAY_MS);
      timers.push(run);
    }),
    onReadyChange: vi.fn(),
  };
  /** Lets the scheduled delays run out. */
  const elapse = (): void => {
    for (const run of timers.splice(0)) run();
  };
  return { gate: new UpdateGate(deps), deps, elapse };
}

describe('UpdateGate', () => {
  it('shows the badge once when a new version is waiting', () => {
    const { gate, deps } = setup();
    gate.markReady();
    gate.markReady();
    expect(gate.isReady).toBe(true);
    expect(deps.onReadyChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('activates on its own once the menu has been idle for the delay, then reloads', () => {
    const { gate, deps, elapse } = setup();
    gate.markReady();
    expect(deps.activate).not.toHaveBeenCalled();
    elapse();
    expect(deps.activate).toHaveBeenCalledOnce();
    expect(deps.reload).not.toHaveBeenCalled();

    gate.onControllerChanged();
    elapse();
    expect(deps.reload).toHaveBeenCalledOnce();
  });

  it('does nothing when nothing is waiting', async () => {
    const { gate, deps, elapse } = setup();
    gate.setMenuActive(true);
    elapse();
    await gate.apply();
    expect(deps.schedule).not.toHaveBeenCalled();
    expect(deps.activate).not.toHaveBeenCalled();
    expect(deps.reload).not.toHaveBeenCalled();
  });

  it('never activates or reloads during a run, and applies once back on the menu', () => {
    const { gate, deps, elapse } = setup();
    gate.setMenuActive(false);
    gate.markReady();
    elapse();
    expect(deps.activate).not.toHaveBeenCalled();

    gate.setMenuActive(true);
    expect(deps.activate).not.toHaveBeenCalled();
    elapse();
    expect(deps.activate).toHaveBeenCalledOnce();
    gate.onControllerChanged();
    elapse();
    expect(deps.reload).toHaveBeenCalledOnce();
  });

  it('drops a pending apply when the player leaves the menu before the delay ends', () => {
    const { gate, deps, elapse } = setup();
    gate.markReady();
    gate.setMenuActive(false);
    // Back on the menu just before the old delay ends: a full new delay starts.
    gate.setMenuActive(true);
    elapse();
    expect(deps.activate).not.toHaveBeenCalled();
    elapse();
    expect(deps.activate).toHaveBeenCalledOnce();
  });

  it('does not reload when the player starts a run while the update activates', () => {
    const { gate, deps, elapse } = setup();
    gate.markReady();
    elapse();
    gate.setMenuActive(false);
    gate.onControllerChanged();
    elapse();
    expect(deps.reload).not.toHaveBeenCalled();

    gate.setMenuActive(true);
    elapse();
    expect(deps.activate).toHaveBeenCalledOnce();
    expect(deps.reload).toHaveBeenCalledOnce();
  });

  it('does not reload when another window activates the update during a run', () => {
    const { gate, deps, elapse } = setup();
    gate.setMenuActive(false);
    gate.onControllerChanged();
    elapse();
    expect(deps.reload).not.toHaveBeenCalled();
    expect(gate.isReady).toBe(true);
    expect(deps.onReadyChange).toHaveBeenCalledWith(true);

    // Back on the menu it reloads directly (the new worker is already in control).
    gate.setMenuActive(true);
    elapse();
    expect(deps.activate).not.toHaveBeenCalled();
    expect(deps.reload).toHaveBeenCalledOnce();
  });

  it('schedules and activates once, however often the menu state is reported', () => {
    const { gate, deps, elapse } = setup();
    gate.markReady();
    gate.setMenuActive(true);
    gate.setMenuActive(true);
    expect(deps.schedule).toHaveBeenCalledOnce();
    elapse();
    gate.setMenuActive(true);
    elapse();
    expect(deps.activate).toHaveBeenCalledOnce();
  });

  it('applies at once when the player taps the badge, retrying a stalled activation', async () => {
    const { gate, deps, elapse } = setup();
    gate.markReady();
    await gate.apply();
    expect(deps.activate).toHaveBeenCalledOnce();
    elapse();
    expect(deps.activate).toHaveBeenCalledOnce();
    await gate.apply();
    expect(deps.activate).toHaveBeenCalledTimes(2);
  });

  it('ignores a tap during a run', async () => {
    const { gate, deps } = setup();
    gate.setMenuActive(false);
    gate.markReady();
    await gate.apply();
    expect(deps.activate).not.toHaveBeenCalled();
  });

  it('reloads only once', () => {
    const { gate, deps, elapse } = setup();
    gate.onControllerChanged();
    elapse();
    gate.setMenuActive(true);
    gate.markReady();
    elapse();
    expect(deps.reload).toHaveBeenCalledOnce();
  });
});
