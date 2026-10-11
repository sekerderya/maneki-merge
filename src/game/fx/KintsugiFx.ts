/**
 * Porcelain's kintsugi (GAME_DESIGN §15.10): when a cracked cat merges, gold seams flash on the
 * whole new cat and fade out over KINTSUGI_FLASH_MS, rolling with it. The seams are the skin's
 * (the owner's art, docs/ART_ASSETS.md §4.12); a skin without them flashes a gold ring. Pooled
 * images matched to their cat by id each frame.
 */
import type Phaser from 'phaser';
import { KINTSUGI_GOLD } from '../../config/skin';
import { KINTSUGI_FLASH_MS } from '../../config/view';
import type { BallView } from '../../physics/balls';
import { crackVariant } from '../BallRenderer';
import type { BallSkin } from '../skins/BallSkin';

/** MergeFx's ring texture (a white ring 512 px across, its line 6% of that). */
const RING_KEY = 'fx-ring';
const RING_PX = 512;

interface Flash {
  id: number;
  startMs: number;
  readonly image: Phaser.GameObjects.Image;
}

export class KintsugiFx {
  private readonly flashes: Flash[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly skin: BallSkin,
  ) {}

  /** The cat \`id\`, made by a cracked cat's merge, flashes its gold seams. */
  flash(id: number, nowMs: number): void {
    let flash = this.flashes.find((f) => f.startMs === -Infinity);
    if (!flash) {
      const image = this.scene.add.image(0, 0, RING_KEY).setVisible(false);
      this.layer.add(image);
      flash = { id, startMs: nowMs, image };
      this.flashes.push(flash);
    }
    flash.id = id;
    flash.startMs = nowMs;
    const seam = this.skin.seam(crackVariant(id).variant);
    if (seam) flash.image.setTexture(seam.key, seam.frame).clearTint();
    else flash.image.setTexture(RING_KEY).setTint(KINTSUGI_GOLD);
    flash.image.setVisible(true);
  }

  update(nowMs: number, balls: readonly BallView[]): void {
    for (const flash of this.flashes) {
      if (flash.startMs === -Infinity) continue;
      const t = (nowMs - flash.startMs) / KINTSUGI_FLASH_MS;
      const ball = balls.find((b) => b.id === flash.id);
      if (t >= 1 || !ball) {
        this.end(flash);
        continue;
      }
      const seam = this.skin.seam(crackVariant(ball.id).variant);
      // A ring sits just inside the cat's outline; seams cover the cat like its cracks.
      const scale = seam ? seam.unitsPerPixel * ball.radius : (2 * ball.radius * 0.94) / RING_PX;
      flash.image
        .setPosition(ball.x, ball.y)
        .setRotation(ball.angle + crackVariant(ball.id).turn)
        .setScale(scale)
        // In quickly, then out.
        .setAlpha(t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
    }
  }

  clear(): void {
    for (const flash of this.flashes) this.end(flash);
  }

  private end(flash: Flash): void {
    flash.startMs = -Infinity;
    flash.image.setVisible(false);
  }
}
