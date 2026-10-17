/**
 * The web SDKs behind the play statistics (TECH_SPEC §17), loaded on the player's first yes with a
 * dynamic import: the game's first load never waits for them, and a player who says no never
 * downloads them. GameAnalytics runs in both builds; Firebase's JS SDK only on the web (the Android
 * app has Firebase's native SDK, `platform/native/`).
 */
import type { FirebaseAnalyticsApi, GameAnalyticsApi } from './analytics';

/** GameAnalytics' numbers for its enums (`gameanalytics.EGAProgressionStatus` and the others). */
const PROGRESSION_STATUS = { start: 1, complete: 2, fail: 3 } as const;
const RESOURCE_FLOW = { source: 1, sink: 2 } as const;
const ERROR_SEVERITY_ERROR = 4;

/**
 * The static class `gameanalytics.GameAnalytics`: the SDK's types declare it outside the module
 * they export, so its methods the game calls are typed here.
 */
interface GameAnalyticsClass {
  setEnabledInfoLog(flag: boolean): void;
  configureBuild(build: string): void;
  configureAvailableResourceCurrencies(currencies: string[]): void;
  configureAvailableResourceItemTypes(itemTypes: string[]): void;
  initialize(gameKey: string, secretKey: string): void;
  addProgressionEvent(
    status: number,
    progression01: string,
    progression02?: string,
    progression03?: string,
    score?: number,
  ): void;
  addResourceEvent(
    flow: number,
    currency: string,
    amount: number,
    itemType: string,
    itemId: string,
  ): void;
  addDesignEvent(eventId: string, value?: number): void;
  addErrorEvent(severity: number, message: string): void;
  setEnabledEventSubmission(flag: boolean): void;
  onStop(): void;
  onResume(): void;
}

/** GameAnalytics' JS SDK. `log`: its info log in the console (test keys). */
export async function loadGameAnalytics(log: boolean): Promise<GameAnalyticsApi> {
  const { gameanalytics } = await import('gameanalytics');
  const ga = (gameanalytics as unknown as { GameAnalytics: GameAnalyticsClass }).GameAnalytics;
  ga.setEnabledInfoLog(log);
  return {
    configure(build, currencies, itemTypes) {
      ga.configureBuild(build);
      ga.configureAvailableResourceCurrencies([...currencies]);
      ga.configureAvailableResourceItemTypes([...itemTypes]);
    },
    initialize: (gameKey, secretKey) => ga.initialize(gameKey, secretKey),
    progression: (status, progression01, score) =>
      ga.addProgressionEvent(
        PROGRESSION_STATUS[status],
        progression01,
        undefined,
        undefined,
        score,
      ),
    resource: (flow, currency, amount, itemType, itemId) =>
      ga.addResourceEvent(RESOURCE_FLOW[flow], currency, amount, itemType, itemId),
    design: (eventId, value) => ga.addDesignEvent(eventId, value),
    error: (message) => ga.addErrorEvent(ERROR_SEVERITY_ERROR, message),
    setEnabled: (on) => ga.setEnabledEventSubmission(on),
    onStop: () => ga.onStop(),
    onResume: () => ga.onResume(),
  };
}

/**
 * Firebase Analytics through Firebase's JS SDK (the web app). Its cookies are the game's own
 * (`maneki_merge` prefix, the game's path), because the github.io origin is shared with the owner's
 * other sites; Google's ad signals stay off. Rejects where the browser can't run it.
 */
export async function loadFirebaseWeb(
  config: Readonly<Record<string, string>>,
  cookiePath: string,
): Promise<FirebaseAnalyticsApi> {
  const [{ initializeApp }, analytics] = await Promise.all([
    import('firebase/app'),
    import('firebase/analytics'),
  ]);
  if (!(await analytics.isSupported()))
    throw new Error('Firebase Analytics is not supported here.');
  analytics.setConsent({
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  const app = initializeApp({ ...config });
  const instance = analytics.initializeAnalytics(app, {
    config: {
      cookie_prefix: 'maneki_merge',
      cookie_path: cookiePath,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    },
  });
  return {
    setEnabled: (on) => analytics.setAnalyticsCollectionEnabled(instance, on),
    setScreen: (name) =>
      analytics.logEvent(instance, 'screen_view', {
        firebase_screen: name,
        firebase_screen_class: name,
      }),
    logEvent: (name, params) => analytics.logEvent(instance, name, { ...params }),
  };
}
