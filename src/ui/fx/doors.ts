/**
 * The stage doors (GAME_DESIGN §7.1): two folding screens of two doors each, over the game screen.
 * After a stage clear they slide in from the sides, unfolding, and stay shut while the trial and
 * blessing are picked; before the zoom they slide back out, folding up. The
 * owner's picture spans the four doors; each door is the owner's frame stretched to the screen's
 * height (doorSprites.ts). With reduced motion they fade instead of folding.
 */
import { DOOR_ART, DOOR_SPRITE_DIR } from '../../config/doorSprites';
import {
  DOORS_CLOSE_MS,
  DOORS_FADE_MS,
  DOORS_OPEN_MS,
  DOORS_PERSPECTIVE,
  DOORS_PICTURE_BLEED,
} from '../../config/view';
import { reducedMotion } from '../../platform/motion';
import { el } from '../dom';
import { doorTransform, easeDoors, wingPose } from './doorFold';

export interface DoorsView {
  /** Shut, or folding shut. */
  readonly shut: boolean;
  /** Fully open (hidden), not moving. */
  readonly isOpen: boolean;
  /** Folds the doors shut; `done` runs once they are (at once if they already are). */
  close(done?: () => void): void;
  /** Folds the doors open; `done` runs once they are (at once if they already are). */
  open(done?: () => void): void;
  /** Shut at once, with no fold (a saved run that waits on a pick). */
  closeNow(): void;
  /** Open at once and forget what was waiting for a fold (a run ends or starts). */
  reset(): void;
}

/** Fold: 0 shut, 1 open. */
const SHUT = 0;
const OPEN = 1;

export function createDoors(root: HTMLElement, baseUrl: string): DoorsView {
  const doors = el('div', 'doors');
  doors.dataset['testid'] = 'doors';
  doors.hidden = true;
  const { picture, panel } = DOOR_ART;
  const url = (file: string): string => `url("${baseUrl}${DOOR_SPRITE_DIR}${file}")`;
  const props: Record<string, string> = {
    '--door-picture': url(picture.file),
    '--door-frame': url(panel.file),
    '--door-w': String(panel.width),
    '--door-top': String(panel.top),
    '--door-right': String(panel.right),
    '--door-bottom': String(panel.bottom),
    '--door-left': String(panel.left),
    '--door-bleed': String(DOORS_PICTURE_BLEED),
  };
  for (const [name, value] of Object.entries(props)) doors.style.setProperty(name, value);

  // Left to right: the left wing's outer and inner doors, then the right wing's inner and outer.
  const panels = [0, 1, 2, 3].map((index) => {
    const door = el('div', `door ${index < 2 ? 'is-left' : 'is-right'}`);
    door.style.setProperty('--door-index', String(index));
    const pane = el('div', 'door-window');
    pane.append(el('div', 'door-picture'));
    const shade = el('div', 'door-shade');
    door.append(pane, el('div', 'door-frame'), shade);
    doors.append(door);
    return { door, shade, inner: index === 1 || index === 2, mirror: index >= 2 };
  });
  root.append(doors);

  let fold = OPEN;
  let from = OPEN;
  let target = OPEN;
  let startedAt = 0;
  let duration = 0;
  let fading = false;
  let frame = 0;
  let waiting: (() => void)[] = [];

  const draw = (): void => {
    // Shown before it is measured: hidden, it has no width.
    doors.hidden = fold === OPEN;
    if (doors.hidden) return;
    const width = doors.clientWidth;
    doors.style.perspective = `${Math.round(DOORS_PERSPECTIVE * width)}px`;
    const pose = wingPose(fading ? SHUT : fold);
    for (const { door, shade, inner, mirror } of panels) {
      const p = inner ? pose.inner : pose.outer;
      door.style.transform = doorTransform(p, width / 4, mirror);
      shade.style.opacity = String(p.shade);
    }
    doors.style.opacity = fading ? String(1 - fold) : '';
  };

  const settle = (): void => {
    const done = waiting;
    waiting = [];
    for (const callback of done) callback();
  };

  const tick = (now: number): void => {
    const t = duration > 0 ? (now - startedAt) / duration : 1;
    fold = from + (target - from) * easeDoors(t);
    if (t >= 1) {
      fold = target;
      frame = 0;
      draw();
      settle();
      return;
    }
    draw();
    frame = requestAnimationFrame(tick);
  };

  const move = (to: number, ms: number, done?: () => void): void => {
    // Turning back drops what waited for the other way.
    if (target !== to) waiting = [];
    if (done) waiting.push(done);
    if (target === to && frame !== 0) return;
    if (fold === to) {
      target = to;
      settle();
      return;
    }
    cancelAnimationFrame(frame);
    fading = reducedMotion();
    from = fold;
    target = to;
    startedAt = performance.now();
    duration = (fading ? DOORS_FADE_MS : ms) * Math.abs(to - from);
    draw();
    frame = requestAnimationFrame(tick);
  };

  const jump = (to: number): void => {
    cancelAnimationFrame(frame);
    frame = 0;
    waiting = [];
    fading = false;
    fold = from = target = to;
    draw();
  };

  // The fold depends on the screen's width.
  window.addEventListener('resize', () => {
    if (!doors.hidden) draw();
  });

  return {
    get shut() {
      return target === SHUT;
    },
    get isOpen() {
      return fold === OPEN && target === OPEN;
    },
    close(done) {
      move(SHUT, DOORS_CLOSE_MS, done);
    },
    open(done) {
      move(OPEN, DOORS_OPEN_MS, done);
    },
    closeNow() {
      jump(SHUT);
    },
    reset() {
      jump(OPEN);
    },
  };
}
