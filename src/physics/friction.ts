/**
 * Coulomb friction for every contact (TECH_SPEC §5). matter-js 0.20.0's friction doesn't work for
 * discs:
 * - while two bodies slip, it removes a fixed amount of slip per iteration (`pair.friction` ×
 *   timeScale³), whatever presses them together, so a cat resting on another slides off it about
 *   as freely as one that barely touches it;
 * - it sizes the impulse that should stop a slip with the effective mass along the normal, which
 *   leaves out rotation. For a cat that impulse overshoots: with the inertia cats had until
 *   v0.23.6 it reverses the slip exactly, so the solver's iterations flip it back and forth; with
 *   a real disc's it overshoots further, and cats resting on the floor shivered when we tried it.
 * So cats slid over each other like on ice instead of rolling, and more friction hardly helped.
 *
 * `installCoulombFriction()` replaces `Matter.Resolver.solveVelocity` once with a copy of
 * matter-js 0.20.0's (src/collision/Resolver.js, MIT, © Liam Brummitt and contributors) whose
 * friction is Coulomb's: each iteration adds the impulse that stops the slip, sized with the
 * effective mass along the tangent (mass and inertia), and the step's total stays within μ times
 * the contact's normal impulse: CAT_FRICTION between two cats, JAR_FRICTION against the jar.
 * matter-js only accumulates normal impulse at a resting contact and clears it on an impact
 * (approaching faster than 120 u/s at 120 Hz), so an impact carries no friction: a landing cat
 * shoves as before, and friction acts on cats that stay in touch. The normal impulses are
 * matter-js's own. `Engine.update` looks the function up on each iteration, and the version is
 * pinned (see circleCollision.ts).
 */
import Matter from 'matter-js';
import { CAT_FRICTION, JAR_FRICTION } from '../config/physics';
import { circleOf } from './circleCollision';

/** The fields of matter-js internals the solver touches but @types/matter-js leaves out. */
interface SolverBody extends Matter.Body {
  readonly positionPrev: Matter.Vector;
  anglePrev: number;
}
interface SolverContact {
  readonly vertex: Matter.Vector;
  normalImpulse: number;
  tangentImpulse: number;
}
export interface SolverPair {
  readonly isActive: boolean;
  readonly isSensor: boolean;
  readonly collision: {
    readonly parentA: SolverBody;
    readonly parentB: SolverBody;
    readonly normal: Matter.Vector;
    readonly tangent: Matter.Vector;
  };
  readonly contacts: readonly SolverContact[];
  readonly contactCount: number;
  readonly inverseMass: number;
  readonly restitution: number;
}
interface ResolverInternals {
  readonly _restingThresh: number;
  solveVelocity(pairs: readonly SolverPair[], delta: number): void;
}

const Resolver = Matter.Resolver as unknown as ResolverInternals;
const Common = Matter.Common as unknown as { readonly _baseDelta: number };

/** matter-js's own `Resolver.solveVelocity`. */
export const matterSolveVelocity = Resolver.solveVelocity;

/** The friction coefficient of a pair: two cats, or a cat and the jar. */
export function frictionOf(pair: SolverPair): number {
  const { parentA, parentB } = pair.collision;
  return circleOf(parentA) && circleOf(parentB) ? CAT_FRICTION : JAR_FRICTION;
}

