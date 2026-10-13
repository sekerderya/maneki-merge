/**
 * The app's height (TECH_SPEC §10). In the installed app, Android shows its system bars over the
 * fullscreen game when the player swipes in from an edge, and Chrome shrinks the viewport while
 * they show: the whole layout followed (the menu's scale, the jar), shrinking and growing back.
 * The owner wants the game to stay full screen. So in the installed app a drop of at most
 * `maxTransientDrop` CSS px keeps the full height: nothing moves, and the bars cover the edges
 * until they go. A bigger drop (a split screen) is followed, and a new width (the phone turned)
 * starts over. In a browser tab the height always follows the viewport. Pure, unit-tested.
 */
export class AppHeight {
  private width = -1;
  private full = 0;

  constructor(private readonly maxTransientDrop: number) {}

  /** The height to lay the app out at, for a viewport of `width` × `height` CSS px. */
  update(width: number, height: number, installed: boolean): number {
    if (width !== this.width) {
      this.width = width;
      this.full = height;
    } else if (height > this.full || !installed || this.full - height > this.maxTransientDrop) {
      this.full = height;
    }
    return this.full;
  }
}
