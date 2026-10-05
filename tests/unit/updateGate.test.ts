import { describe, expect, it, vi } from 'vitest';
import { UpdateGate } from '../../src/platform/updateGate';

function setup() {
  const deps = {
    activate: vi.fn(),
    reload: vi.fn(),
    onReadyChange: vi.fn(),
  };
  return { gate: new UpdateGate(deps), deps };
}

describe('UpdateGate', () => {
  it('shows the badge once when a new version is waiting', () => {
    const { gate, deps } = setup();
    gate.markReady();
    gate.markReady();
    expect(gate.isReady).toBe(true);
    expect(deps.onReadyChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('activates and then reloads when the player taps the badge on the menu', async () => {
    const { gate, deps } = setup();
    gate.markReady();
    await gate.apply();
    expect(deps.activate).toHaveBeenCalledOnce();
    expect(deps.reload).not.toHaveBeenCalled();

    gate.onControllerChanged();
    expect(deps.reload).toHaveBeenCalledOnce();
  });

  it('does nothing when nothing is waiting', async () => {
    const { gate, deps } = setup();
    await gate.apply();
    expect(deps.activate).not.toHaveBeenCalled();
  });

  it('never activates or reloads during a run', async () => {
    const { gate, deps } = setup();
    gate.markReady();
    gate.setMenuActive(false);
    await gate.apply();
    expect(deps.activate).not.toHaveBeenCalled();
    expect(deps.reload).not.toHaveBeenCalled();
  });

  it('does not reload when another window activates the update during a run', async () => {
    const { gate, deps } = setup();
    gate.setMenuActive(false);
    gate.onControllerChanged();
    expect(deps.reload).not.toHaveBeenCalled();
    expect(gate.isReady).toBe(true);
    expect(deps.onReadyChange).toHaveBeenCalledWith(true);

    // Back on the menu, the badge reloads directly (the new worker is already in control).
    gate.setMenuActive(true);
    expect(deps.reload).not.toHaveBeenCalled();
    await gate.apply();
    expect(deps.activate).not.toHaveBeenCalled();
    expect(deps.reload).toHaveBeenCalledOnce();
  });

  it('does not reload on the menu unless the player asked for it', () => {
    const { gate, deps } = setup();
    gate.onControllerChanged();
    expect(deps.reload).not.toHaveBeenCalled();
    expect(gate.isReady).toBe(true);
  });

  it('ignores repeated taps while applying', async () => {
    const { gate, deps } = setup();
    gate.markReady();
    await gate.apply();
    await gate.apply();
    expect(deps.activate).toHaveBeenCalledOnce();
  });
});
