/**
 * Rewarded ads (TECH_SPEC §16, docs/plans/capacitor-admob.md §5.4). The game only talks to
 * `RewardedAds`; the placements plan builds its three ad options on it. Three implementations:
 * - `NoAds`: the web and iOS build, never ready.
 * - `AdMobAds`: the Android app, Google's AdMob through `@capacitor-community/admob`
 *   (`platform/native/`), behind the consent asked at launch.
 * - `FakeAds`: `?ads=fake` and the dev app, a test ad the page draws, to build and test the flows
 *   on a desktop and in Playwright.
 * Ad options show only while `ready` is true, and it is never true offline.
 */
import {
  AD_MAX_AGE_MS,
  AD_MAX_CONTENT_RATING,
  AD_PLACEMENTS,
  AD_RETRY_DELAYS_MS,
  CONSENT_DEBUG_GEOGRAPHY_EEA,
  CONSENT_INFO_TIMEOUT_MS,
} from '../config/ads';
import type { AdPlacement } from '../config/ads';
import type { Scheduler } from '../core/profile';
import type { Network } from './network';

export type { AdPlacement } from '../config/ads';
export type AdResult = 'rewarded' | 'closed' | 'failed';

export interface RewardedAds {
  /**
   * True only when an ad can be shown right now for this placement: online, consent allows ads,
   * the SDK is ready and an ad is loaded. Ad options are shown only while this is true.
   */
  ready(placement: AdPlacement): boolean;
  /** Called whenever `ready` may have changed (connection, load, show, consent). */
  onChange(listener: () => void): () => void;
  /** Shows the ad; resolves after it closes. `rewarded` only when AdMob sent its reward. */
  show(placement: AdPlacement): Promise<AdResult>;
  /**
   * True while a full-screen ad covers the game: the page is hidden meanwhile, and the lifecycle
   * code saves but doesn't open the pause overlay for it.
   */
  readonly showing: boolean;
}

/** What the debug panel's Ads group shows. */
export interface AdsStatus {
  readonly kind: 'none' | 'fake' | 'admob';
  readonly online: boolean;
  /** AdMob's consent answer ("OBTAINED, ads allowed"), or how far asking it got. */
  readonly consent: string;
  /** The Mobile Ads SDK: off (no consent yet), starting, ready or failed. */
  readonly sdk: string;
  /** Each placement's ad: ready, loaded (but offline), loading, retry in N s, … */
  readonly placements: Readonly<Record<AdPlacement, string>>;
}

/** Everything the app wires up around the ads; the game's flows only need `RewardedAds`. */
export interface AdService extends RewardedAds {
  /**
   * The consent step at launch: asks AdMob for the player's consent status at once and, where its
   * form is needed (EEA, UK, Switzerland), shows the form once `launched` resolves (the loading
   * screen is done), before the menu and never over a run. Resolves when the game may open.
   */
  start(launched: Promise<unknown>): Promise<void>;
  /** Settings shows "Privacy options" while AdMob says the player must be able to reach them. */
  readonly privacyOptionsRequired: boolean;
  /** AdMob's privacy options form, to change the consent answer. */
  showPrivacyOptions(): Promise<void>;
  /** Debug: forgets the consent answer, so the next launch asks again. */
  resetConsent(): Promise<void>;
  status(): AdsStatus;
}

/** Listeners for `onChange`. */
class ChangeListeners {
  private readonly listeners = new Set<() => void>();

