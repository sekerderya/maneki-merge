import { el } from '../dom';

export interface HintView {
  show(text: string): void;
  hide(): void;
}

/** A first-run hint pill over the play area (GAME_DESIGN §2.3). It never blocks input. */
export function createHint(root: HTMLElement): HintView {
  const hint = el('p', 'hint-pill');
  hint.dataset['testid'] = 'hint';
  hint.setAttribute('role', 'status');
  hint.hidden = true;
  root.append(hint);
  return {
    show(text) {
      hint.textContent = text;
      hint.hidden = false;
    },
    hide() {
      hint.hidden = true;
    },
  };
}