/** The replacement for `Matter.Resolver.solveVelocity`: one iteration over every pair. */
export function solveVelocity(pairs: readonly SolverPair[], delta: number): void {
  const timeScale = delta / Common._baseDelta;
  const restingThresh = -Resolver._restingThresh * timeScale;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]!;
    if (!pair.isActive || pair.isSensor) continue;

    const { collision, contacts, contactCount } = pair;
    const bodyA = collision.parentA;
    const bodyB = collision.parentB;
    const friction = frictionOf(pair);
    const normalX = collision.normal.x;
    const normalY = collision.normal.y;
    const tangentX = collision.tangent.x;
    const tangentY = collision.tangent.y;
    const inverseMassTotal = pair.inverseMass;
    const contactShare = 1 / contactCount;

    // Velocities per step, from the Verlet positions.
    const bodyAVelocityX = bodyA.position.x - bodyA.positionPrev.x;
    const bodyAVelocityY = bodyA.position.y - bodyA.positionPrev.y;
    const bodyAAngularVelocity = bodyA.angle - bodyA.anglePrev;
    const bodyBVelocityX = bodyB.position.x - bodyB.positionPrev.x;
    const bodyBVelocityY = bodyB.position.y - bodyB.positionPrev.y;
    const bodyBAngularVelocity = bodyB.angle - bodyB.anglePrev;

    for (let j = 0; j < contactCount; j++) {
      const contact = contacts[j]!;
      const contactVertex = contact.vertex;
      const offsetAX = contactVertex.x - bodyA.position.x;
      const offsetAY = contactVertex.y - bodyA.position.y;
      const offsetBX = contactVertex.x - bodyB.position.x;
      const offsetBY = contactVertex.y - bodyB.position.y;

      const velocityPointAX = bodyAVelocityX - offsetAY * bodyAAngularVelocity;
      const velocityPointAY = bodyAVelocityY + offsetAX * bodyAAngularVelocity;
      const velocityPointBX = bodyBVelocityX - offsetBY * bodyBAngularVelocity;
      const velocityPointBY = bodyBVelocityY + offsetBX * bodyBAngularVelocity;
      const relativeVelocityX = velocityPointAX - velocityPointBX;
      const relativeVelocityY = velocityPointAY - velocityPointBY;
      const normalVelocity = normalX * relativeVelocityX + normalY * relativeVelocityY;
      const tangentVelocity = tangentX * relativeVelocityX + tangentY * relativeVelocityY;

      // matter-js's normal impulse: a fast approach is an impact, whose impulse isn't kept; a
      // resting contact accumulates it over the step (Catto, GDC08).
      const oAcN = offsetAX * normalY - offsetAY * normalX;
      const oBcN = offsetBX * normalY - offsetBY * normalX;
      const share =
        contactShare /
        (inverseMassTotal +
          bodyA.inverseInertia * oAcN * oAcN +
          bodyB.inverseInertia * oBcN * oBcN);
      let normalImpulse = (1 + pair.restitution) * normalVelocity * share;
      if (normalVelocity < restingThresh) {
        contact.normalImpulse = 0;
      } else {
        const contactNormalImpulse = contact.normalImpulse;
        contact.normalImpulse += normalImpulse;
        if (contact.normalImpulse > 0) contact.normalImpulse = 0;
        normalImpulse = contact.normalImpulse - contactNormalImpulse;
      }

      // Coulomb friction: stop the slip, within μ times the accumulated normal impulse.
      const oAcT = offsetAX * tangentY - offsetAY * tangentX;
      const oBcT = offsetBX * tangentY - offsetBY * tangentX;
      const tangentShare =
        contactShare /
        (inverseMassTotal +
          bodyA.inverseInertia * oAcT * oAcT +
          bodyB.inverseInertia * oBcT * oBcT);
      const limit = -friction * contact.normalImpulse;
      const contactTangentImpulse = contact.tangentImpulse;
      let tangentImpulse = contactTangentImpulse + tangentVelocity * tangentShare;
      if (tangentImpulse > limit) tangentImpulse = limit;
      else if (tangentImpulse < -limit) tangentImpulse = -limit;
      contact.tangentImpulse = tangentImpulse;
      tangentImpulse -= contactTangentImpulse;

      const impulseX = normalX * normalImpulse + tangentX * tangentImpulse;
      const impulseY = normalY * normalImpulse + tangentY * tangentImpulse;
      if (!(bodyA.isStatic || bodyA.isSleeping)) {
        bodyA.positionPrev.x += impulseX * bodyA.inverseMass;
        bodyA.positionPrev.y += impulseY * bodyA.inverseMass;
        bodyA.anglePrev += (offsetAX * impulseY - offsetAY * impulseX) * bodyA.inverseInertia;
      }
      if (!(bodyB.isStatic || bodyB.isSleeping)) {
        bodyB.positionPrev.x -= impulseX * bodyB.inverseMass;
        bodyB.positionPrev.y -= impulseY * bodyB.inverseMass;
        bodyB.anglePrev -= (offsetBX * impulseY - offsetBY * impulseX) * bodyB.inverseInertia;
      }
    }
  }
}

let installed = false;

/** Routes matter-js's velocity solver through `solveVelocity`. Safe to call more than once. */
export function installCoulombFriction(): void {
  if (installed) return;
  installed = true;
  Resolver.solveVelocity = solveVelocity;
}
