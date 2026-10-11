/**
 * Merge resolution (GAME_DESIGN §5, TECH_SPEC §5). It runs after a physics step, on the
 * contacts that step collected that can merge, so the world never changes in the middle of a step.
 *
 * 1. Candidate pairs are ordered by (older cat id, younger cat id): the oldest cats merge first.
 *    The order comes from our own ids, not from matter-js internals.
 * 2. A cat takes part in at most one merge per step: a pair whose cat is already used is
 *    skipped. Three touching cats give one merge; the third can merge on a later step.
 * 3. Two of the stage's last cat (the cap tier) make a Jackpot and vanish. Otherwise both
 *    vanish and a cat of the next tier is born at rest exactly at their midpoint, and grows from
 *    the old size into its own over MERGE_GROW_MS. When one of them is golden (GAME_DESIGN §15.4)
 *    the new cat is two tiers up, never above the cap. It is never golden itself.
 *    A joker (GAME_DESIGN §15.7) and a cat merge too: the cat becomes one tier bigger where it is
 *    (two for a golden cat, never above the cap; the cap's cat doesn't merge with a joker).
 * 4. The new cat starts to turn, as if another cat had clipped it (`mergeSpinDirection`).
 * 5. Every boulder within BOULDER_HIT_REACH of one of a merge's balls takes a hit, once per
 *    merge (GAME_DESIGN §15.3); a Jackpot counts as a merge. A joker that touches a boulder hits it
 *    too, once in its life. The caller applies the hits.
 * 6. Porcelain (GAME_DESIGN §15.10): every cat within PORCELAIN_REACH of a merge's balls may
 *    crack, except cats of the merging size and of the last size; the caller rolls and applies it.
 * 7. A broken cat's two pieces (shard mates) don't merge with each other until they have been
 *    apart (more than PORCELAIN_MATE_GAP between their edges once both have grown in) or their
 *    time together is up (`mateUntil`, PORCELAIN_MATE_MS after the break).
 * 8. Dice (GAME_DESIGN §15.14, `dice`): every merge of two or three cats rolls before its new cat
 *    is made, in resolution order, unless it is a joker's merge or would make the cap's cat. A
 *    lucky roll makes the new cat one size bigger (never above the cap); a fizzle makes one cat of
 *    the size that met, at the same spot. Either way it is a merge (hits, cracks).
 *
 * Hubris (GAME_DESIGN §15.11, `threesUpTo`): three cats up to that size that touch in a chain
 * merge at once into a cat two sizes bigger (three for a golden one) at their centroid; two of them
 * merge only once they have touched for `pairWaitSteps`. Every ball is then gone through oldest
 * first, and each takes the oldest merge it can still make (by the sorted ids of its cats): a pair
 * of bigger cats, a joker's merge or a three; failing those, a small pair that has waited long
 * enough. Without Hubris that is exactly the pair order above.
 *
 * New cats aren't in this step's contacts, so a chain continues on the next step at the earliest.
 * Scores, coins, events and the hits' effect are the caller's job (RunController).
 */
import { MERGE_SPIN_MIN_SLIDE, MERGE_SPIN_RIM_SPEED } from '../config/physics';
import type { DiceRoll } from '../config/picks';
import {
  BOULDER_HIT_REACH,
  HUBRIS_SIZE_STEP,
  PORCELAIN_MATE_GAP,
  PORCELAIN_REACH,
} from '../config/picks';
import { sizeRadius } from '../config/tiers';
import type { Ball } from './balls';
import type { PhysicsWorld } from './PhysicsWorld';

export interface MergeOutcome {
  readonly kind: 'merge' | 'jackpot';
  /** The tier of the cats that met. */
  readonly tier: number;
  /** The merged cat's tier: tier + 1, or tier + 2 when a golden cat merged (the tier for a Jackpot). */
  readonly newTier: number;
  /** One of the cats was golden. */
  readonly golden: boolean;
  /** A joker merged with a cat of `tier`. */
  readonly joker: boolean;
  /** Two cats merged, or three (Hubris, GAME_DESIGN §15.11). */
  readonly parts: 2 | 3;
  /** One of the cats was cracked (Porcelain): the new cat is whole, with a flash of gold seams. */
  readonly cracked: boolean;
  /** What the merge's die showed (Dice, GAME_DESIGN §15.14); null without a roll or for a normal one. */
  readonly dice: DiceRoll;
  /** The ids of the balls that merged (a joker's too). */
  readonly from: readonly number[];
  /** Their midpoint (the three's centroid), in world units. */
  readonly x: number;
  readonly y: number;
  /** The merged cat; null for a Jackpot. */
  readonly ball: Ball | null;
}

