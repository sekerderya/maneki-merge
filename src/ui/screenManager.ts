import type { BackStack } from '../platform/backButton';

export type ScreenId = 'menu' | 'game';

/**
 * Shows exactly one of the two screens (TECH_SPEC §7) and keeps the back button in sync:
 * entering the game opens a back layer, so Android back returns to the menu.
 * (From M5 the game layer opens the pause overlay instead: game → pause → menu.)
 */
export class ScreenManager {
  private current: ScreenId = 'menu';
  private gameLayer: number | null = null;

  constructor(
    private readonly screens: Record<ScreenId, HTMLElement>,
    private readonly back: BackStack,
    private readonly onChange: (screen: ScreenId) => void,
  ) {
    this.apply();
  }

  get screen(): ScreenId {
    return this.current;
  }

  showGame(): void {
    if (this.current === 'game') return;
    this.gameLayer = this.back.push(() => {
      this.gameLayer = null;
      this.showMenu();
    });
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

  private apply(): void {
    for (const [id, node] of Object.entries(this.screens)) {
      node.hidden = id !== this.current;
    }
    document.body.dataset['screen'] = this.current;
    this.onChange(this.current);
  }
}