  add(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

const eachPlacement = (state: (placement: AdPlacement) => string): Record<AdPlacement, string> =>
  Object.fromEntries(AD_PLACEMENTS.map((p) => [p, state(p)])) as Record<AdPlacement, string>;

/** The web and iOS build: no ads, ever. */
export class NoAds implements AdService {
  readonly showing = false;
  readonly privacyOptionsRequired = false;

  constructor(private readonly network: Network) {}

  ready(): boolean {
    return false;
  }

  onChange(): () => void {
    return () => undefined;
  }

  show(): Promise<AdResult> {
    return Promise.resolve('failed');
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  showPrivacyOptions(): Promise<void> {
    return Promise.resolve();
  }

  resetConsent(): Promise<void> {
    return Promise.resolve();
  }

  status(): AdsStatus {
    return {
      kind: 'none',
      online: this.network.online,
      consent: '-',
      sdk: '-',
      placements: eachPlacement(() => 'no ads in this build'),
    };
  }
}

/** Draws the fake ad and resolves with what the player did (`ui/overlays/fakeAd.ts`). */
export type FakeAdPresenter = (placement: AdPlacement) => Promise<'rewarded' | 'closed'>;

/**
 * `?ads=fake`: an ad is always loaded, so `ready` follows the online check alone (offline hides
 * the options here too), and `show` draws a test ad over the page.
 */
export class FakeAds implements AdService {
  readonly privacyOptionsRequired = false;
  private open = false;
  private readonly listeners = new ChangeListeners();

  constructor(
    private readonly network: Network,
    private readonly present: FakeAdPresenter,
  ) {
    network.onChange(() => this.listeners.emit());
  }

  get showing(): boolean {
    return this.open;
  }

  ready(): boolean {
    return this.network.online && !this.open;
  }

  onChange(listener: () => void): () => void {
    return this.listeners.add(listener);
  }

  async show(placement: AdPlacement): Promise<AdResult> {
    if (!this.ready()) return 'failed';
    this.open = true;
    this.listeners.emit();
    try {
      return await this.present(placement);
    } finally {
      this.open = false;
      this.listeners.emit();
    }
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  showPrivacyOptions(): Promise<void> {
    return Promise.resolve();
  }

  resetConsent(): Promise<void> {
    return Promise.resolve();
  }

  status(): AdsStatus {
    return {
      kind: 'fake',
      online: this.network.online,
      consent: 'not asked (fake ads)',
      sdk: '-',
      placements: eachPlacement(() => (this.ready() ? 'ready' : this.open ? 'showing' : 'offline')),
    };
  }
}

/** AdMob's consent answer, as `@capacitor-community/admob` gives it. */
export interface ConsentInfo {
  /** `REQUIRED`, `NOT_REQUIRED`, `OBTAINED` or `UNKNOWN`. */
  readonly status: string;
  readonly isConsentFormAvailable?: boolean;
  readonly canRequestAds: boolean;
  /** `REQUIRED`, `NOT_REQUIRED` or `UNKNOWN`. */
  readonly privacyOptionsRequirementStatus: string;
}

/** The parts of `@capacitor-community/admob` the app uses (adapted in `platform/native/`). */
export interface AdMobApi {
  initialize(options: {
    readonly testingDevices: string[];
    readonly initializeForTesting: boolean;
    readonly maxAdContentRating: string;
  }): Promise<void>;
  requestConsentInfo(options: {
    readonly debugGeography?: number;
    readonly testDeviceIdentifiers?: string[];
  }): Promise<ConsentInfo>;
  showConsentForm(): Promise<ConsentInfo>;
  showPrivacyOptionsForm(): Promise<void>;
  resetConsentInfo(): Promise<void>;
  /** Loads a rewarded ad of this unit; AdMob keeps one per unit until it is shown. */
  prepareRewardVideoAd(options: {
    readonly adId: string;
    readonly immersiveMode: boolean;
  }): Promise<unknown>;
  /**
   * Shows the unit's loaded ad. Its promise only settles on a reward or a failure, never when the
   * player closes the ad early, so the events below decide the result.
   */
  showRewardVideoAd(options: { readonly adId: string }): Promise<unknown>;
  /** `rewarded`: the reward is earned; `dismissed`: the ad closed; `failedToShow`. */
  onRewardEvent(event: 'rewarded' | 'dismissed' | 'failedToShow', listener: () => void): void;
}

export interface AdMobSetup {
  /** The ad unit per placement; placements sharing a unit share its loaded ad. */
  readonly units: Readonly<Record<AdPlacement, string>>;
  /** Phones that get test ads (and may use the consent debug geography). */
  readonly testingDevices: readonly string[];
  /** `?consent=eea`: AdMob answers as in the EEA (on a test device). */
  readonly consentDebugEea: boolean;
}

type UnitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly expiry: number }
  | { readonly kind: 'waiting'; readonly until: number; readonly timer: number }
  | { readonly kind: 'showing' };

interface AdUnit {
  readonly id: string;
  state: UnitState;
  /** Failed loads in a row: picks the next retry delay. */
  failures: number;
}

interface CurrentShow {
  readonly unit: AdUnit;
  rewarded: boolean;
  readonly resolve: (result: AdResult) => void;
}

const IDLE: UnitState = { kind: 'idle' };

/**
 * The Android app's ads. After consent allows ads and while online it keeps one rewarded ad per
 * unit loaded, loads the next after a show, retries a failed load (AD_RETRY_DELAYS_MS, at once
 * when the connection comes back) and replaces an ad older than AD_MAX_AGE_MS. Offline nothing is
 * ready, even an ad already loaded.
 */
export class AdMobAds implements AdService {
  private readonly units = new Map<string, AdUnit>();
  private readonly listeners = new ChangeListeners();
  private consent: ConsentInfo | null = null;
  /** A consent request is on its way. */
  private asking = false;
  private sdk: 'off' | 'starting' | 'ready' | 'failed' = 'off';
  private sdkFailures = 0;
  private current: CurrentShow | null = null;

  constructor(
    private readonly api: AdMobApi,
    private readonly network: Network,
    private readonly setup: AdMobSetup,
    private readonly timers: Scheduler,
  ) {
    for (const id of new Set(Object.values(setup.units))) {
      this.units.set(id, { id, state: IDLE, failures: 0 });
    }
    api.onRewardEvent('rewarded', () => {
      if (this.current) this.current.rewarded = true;
    });
    api.onRewardEvent('dismissed', () =>
      this.finishShow(this.current?.rewarded ? 'rewarded' : 'closed'),
    );
    api.onRewardEvent('failedToShow', () => this.finishShow('failed'));
    network.onChange((online) => this.onNetwork(online));
  }

  get showing(): boolean {
    return this.current !== null;
  }

  get privacyOptionsRequired(): boolean {
    return this.consent?.privacyOptionsRequirementStatus === 'REQUIRED';
  }

  ready(placement: AdPlacement): boolean {
    return (
      this.network.online &&
      this.canRequestAds &&
      this.sdk === 'ready' &&
      this.current === null &&
      this.unitOf(placement).state.kind === 'loaded'
    );
  }

  onChange(listener: () => void): () => void {
    return this.listeners.add(listener);
  }

  async start(launched: Promise<unknown>): Promise<void> {
    // Offline: the answer is asked when the connection comes, without the form (next launch).
    if (!this.network.online) return;
    const asked = this.askConsent();
    await Promise.race([asked, this.delay(CONSENT_INFO_TIMEOUT_MS)]);
    await launched;
    const info = this.consent;
    if (!info?.isConsentFormAvailable || info.status !== 'REQUIRED') return;
    const answer = await this.api.showConsentForm().catch(() => null);
    if (answer) this.applyConsent(answer);
  }

  show(placement: AdPlacement): Promise<AdResult> {
    if (!this.ready(placement)) return Promise.resolve('failed');
    const unit = this.unitOf(placement);
    if (unit.state.kind === 'loaded') this.timers.clearTimeout(unit.state.expiry);
    unit.state = { kind: 'showing' };
    return new Promise((resolve) => {
      this.current = { unit, rewarded: false, resolve };
      this.listeners.emit();
      this.api.showRewardVideoAd({ adId: unit.id }).catch(() => this.finishShow('failed'));
    });
  }

  async showPrivacyOptions(): Promise<void> {
    await this.api.showPrivacyOptionsForm().catch(() => undefined);
    // The answer may have changed.
    await this.askConsent();
  }

  async resetConsent(): Promise<void> {
    await this.api.resetConsentInfo().catch(() => undefined);
    this.consent = null;
    this.listeners.emit();
  }

  status(): AdsStatus {
    const consent = this.consent
      ? `${this.consent.status}, ${this.consent.canRequestAds ? 'ads allowed' : 'no ads'}`
      : this.asking
        ? 'asking'
        : 'not asked';
    return {
      kind: 'admob',
      online: this.network.online,
      consent,
      sdk: this.sdk,
      placements: eachPlacement((placement) => this.describe(placement)),
    };
  }

  private get canRequestAds(): boolean {
    return this.consent?.canRequestAds === true;
  }

  private unitOf(placement: AdPlacement): AdUnit {
    const unit = this.units.get(this.setup.units[placement]);
    if (!unit) throw new Error(`No ad unit for ${placement}`);
    return unit;
  }

  private describe(placement: AdPlacement): string {
    const state = this.unitOf(placement).state;
    if (this.ready(placement)) return 'ready';
    switch (state.kind) {
      case 'loaded':
        return this.network.online ? 'loaded' : 'loaded, offline';
      case 'waiting':
        return `retry in ${Math.ceil((state.until - this.timers.now()) / 1000)} s`;
      default:
        return state.kind;
    }
  }

  /** Asks AdMob for the consent status (never shows a form); its answer decides the ads. */
  private askConsent(): Promise<void> {
    this.asking = true;
    const devices = [...this.setup.testingDevices];
    const options = this.setup.consentDebugEea
      ? { debugGeography: CONSENT_DEBUG_GEOGRAPHY_EEA, testDeviceIdentifiers: devices }
      : {};
    return this.api.requestConsentInfo(options).then(
      (info) => {
        this.asking = false;
        this.applyConsent(info);
      },
      () => {
        this.asking = false;
        this.listeners.emit();
      },
    );
  }

  private applyConsent(info: ConsentInfo): void {
    this.consent = info;
    if (info.canRequestAds) this.startSdk();
    this.listeners.emit();
  }

  /** The Mobile Ads SDK starts once, after consent allows ads; a failed start is retried. */
  private startSdk(): void {
    if (this.sdk === 'starting' || this.sdk === 'ready') return;
    this.sdk = 'starting';
    const devices = [...this.setup.testingDevices];
    this.api
      .initialize({
        testingDevices: devices,
        initializeForTesting: devices.length > 0,
        maxAdContentRating: AD_MAX_CONTENT_RATING,
      })
      .then(
        () => {
          this.sdk = 'ready';
          for (const unit of this.units.values()) if (unit.state.kind === 'idle') this.load(unit);
          this.listeners.emit();
        },
        () => {
          this.sdk = 'failed';
          this.timers.setTimeout(() => this.startSdk(), this.retryDelay(this.sdkFailures++));
          this.listeners.emit();
        },
      );
  }

  private load(unit: AdUnit): void {
    if (!this.network.online || this.sdk !== 'ready' || !this.canRequestAds) {
      unit.state = IDLE;
      return;
    }
    unit.state = { kind: 'loading' };
    this.api.prepareRewardVideoAd({ adId: unit.id, immersiveMode: true }).then(
      () => {
        if (unit.state.kind !== 'loading') return;
        unit.failures = 0;
        unit.state = {
          kind: 'loaded',
          expiry: this.timers.setTimeout(() => this.expire(unit), AD_MAX_AGE_MS),
        };
        this.listeners.emit();
      },
      () => {
        if (unit.state.kind !== 'loading') return;
        const delay = this.retryDelay(unit.failures++);
        unit.state = {
          kind: 'waiting',
          until: this.timers.now() + delay,
          timer: this.timers.setTimeout(() => {
            unit.state = IDLE;
            this.load(unit);
          }, delay),
        };
        this.listeners.emit();
      },
    );
    this.listeners.emit();
  }

  /** An ad near AdMob's one-hour limit is thrown away and loaded again. */
  private expire(unit: AdUnit): void {
    if (unit.state.kind !== 'loaded') return;
    unit.state = IDLE;
    this.load(unit);
    this.listeners.emit();
  }

  private onNetwork(online: boolean): void {
    if (online) {
      if (!this.consent && !this.asking) void this.askConsent();
      for (const unit of this.units.values()) {
        if (unit.state.kind === 'waiting') {
          this.timers.clearTimeout(unit.state.timer);
          unit.state = IDLE;
        }
        if (unit.state.kind === 'idle') this.load(unit);
      }
    }
    this.listeners.emit();
  }

  private finishShow(result: AdResult): void {
    const current = this.current;
    if (!current) return;
    this.current = null;
    current.unit.state = IDLE;
    this.load(current.unit);
    current.resolve(result);
    this.listeners.emit();
  }

  private retryDelay(failures: number): number {
    const delays = AD_RETRY_DELAYS_MS;
    return delays[Math.min(failures, delays.length - 1)] ?? 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.timers.setTimeout(resolve, ms));
  }
}
