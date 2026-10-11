import { describe, expect, it } from 'vitest';
import { SPAWN_START_RADIUS_SHARE } from '../../src/config/picks';
import { sizeRadius, tierCoins } from '../../src/config/tiers';
import { coinPayout } from '../../src/core/economy';
import type { GameEvents } from '../../src/core/events';
import { RunController } from '../../src/run/RunController';

/** A run with Echo on that logs its merges and echoes. */
function setup(seed = 1, hubris = false) {
  const run = new RunController({ seed });
  run.setPickLevel('echo', 1);
  if (hubris) run.setPickLevel('hubris', 1);
  const echoes: GameEvents['echoed'][] = [];
  const merges: GameEvents['merged'][] = [];
  run.events.on('echoed', (e) => echoes.push(e));
  run.events.on('merged', (e) => merges.push(e));
  return { run, echoes, merges };
}

/** Two cats of `size` (stage 1) side by side on the floor around `centre`, merging next step. */
function pair(run: RunController, size: number, centre = 0, golden = false) {
  const r = sizeRadius(size);
  run.spawnBall(size, centre - r + 1, -r, { golden });
  run.spawnBall(size, centre + r - 1, -r);
}

function ticks(run: RunController, n: number): void {
  for (let i = 0; i < n; i++) run.tick();
}

describe('Echo (GAME_DESIGN §15.11)', () => {
  it.each([4, 5, 6, 7])('leaves a %i beside the cat a pair of them makes', (size) => {
    const { run, echoes, merges } = setup();
    // Left of the middle, so it fits at least on the right.
    pair(run, size, -120);
    run.tick();
    expect(merges).toHaveLength(1);
    expect(echoes).toHaveLength(1);
    const [echo] = echoes;
    expect(echo).toMatchObject({ tier: size, from: merges[0]!.id });
    // Level with the new cat, just touching it once both have grown.
    const reach = sizeRadius(size + 1) + sizeRadius(size);
    expect(Math.abs(echo!.at.x - merges[0]!.at.x)).toBeCloseTo(reach, 6);
    expect(echo!.at.y).toBe(merges[0]!.at.y);
    const ball = run.balls.find((b) => b.id === echo!.id)!;
    expect(ball).toMatchObject({ tier: size, golden: false, cracked: false });
    expect(ball.radius).toBeCloseTo(SPAWN_START_RADIUS_SHARE * sizeRadius(size), 6);
    expect(ball.landedMs).toBeGreaterThanOrEqual(0);
  });

  it("doesn't echo sizes 1–3, the stage's last cat or a joker's merge", () => {
    for (const size of [1, 2, 3, 8]) {
      const { run, echoes, merges } = setup();
      pair(run, size);
      run.tick();
      expect(merges.length, `size ${size}`).toBeGreaterThan(0);
      expect(echoes).toEqual([]);
    }
    // Two golden 7s make the last cat (size 9): no echo either.
    const golden = setup();
    pair(golden.run, 7, 0, true);
    golden.run.tick();
    expect(golden.merges[0]!.newTier).toBe(9);
    expect(golden.echoes).toEqual([]);
    // A joker's merge with a 5.
    const joker = setup();
    const r = sizeRadius(5);
    joker.run.spawnBall(5, 0, -r);
    joker.run.spawnBall(2, 0, -2 * r - sizeRadius(2) + 2, { kind: 'joker' });
    ticks(joker.run, 3);
    expect(joker.merges[0]).toMatchObject({ tier: 5, joker: true });
    expect(joker.echoes).toEqual([]);
  });

  it('echoes golden merges too, at the merged size', () => {
    const { run, echoes, merges } = setup();
    pair(run, 4, 0, true);
    run.tick();
    expect(merges[0]).toMatchObject({ tier: 4, newTier: 6 });
    expect(echoes[0]!.tier).toBe(4);
  });

  it('picks its side with the seed, either side across seeds', () => {
    const side = (seed: number): number => {
      const { run, echoes, merges } = setup(seed);
      pair(run, 4);
      run.tick();
      return Math.sign(echoes[0]!.at.x - merges[0]!.at.x);
    };
    expect(side(3)).toBe(side(3));
    expect(new Set(Array.from({ length: 16 }, (_, seed) => side(seed)))).toEqual(new Set([-1, 1]));
  });

  it('goes to the other side by a wall, and above when neither side fits', () => {
    // A pair of 5s against the right wall: the echo always goes left.
    for (let seed = 0; seed < 6; seed++) {
      const { run, echoes, merges } = setup(seed);
      pair(run, 5, 300 - 2 * sizeRadius(5));
      run.tick();
      expect(echoes[0]!.at.x).toBeLessThan(merges[0]!.at.x);
    }
    // Two 7s in the middle make an 8: a 7 fits on neither side, so it goes on top.
    const { run, echoes, merges } = setup();
    pair(run, 7);
    run.tick();
    expect(echoes[0]!.at.x).toBe(merges[0]!.at.x);
    expect(echoes[0]!.at.y).toBeCloseTo(merges[0]!.at.y - sizeRadius(8) - sizeRadius(7), 6);
  });

  it('pays nothing, and its cat merges later like any cat', () => {
    const { run, echoes, merges } = setup();
    pair(run, 4, -100);
    run.tick();
    expect(run.coins).toBe(coinPayout(tierCoins(4), 1, 0));
    // A 4 dropped on the echo merges with it.
    const echo = run.balls.find((b) => b.id === echoes[0]!.id)!;
    run.spawnBall(4, echo.x, echo.y - 200);
    ticks(run, 240);
    expect(merges.some((m) => m.tier === 4 && m !== merges[0])).toBe(true);
  });

  it('with Hubris, three 5s make a 7 and a 5', () => {
    const { run, echoes, merges } = setup(1, true);
    const r = sizeRadius(5);
    for (let i = 0; i < 3; i++) run.spawnBall(5, -250 + r + i * (2 * r - 2), -r);
    run.tick();
    expect(merges[0]).toMatchObject({ tier: 5, newTier: 7, parts: 3 });
    expect(echoes[0]!.tier).toBe(5);
  });
});
