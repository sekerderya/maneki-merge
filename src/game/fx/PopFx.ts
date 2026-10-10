/**
 * Cats popping into coins (stage clear, Lucky Save; GAME_DESIGN §7.1) and boulders crumbling
 * (§15.3). The run removes them at once; here each ball's own sprite stays where it was, then grows
 * and fades in turn while a cat's ring and "+coins" go off (a boulder pays nothing). Pops of one
 * tick go off from the top of the jar down, staggered (POP_STAGGER_MS apart, POP_STAGGER_MAX_MS
 * in all), so a stage clear ripples down the jar while its last cat shines.
 */
import { POP_MS, POP_SCALE, POP_STAGGER_MAX_MS, POP_STAGGER_MS } from '../../config/view';
import type { BallRenderer, CatSprite } from '../BallRenderer';
import type { MergeFx } from './MergeFx';

export interface PopRequest {
  readonly id: number;
  readonly tier: number;
  /** The cat's radius in world units. */
  readonly radius: number;
  readonly x: number;
  readonly y: number;
  /** What the cat paid, or null for a crumbling boulder (no ring, no "+coins"). */
  readonly coins: number | null;
}

interface Popping {
  sprite: CatSprite | null;
  tier: number;
  radius: number;
  x: number;
  y: number;
  coins: number | null;
  startMs: number;
  started: boolean;
  bodyScale: number;
  numberScale: number;
}

/** Delay of the `index`-th of `count` pops that go off together. */
export function popDelay(index: number, count: number): number {
  if (count <= 1) return 0;
  return index * Math.min(POP_STAGGER_MS, POP_STAGGER_MAX_MS / (count - 1));
}

export class PopFx {
  private readonly active: Popping[] = [];
  private readonly spare: Popping[] = [];

  constructor(
    private readonly balls: BallRenderer,
    private readonly fx: MergeFx,
  ) {}

  /** Pops a batch of cats that left the run in the same tick. */
  popAll(nowMs: number, requests: readonly PopRequest[]): void {
    // The top of the jar first (y grows downward).
    const topDown = [...requests].sort((a, b) => a.y - b.y);
    topDown.forEach((r, i) => {
      const item = this.spare.pop() ?? ({} as Popping);
      const sprite = this.balls.detach(r.id);
      item.sprite = sprite;
      item.tier = r.tier;
      item.radius = r.radius;
      item.x = r.x;
      item.y = r.y;
      item.coins = r.coins;
      item.startMs = nowMs + popDelay(i, topDown.length);
      item.started = false;
      item.bodyScale = sprite?.body.scaleX ?? 1;
      item.numberScale = sprite?.number.scaleX ?? 1;
      this.active.push(item);
    });
  }

  update(nowMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i] as Popping;
      if (nowMs < item.startMs) continue;
      if (!item.started) {
        item.started = true;
        if (item.coins !== null) {
          this.fx.payout(nowMs, item.x, item.y, item.tier, item.radius, item.coins);
        }
      }
      const t = (nowMs - item.startMs) / POP_MS;
      const sprite = item.sprite;
      if (t >= 1) {
        this.finish(i, item);
        continue;
      }
      if (!sprite) continue;
      const grow = 1 + (POP_SCALE - 1) * (1 - (1 - t) * (1 - t));
      sprite.body.setScale(item.bodyScale * grow).setAlpha(1 - t);
      sprite.number.setScale(item.numberScale * grow).setAlpha(1 - t);
    }
  }

  /** Ends every pop at once (a new run, or leaving the game). */
  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.finish(i, this.active[i] as Popping);
  }

  private finish(index: number, item: Popping): void {
    if (item.sprite) this.balls.recycle(item.sprite);
    item.sprite = null;
    this.active.splice(index, 1);
    this.spare.push(item);
  }
}
