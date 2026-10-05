import type { BackStack } from '../platform/backButton';

export type ScreenId = 'menu' | 'game';

/** What the back button does in the game: open the pause overlay ('stay') or leave. */
export type GameBackResult = 'stay' | 'menu';

/**
 * Shows exactly one of the two screens (TECH_SPEC §7) and keeps the back button in sync.
 * Entering the game opens one back layer. Back in the game asks `onGameBack`: game → pause
 * ('stay', the layer is opened again), pause or game over → menu.
 */
export class ScreenManager {
  private current: ScreenId = 'menu';
  private gameLayer: number | null = null;

  constructor(
    private readonly screens: Record<ScreenId, HTMLElement>,
    private readonly back: BackStack,
    private readonly onChange: (screen: ScreenId) => void,
    private readonly onGameBack: () => GameBackResult = () => 'menu',
  ) {
    this.apply();
  }

  get screen(): ScreenId {
    return this.current;
  }

  showGame(): void {
    if (this.current === 'game') return;
    this.openGameLayer();
    this.current = 'game';
    this.apply();
  }

  showMenu(): void {
    if (this.current === 'menu') return;
    if (this.gameLayer !== null) {
      this.back.release(this.gameLayer);
      this.gameLayer = null;
    }
    this.current = 'menu';
    this.apply();
  }

  private openGameLayer(): void {
    this.gameLayer = this.back.push(() => {
      this.gameLayer = null;
      if (this.current !== 'game') return;
      if (this.onGameBack() === 'stay') this.openGameLayer();
      else this.showMenu();
    });
  }

  private apply(): void {
    for (const [id, node] of Object.entries(this.screens)) {
      node.hidden = id !== this.current;
    }
    document.body.dataset['screen'] = this.current;
    this.onChange(this.current);
  }
}