/** What changes how cats merge this run. */
export interface MergeRules {
  /** Hubris: cats up to this size merge in threes at once, in pairs after a wait (0: off). */
  readonly threesUpTo: number;
  /** Hubris: how many steps two small cats must touch before they merge as a pair. */
  readonly pairWaitSteps: number;
  /**
   * Hubris: two resting cats' contact flickers on and off from step to step; a pair still counts
   * as touching this many steps after its contact was last seen.
   */
  readonly pairGraceSteps: number;
  /** Porcelain is on: list the cats each merge may crack (`cracks`). */
  readonly porcelain: boolean;
  /**
   * Dice is on: rolls each merge's die (one call per merge that may roll, in resolution order);
   * null when off.
   */
  readonly dice?: (() => DiceRoll) | null;
}

const PLAIN_RULES: MergeRules = {
  threesUpTo: 0,
  pairWaitSteps: 0,
  pairGraceSteps: 0,
  porcelain: false,
  dice: null,
};

/** Hubris: a small pair's wait, from the step it started touching to the step it was last seen. */
interface Wait {
  readonly since: number;
  seen: number;
}

/** A pair of balls' key in the waiting list: the older id, then the younger. */
const pairKey = (a: Ball, b: Ball): string => (a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`);

const byAge = (p: readonly [Ball, Ball], q: readonly [Ball, Ball]): number =>
  p[0].id - q[0].id || p[1].id - q[1].id;

/** A broken cat's two pieces: they never merge with each other. */
const mates = (a: Ball, b: Ball): boolean => a.mate === b.id || b.mate === a.id;

/**
 * Which way a cat born from `older` and `younger` turns: 1 clockwise on screen, −1 the other way.
 * Two cats that slide past each other drag each other's rims along, which turns both the same
 * way, so the new cat turns that way too. Cats that meet head-on keep turning the way they
 * already did, and cats that don't turn at all take a side from their ids.
 */
export function mergeSpinDirection(older: Ball, younger: Ball): 1 | -1 {
  const dx = younger.x - older.x;
  const dy = younger.y - older.y;
  const d = Math.hypot(dx, dy);
  if (d > 0) {
    // How fast the younger cat slides past the older one, across the line between them.
    const slide = (dx * (younger.vy - older.vy) - dy * (younger.vx - older.vx)) / d;
    if (Math.abs(slide) > MERGE_SPIN_MIN_SLIDE) return slide > 0 ? 1 : -1;
  }
  const spin = older.spin + younger.spin;
  if (spin !== 0) return spin > 0 ? 1 : -1;
  return (older.id + younger.id) % 2 === 0 ? 1 : -1;
}

/** The gap between two balls' edges. */
const gap = (a: Ball, b: Ball): number => Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;

export class MergeResolver {
  private readonly pairs: [Ball, Ball][] = [];
  private readonly used = new Set<Ball>();
  private readonly outcomes: MergeOutcome[] = [];
  /** Which merge (index into `outcomes`) each merged cat took part in. */
  private readonly mergeOf = new Map<Ball, number>();
  private readonly hitList: Ball[] = [];
  private readonly crackList: Ball[] = [];
  /** Each merge's balls and the tier that merged (for Porcelain), by merge index. */
  private readonly members: Ball[][] = [];
  private readonly tiers: number[] = [];
  /** Hubris: since when each pair of small cats (by `pairKey`) has been touching. */
  private readonly touching = new Map<string, Wait>();
  /** Dice: this `resolve`'s roller, or null. */
  private dice: (() => DiceRoll) | null = null;

  /**
   * The boulders the last `resolve` hit, once per merge that hit each (a boulder two merges hit is
   * listed twice), in the order of the boulders' ids, then the merges. Reused by the next call.
   */
  get hits(): readonly Ball[] {
    return this.hitList;
  }

  /**
   * Porcelain: the cats the last `resolve`'s merges may crack, once per merge that reached each,
   * in the order of the cats' ids, then the merges. Empty without Porcelain. Reused.
   */
  get cracks(): readonly Ball[] {
    return this.crackList;
  }

  /**
   * Hubris: the small pairs that are touching, for a saved run, as [older id, younger id, the
   * step they started touching, the step they were last seen touching].
   */
  get waits(): [number, number, number, number][] {
    return [...this.touching].map(([key, wait]) => {
      const [a, b] = key.split(':').map(Number) as [number, number];
      return [a, b, wait.since, wait.seen];
    });
  }

  /** Continues a saved run's waiting pairs. */
  restoreWaits(waits: readonly (readonly [number, number, number, number])[]): void {
    this.touching.clear();
    for (const [a, b, since, seen] of waits) this.touching.set(`${a}:${b}`, { since, seen });
  }

  /**
   * Resolves the last step's same-tier contacts. The returned list is reused by the next call.
   */
  resolve(
    world: PhysicsWorld,
    tierCap: number,
    rules: MergeRules = PLAIN_RULES,
  ): readonly MergeOutcome[] {
    const outcomes = this.outcomes;
    outcomes.length = 0;
    this.hitList.length = 0;
    this.crackList.length = 0;
    this.members.length = 0;
    this.tiers.length = 0;
    const contacts = world.mergeContacts;
    this.dice = rules.dice ?? null;
    this.releaseMates(world.balls, world.steps);
    this.forgetWaits(world, rules);
    if (contacts.length === 0) {
      this.collectJokerHits(world.jokerBoulderContacts);
      return outcomes;
    }

    const pairs = this.pairs;
    pairs.length = 0;
    for (let i = 0; i < contacts.length; i += 2) {
      const a = contacts[i] as Ball;
      const b = contacts[i + 1] as Ball;
      pairs.push(a.id < b.id ? [a, b] : [b, a]);
    }
    pairs.sort(byAge);

    const used = this.used;
    used.clear();
    if (rules.threesUpTo > 0) this.resolveWithThrees(world, tierCap, rules);
    else {
      for (const [a, b] of pairs) {
        if (a.removed || b.removed || used.has(a) || used.has(b) || mates(a, b)) continue;
        this.mergePair(world, a, b, tierCap);
      }
    }
    used.clear();
    this.collectHits(world.balls);
    if (rules.porcelain) this.collectCracks(world.balls, tierCap);
    this.mergeOf.clear();
    this.collectJokerHits(world.jokerBoulderContacts);
    return outcomes;
  }

  /**
   * Porcelain: shard mates part once they have been apart (more than PORCELAIN_MATE_GAP between
   * their edges, both grown in), once their time together is up (`mateUntil`), or when one of them
   * is gone; from then on they merge like any two cats.
   */
  private releaseMates(balls: readonly Ball[], steps: number): void {
    for (const ball of balls) {
      if (ball.mate === null) continue;
      const mate = balls.find((other) => other.id === ball.mate);
      if (!mate) {
        ball.mate = null;
        continue;
      }
      const due = steps >= Math.min(ball.mateUntil, mate.mateUntil);
      if (!due && (ball.growing || mate.growing)) continue;
      const gap = Math.hypot(mate.x - ball.x, mate.y - ball.y) - ball.radius - mate.radius;
      if (!due && gap <= PORCELAIN_MATE_GAP) continue;
      ball.mate = null;
      mate.mate = null;
    }
  }

  /**
   * Hubris: forgets the waits of pairs that let go longer than the grace ago, or whose cats are
   * gone (merged, popped); all of them without Hubris.
   */
  private forgetWaits(world: PhysicsWorld, rules: MergeRules): void {
    if (this.touching.size === 0) return;
    if (rules.threesUpTo <= 0) {
      this.touching.clear();
      return;
    }
    const ids = new Set(world.balls.map((ball) => ball.id));
    for (const [key, wait] of [...this.touching]) {
      const [a, b] = key.split(':').map(Number) as [number, number];
      const gone = !ids.has(a) || !ids.has(b);
      if (gone || world.steps - wait.seen > rules.pairGraceSteps) this.touching.delete(key);
    }
  }

  /** Two balls merge: a joker and a cat, two cats, or two of the cap's cats (a Jackpot). */
  private mergePair(world: PhysicsWorld, a: Ball, b: Ball, tierCap: number): void {
    if (a.kind === 'joker' || b.kind === 'joker') {
      this.mergeJoker(world, a.kind === 'joker' ? b : a, a.kind === 'joker' ? a : b, tierCap);
      return;
    }
    const outcomes = this.outcomes;
    this.claim([a, b], a.tier);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const golden = a.golden || b.golden;
    const cracked = a.cracked || b.cracked;
    if (a.tier >= tierCap) {
      world.removeBall(a);
      world.removeBall(b);
      const jackpot = { kind: 'jackpot', tier: a.tier, newTier: a.tier, golden, x, y } as const;
      const from = [a.id, b.id];
      outcomes.push({ ...jackpot, joker: false, parts: 2, cracked, dice: null, from, ball: null });
      return;
    }
    const startRadius = Math.max(a.radius, b.radius);
    const [tier, dice] = this.rollFor(
      a.tier,
      Math.min(a.tier + (golden ? 2 : 1), tierCap),
      tierCap,
    );
    const spin = (mergeSpinDirection(a, b) * MERGE_SPIN_RIM_SPEED) / sizeRadius(world.sizeOf(tier));
    world.removeBall(a);
    world.removeBall(b);
    // Touching cats have both landed (on each other at least); the earlier landing carries over,
    // so a pile that is over the line keeps counting.
    const landedMs = Math.min(a.landedMs, b.landedMs);
    const ball = world.addBall({ tier, x, y, spin, startRadius, landedMs });
    outcomes.push({
      kind: 'merge',
      tier: a.tier,
      newTier: tier,
      golden,
      x,
      y,
      joker: false,
      parts: 2,
      cracked,
      dice,
      from: [a.id, b.id],
      ball,
    });
  }

  /**
   * Dice: the new cat's tier for a merge of `tier` cats that would make `normal`, and what its die
   * showed. No roll without Dice or when `normal` is the cap's (the stage's last cat).
   */
  private rollFor(tier: number, normal: number, tierCap: number): [number, DiceRoll] {
    if (!this.dice || normal >= tierCap) return [normal, null];
    const roll = this.dice();
    if (roll === 'lucky') return [Math.min(normal + 1, tierCap), roll];
    if (roll === 'fizzle') return [tier, roll];
    return [normal, null];
  }

  /**
   * Hubris: the step's merges with small cats in threes. Every ball is gone through oldest first;
   * each one still free takes the oldest merge it can make with free balls: a pair (bigger cats, a
   * joker's merge) or a three of small cats that touch in a chain; failing those, its oldest small
   * partner it has touched for `pairWaitSteps`.
   */
  private resolveWithThrees(world: PhysicsWorld, tierCap: number, rules: MergeRules): void {
    const used = this.used;
    const small = (ball: Ball): boolean =>
      ball.kind === 'cat' && world.sizeOf(ball.tier) <= rules.threesUpTo;
    // Small cats that touch, and every other pair each ball is in (oldest partner first).
    const touching = new Map<Ball, Ball[]>();
    const partners = new Map<Ball, Ball[]>();
    const balls: Ball[] = [];
    const link = (map: Map<Ball, Ball[]>, from: Ball, to: Ball): void => {
      const list = map.get(from);
      if (list) list.push(to);
      else map.set(from, [to]);
    };
    for (const [a, b] of this.pairs) {
      if (mates(a, b)) continue;
      if (!touching.has(a) && !partners.has(a)) balls.push(a);
      if (!touching.has(b) && !partners.has(b)) balls.push(b);
      const map = small(a) && small(b) ? touching : partners;
      link(map, a, b);
      link(map, b, a);
    }
    balls.sort((p, q) => p.id - q.id);
    for (const list of partners.values()) list.sort((p, q) => p.id - q.id);
    for (const list of touching.values()) list.sort((p, q) => p.id - q.id);
    const free = (ball: Ball): boolean => !ball.removed && !used.has(ball);
    // How long each small pair has been touching (pairs that let go start again).
    const now = world.steps;
    for (const [a, list] of touching) {
      for (const b of list) {
        if (a.id > b.id) continue;
        const key = pairKey(a, b);
        const wait = this.touching.get(key);
        if (wait) wait.seen = now;
        else this.touching.set(key, { since: now, seen: now });
      }
    }
    const waited = (a: Ball, b: Ball): boolean =>
      now - (this.touching.get(pairKey(a, b))?.since ?? now) >= rules.pairWaitSteps;

    for (const ball of balls) {
      if (!free(ball)) continue;
      // Every ball older than this one is used or can't merge: this one is the oldest of
      // whatever merge it makes, so the merges compare by their other balls' ids.
      const partner = (partners.get(ball) ?? []).find(
        (other) => free(other) && this.canPair(ball, other, tierCap),
      );
      const three = this.oldestThree(ball, touching, free);
      if (three && (!partner || three[0].id < partner.id)) {
        this.mergeThree(world, [ball, three[0], three[1]], tierCap);
      } else if (partner) {
        this.mergePair(world, ball, partner, tierCap);
      } else {
        // No third came: a small pair merges once it has waited.
        const mate = (touching.get(ball) ?? []).find((other) => free(other) && waited(ball, other));
        if (mate) this.mergePair(world, ball, mate, tierCap);
      }
    }
  }

  /** A pair that merges: a joker's merge with a cat below the cap, or two cats of a tier. */
  private canPair(a: Ball, b: Ball, tierCap: number): boolean {
    if (a.kind === 'joker') return b.tier < tierCap;
    if (b.kind === 'joker') return a.tier < tierCap;
    return true;
  }

  /**
   * The oldest three free small cats that touch in a chain and hold `ball` (by their sorted ids),
   * as its two others, older first; null when there is none. Shard mates are never in one.
   */
  private oldestThree(
    ball: Ball,
    touching: ReadonlyMap<Ball, readonly Ball[]>,
    free: (ball: Ball) => boolean,
  ): [Ball, Ball] | null {
    const near = (touching.get(ball) ?? []).filter(free);
    let best: [Ball, Ball] | null = null;
    const consider = (p: Ball, q: Ball): void => {
      if (p === q || p === ball || q === ball || mates(p, q)) return;
      if (mates(ball, p) || mates(ball, q)) return;
      const [x, y] = p.id < q.id ? [p, q] : [q, p];
      if (!best || x.id < best[0].id || (x.id === best[0].id && y.id < best[1].id)) best = [x, y];
    };
    for (const n of near) {
      // `ball` touches both, or `ball` touches n and n touches m.
      for (const m of near) consider(n, m);
      for (const m of touching.get(n) ?? []) if (free(m)) consider(n, m);
    }
    return best;
  }

  /**
   * Three small cats merge (Hubris): a cat HUBRIS_SIZE_STEP sizes bigger (one more with a golden
   * cat among them, never above the cap) at their centroid, from the biggest one's radius.
   */
  private mergeThree(world: PhysicsWorld, cats: [Ball, Ball, Ball], tierCap: number): void {
    const [a, b, c] = cats;
    this.claim(cats, a.tier);
    const x = (a.x + b.x + c.x) / 3;
    const y = (a.y + b.y + c.y) / 3;
    const golden = a.golden || b.golden || c.golden;
    const cracked = a.cracked || b.cracked || c.cracked;
    const normal = Math.min(a.tier + HUBRIS_SIZE_STEP + (golden ? 1 : 0), tierCap);
    const [tier, dice] = this.rollFor(a.tier, normal, tierCap);
    const startRadius = Math.max(a.radius, b.radius, c.radius);
    // It turns the way its two oldest cats slid past each other.
    const spin = (mergeSpinDirection(a, b) * MERGE_SPIN_RIM_SPEED) / sizeRadius(world.sizeOf(tier));
    for (const cat of cats) world.removeBall(cat);
    const landedMs = Math.min(a.landedMs, b.landedMs, c.landedMs);
    const ball = world.addBall({ tier, x, y, spin, startRadius, landedMs });
    this.outcomes.push({
      kind: 'merge',
      tier: a.tier,
      newTier: tier,
      golden,
      x,
      y,
      joker: false,
      parts: 3,
      cracked,
      dice,
      from: [a.id, b.id, c.id],
      ball,
    });
  }

  /** Marks a merge's balls as used and remembers them for its boulder hits and cracks. */
  private claim(balls: readonly Ball[], tier: number): void {
    const index = this.outcomes.length;
    for (const ball of balls) {
      this.used.add(ball);
      this.mergeOf.set(ball, index);
    }
    this.members[index] = [...balls];
    this.tiers[index] = tier;
  }

  /**
   * A joker and a cat merge (GAME_DESIGN §15.7): the cat grows one tier where it is, two for a
   * golden cat, never above the cap. The cap's cat doesn't merge with a joker.
   */
  private mergeJoker(world: PhysicsWorld, cat: Ball, joker: Ball, tierCap: number): void {
    if (cat.tier >= tierCap) return;
    this.claim([cat, joker], cat.tier);
    const { x, y, golden, cracked } = cat;
    const tier = Math.min(cat.tier + (golden ? 2 : 1), tierCap);
    const spin =
      (mergeSpinDirection(cat, joker) * MERGE_SPIN_RIM_SPEED) / sizeRadius(world.sizeOf(tier));
    world.removeBall(cat);
    world.removeBall(joker);
    const landedMs = Math.min(cat.landedMs, joker.landedMs);
    const ball = world.addBall({ tier, x, y, spin, startRadius: cat.radius, landedMs });
    this.outcomes.push({
      kind: 'merge',
      tier: cat.tier,
      newTier: tier,
      golden,
      x,
      y,
      joker: true,
      parts: 2,
      cracked,
      dice: null,
      from: [cat.id, joker.id],
      ball,
    });
  }

  /**
   * Jokers touching boulders: each boulder a joker touches takes one hit, once in the joker's life.
   * A joker that merged this step has already hit what was near it.
   */
  private collectJokerHits(contacts: readonly Ball[]): void {
    for (let i = 0; i < contacts.length; i += 2) {
      const joker = contacts[i] as Ball;
      const boulder = contacts[i + 1] as Ball;
      if (joker.removed || boulder.removed || joker.struck.has(boulder.id)) continue;
      joker.struck.add(boulder.id);
      this.hitList.push(boulder);
    }
  }

  /** The boulders this step's merges hit: once per (boulder, merge), boulders in id order. */
  private collectHits(balls: readonly Ball[]): void {
    if (this.mergeOf.size === 0) return;
    for (const boulder of balls) {
      if (boulder.kind !== 'boulder') continue;
      let last = -1;
      for (const [cat, merge] of this.mergeOf) {
        if (merge === last) continue;
        if (gap(cat, boulder) > BOULDER_HIT_REACH) continue;
        this.hitList.push(boulder);
        last = merge;
      }
    }
  }

  /**
   * Porcelain: the cats this step's merges may crack, once per (cat, merge), cats in id order.
   * A merge reaches every cat within PORCELAIN_REACH of one of its balls, but not one of the size
   * that merged, nor the last size; the cats that merged are gone, and new cats aren't listed.
   */
  private collectCracks(balls: readonly Ball[], tierCap: number): void {
    const merges = this.members.length;
    if (merges === 0) return;
    const born = new Set<Ball>();
    for (const o of this.outcomes) if (o.ball) born.add(o.ball);
    for (const cat of balls) {
      if (cat.kind !== 'cat' || cat.tier >= tierCap || born.has(cat)) continue;
      for (let m = 0; m < merges; m++) {
        if (cat.tier === this.tiers[m]) continue;
        if (this.members[m]!.some((ball) => gap(ball, cat) <= PORCELAIN_REACH)) {
          this.crackList.push(cat);
        }
      }
    }
  }
}
