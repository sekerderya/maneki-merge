import { describe, expect, it } from 'vitest';
import { echoSpot, pieceSpots } from '../../src/physics/spawns';

const jar = { halfWidth: 300 };

describe("a broken cat's pieces (GAME_DESIGN §15.10)", () => {
  it('sit side by side across its centre', () => {
    expect(pieceSpots(20, 50, jar)).toEqual([-30, 70]);
  });

  it('move together to stay inside the walls', () => {
    expect(pieceSpots(280, 50, jar)).toEqual([150, 250]);
    expect(pieceSpots(-280, 50, jar)).toEqual([-250, -150]);
  });
});

describe('an echo cat (GAME_DESIGN §15.11)', () => {
  it('sits level with the new cat on its side, just touching it', () => {
    expect(echoSpot(0, -100, 82, 69, 1, jar)).toEqual({ x: 151, y: -100 });
    expect(echoSpot(0, -100, 82, 69, -1, jar)).toEqual({ x: -151, y: -100 });
  });

  it('takes the other side by a wall, and goes above when neither fits', () => {
    expect(echoSpot(150, -100, 82, 69, 1, jar)).toEqual({ x: -1, y: -100 });
    expect(echoSpot(0, -139, 139, 116, 1, jar)).toEqual({ x: 0, y: -394 });
  });
});
