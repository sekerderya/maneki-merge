import { describe, expect, it } from 'vitest';
import { RUN_SAVE_KEY } from '../../src/config/app';
import { decodeRunSave, RUN_SAVE_VERSION, RunSaveStore } from '../../src/core/runSave';
import type { RunSave } from '../../src/core/runSave';
import { MemoryStorage } from '../../src/core/save';
import type { StorageAdapter } from '../../src/core/save';
import { RunController } from '../../src/run/RunController';

/** A real run's save after a few drops. */
function sample(): RunSave {
  const run = new RunController({ seed: 12 });
  for (let i = 0; i < 400; i++) {
    if (run.canDrop) run.drop((i % 7) * 40 - 120);
    run.tick();
  }
  const snapshot = run.snapshot();
  if (!snapshot) throw new Error('No snapshot');
  return { run: snapshot, recordsBefore: { bestScore: 50, bestStage: 2, highestTier: 6 } };
}

const text = (save: unknown, version = RUN_SAVE_VERSION): string =>
  JSON.stringify({ version, save });

/** A copy of `value` with `path` (dot separated, numbers index arrays) set to `to`. */
function withField(value: unknown, path: string, to: unknown): unknown {
  const copy = structuredClone(value) as Record<string, unknown>;
  const keys = path.split('.');
  let at: Record<string, unknown> = copy;
  for (const key of keys.slice(0, -1)) at = at[key] as Record<string, unknown>;
  at[keys[keys.length - 1]!] = to;
  return copy;
}

class BrokenStorage implements StorageAdapter {
  getItem(): string | null {
    throw new Error('blocked');
  }
  setItem(): void {
    throw new Error('full');
  }
  removeItem(): void {
    throw new Error('blocked');
  }
  keys(): string[] {
    return [];
  }
}

describe('decodeRunSave', () => {
  it('reads what was written', () => {
    const save = sample();
    expect(save.run.world.balls.length).toBeGreaterThan(0);
    expect(decodeRunSave(text(save))).toEqual({ save });
  });

  it('keeps a combo that has not started', () => {
    const save = sample();
    const fresh = withField(save, 'run.economy.comboAtMs', null) as RunSave;
    expect(decodeRunSave(text(fresh))).toEqual({ save: fresh });
  });

  it('drops unreadable text, another version and broken fields', () => {
    const save = sample();
    expect(decodeRunSave('{')).toEqual({ error: 'invalid JSON' });
    expect(decodeRunSave(text(save, RUN_SAVE_VERSION + 1))).toHaveProperty('error');
    expect(decodeRunSave('[]')).toHaveProperty('error');
    const broken: [string, unknown][] = [
      ['run', null],
      ['run.seed', 1.5],
      ['run.state', 'over'],
      ['run.ticks', -1],
      ['run.upgrades.luckyPaw', '2'],
      ['run.levels', []],
      ['run.offer', { kind: 'curse', options: [] }],
      ['run.offer', { kind: 'trial', options: ['nope'] }],
      ['run.pickQueue', 'trial'],
      ['run.expansion', { from: 1, to: 2, picks: 1, elapsedSteps: 0, phase: 'clear' }],
      ['run.expansion', { from: 1, to: 2, picks: true, elapsedSteps: 0, phase: 'boom' }],
      ['run.rng', [1, 2, 3]],
      ['run.queue.current.kind', 'rock'],
      ['run.queue.next.golden', 'yes'],
      ['run.economy.score', Number.NaN],
      ['run.economy.comboAtMs', 'never'],
      ['run.danger.overSteps', 0.5],
      ['run.world.paused', 0],
      ['run.world.balls', {}],
      ['run.world.balls.0', 7],
      ['run.world.balls.0.x', null],
      ['run.world.balls.0.kind', 'magnet'],
      ['recordsBefore.bestScore', -3],
    ];
    for (const [path, to] of broken) {
      expect(decodeRunSave(text(withField(save, path, to))), path).toHaveProperty('error');
    }
  });

  it('reads a snapshot from before hanabi and jokers (v0.27): their levels start at 0', () => {
    const save = sample();
    const old = structuredClone(save) as unknown as {
      run: { levels: Record<string, number>; world: { balls: Record<string, unknown>[] } };
    };
    delete old.run.levels['hanabi'];
    delete old.run.levels['joker'];
    for (const ball of old.run.world.balls) delete ball['struck'];
    expect(decodeRunSave(text(old))).toEqual({ save });
    expect(decodeRunSave(text(withField(save, 'run.world.balls.0.struck', [-1])))).toHaveProperty(
      'error',
    );
  });

  it('accepts a waiting pick inside an expansion', () => {
    const save = sample();
    const picking = withField(
      withField(withField(save, 'run.state', 'choosing'), 'run.offer', {
        kind: 'trial',
        options: ['moreBoulders', 'ironBands'],
      }),
      'run.expansion',
      { from: 1, to: 2, picks: true, elapsedSteps: 80, phase: 'clear' },
    );
    expect(decodeRunSave(text(picking))).toEqual({ save: picking });
  });

  it('accepts a waiting rule pick (Batch 18), with the blessing still to come', () => {
    const save = sample();
    const picking = withField(
      withField(
        withField(withField(save, 'run.state', 'choosing'), 'run.offer', {
          kind: 'rule',
          options: ['echo', 'hubris'],
        }),
        'run.pickQueue',
        ['blessing'],
      ),
      'run.expansion',
      { from: 5, to: 6, picks: true, elapsedSteps: 800, phase: 'reveal' },
    );
    expect(decodeRunSave(text(picking))).toEqual({ save: picking });
    expect(decodeRunSave(text(withField(picking, 'run.pickQueue', ['law'])))).toHaveProperty(
      'error',
    );
  });
});

describe('RunSaveStore', () => {
  it('saves, loads and clears the run under its own key', () => {
    const storage = new MemoryStorage();
    const store = new RunSaveStore(storage);
    expect(store.load()).toEqual({ status: 'empty', save: null });
    const save = sample();
    expect(store.save(save)).toBe(true);
    expect(storage.keys()).toEqual([RUN_SAVE_KEY]);
    expect(store.load()).toEqual({ status: 'ok', save });
    store.clear();
    expect(storage.getItem(RUN_SAVE_KEY)).toBeNull();
  });

  it('drops a run it cannot read', () => {
    const storage = new MemoryStorage();
    storage.setItem(RUN_SAVE_KEY, text(sample(), 0));
    const loaded = new RunSaveStore(storage).load();
    expect(loaded.status).toBe('dropped');
    expect(storage.getItem(RUN_SAVE_KEY)).toBeNull();
  });

  it('never throws when the storage does', () => {
    const store = new RunSaveStore(new BrokenStorage());
    expect(store.load().status).toBe('dropped');
    expect(store.save(sample())).toBe(false);
    expect(() => store.clear()).not.toThrow();
  });
});
