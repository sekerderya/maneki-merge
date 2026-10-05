export interface LifecycleHandlers {
  /** The app went to the background or is being unloaded: pause the run, save, suspend audio. */
  onHidden(): void;
  /** The app is visible again (including a restore from the back/forward cache). */
  onVisible(): void;
}

/**
 * Watches `visibilitychange`, `pagehide` and `pageshow`. iOS doesn't always fire
 * `visibilitychange` when a home-screen app is closed, so `pagehide` backs it up.
 * Each transition is reported once.
 */
export function watchLifecycle(handlers: LifecycleHandlers): () => void {
  let hidden = document.visibilityState === 'hidden';

  const setHidden = (next: boolean): void => {
    if (next === hidden) return;
    hidden = next;
    if (next) handlers.onHidden();
    else handlers.onVisible();
  };

  const onVisibilityChange = (): void => setHidden(document.visibilityState === 'hidden');
  const onPageHide = (): void => setHidden(true);
  const onPageShow = (): void => setHidden(document.visibilityState === 'hidden');

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
}
