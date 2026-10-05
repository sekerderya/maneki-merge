/**
 * Game layer (TECH_SPEC §3, §6): the Phaser game that renders a run and forwards input.
 *
 * The canvas fills the play area. It renders at devicePixelRatio (capped at
 * MAX_RENDER_RESOLUTION) and is shown at CSS size, so cats and numbers stay sharp. The game loop
 * sleeps while the menu is visible.
 */
import Phaser from 'phaser';
import { MAX_RENDER_RESOLUTION } from '../config/view';
import type { RunController } from '../run/RunController';
import { GAME_SCENE_KEY, GameScene } from './GameScene';

export interface GameView {
  /** Shows a run (replacing the previous one) and wakes the loop. */
  show(run: RunController): void;
  /** Stops rendering (menu visible). */
  sleep(): void;
  /** Re-reads the play area's size (also done automatically on resize). */
  refit(): void;
  /** Frames per second actually rendered, for the debug panel. */
  readonly fps: number;
}

export function createGame(parent: HTMLElement): GameView {
  let resolution = 1;
  let pending: RunController | null = null;
  let scene: GameScene | null = null;
  /** Whether the loop should run (a run is on screen). */
  let awake = false;
  /** Set after the first frame: before it, Phaser hasn't started its loop yet. */
  let looping = false;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    disableContextMenu: true,
    autoFocus: false,
    scale: { mode: Phaser.Scale.NONE, width: 1, height: 1 },
    input: { activePointers: 1, keyboard: false, gamepad: false },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: GameScene,
    callbacks: {
      postBoot: (booted) => {
        scene = booted.scene.getScene(GAME_SCENE_KEY) as GameScene;
        // The loop starts right after postBoot; put it to sleep until a run is shown.
        booted.events.once(Phaser.Core.Events.POST_RENDER, () => {
          looping = true;
          if (!awake) booted.loop.sleep();
        });
        refit();
        if (pending) show(pending);
      },
    },
  });

  function refit(): void {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    // Hidden (the menu is up): keep the last size.
    if (width === 0 || height === 0 || !game.isBooted) return;
    const next = Math.min(window.devicePixelRatio || 1, MAX_RENDER_RESOLUTION);
    if (next !== resolution) {
      resolution = next;
      game.scale.setZoom(1 / resolution);
    }
    const w = Math.round(width * resolution);
    const h = Math.round(height * resolution);
    if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
    // Exactly the play area's CSS size, whatever the rounding above did.
    game.canvas.style.width = `${width}px`;
    game.canvas.style.height = `${height}px`;
    game.scale.updateBounds();
    scene?.cameras.main.setSize(w, h);
  }

  function show(run: RunController): void {
    if (!scene) {
      pending = run;
      return;
    }
    pending = null;
    awake = true;
    scene.attach(run);
    refit();
    if (looping && !game.loop.running) game.loop.wake();
  }

  new ResizeObserver(() => refit()).observe(parent);
  window.addEventListener('resize', refit);

  return {
    show,
    sleep() {
      awake = false;
      if (looping && game.loop.running) game.loop.sleep();
    },
    refit,
    get fps() {
      return game.loop?.actualFps ?? 0;
    },
  };
}
