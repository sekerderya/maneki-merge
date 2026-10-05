/** Physics layer: the matter-js world of a run, headless (TECH_SPEC §3–§5). */
export { Ball, MATTER_TICKS_PER_SECOND } from './balls';
export type { BallSpec, BallView } from './balls';
export { installCircleCollisions } from './circleCollision';
export { clampDropX, jarGeometry } from './geometry';
export type { JarGeometry } from './geometry';
export { FixedStepper, PhysicsWorld } from './PhysicsWorld';
export type { PhysicsWorldOptions } from './PhysicsWorld';
