import { describe, expect, it, vi } from 'vitest';
import { browserNetwork, NetworkState, pluginNetwork } from '../../src/platform/network';
import type { NetworkPluginLike, OnlineEvents } from '../../src/platform/network';

describe('NetworkState', () => {
  it('reports its state and tells listeners only about real changes', () => {
    const network = new NetworkState(true);
    const heard: boolean[] = [];
    const stop = network.onChange((online) => heard.push(online));
    network.set(true);
    network.set(false);
    network.set(false);
    network.set(true);
    stop();
    network.set(false);
    expect(heard).toEqual([false, true]);
    expect(network.online).toBe(false);
  });
});

describe('browserNetwork', () => {
  it('follows navigator.onLine and the online / offline events', () => {
    const handlers = new Map<string, () => void>();
    const target: OnlineEvents = { addEventListener: (type, fn) => handlers.set(type, fn) };
    const network = browserNetwork({ onLine: false }, target);
    const listener = vi.fn();
    network.onChange(listener);
    expect(network.online).toBe(false);
    handlers.get('online')?.();
    expect(network.online).toBe(true);
    handlers.get('offline')?.();
    expect(network.online).toBe(false);
    expect(listener.mock.calls).toEqual([[true], [false]]);
  });
});

describe('pluginNetwork', () => {
  const fakePlugin = (connected: boolean | Error) => {
    let listener: (status: { connected: boolean }) => void = () => undefined;
    const plugin: NetworkPluginLike = {
      getStatus: () =>
        connected instanceof Error ? Promise.reject(connected) : Promise.resolve({ connected }),
      addListener: (_event, fn) => {
        listener = fn;
        return Promise.resolve({ remove: () => Promise.resolve() });
      },
    };
    return { plugin, change: (value: boolean) => listener({ connected: value }) };
  };

  it("starts from the plugin's status and follows its change events", async () => {
    const { plugin, change } = fakePlugin(true);
    const network = await pluginNetwork(plugin);
    expect(network.online).toBe(true);
    change(false);
    expect(network.online).toBe(false);
  });

  it("counts as offline when the plugin can't tell", async () => {
    const { plugin } = fakePlugin(new Error('no status'));
    expect((await pluginNetwork(plugin)).online).toBe(false);
  });
});
