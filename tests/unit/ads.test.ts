import { describe, expect, it } from 'vitest';
import {
  AD_MAX_AGE_MS,
  AD_PLACEMENTS,
  AD_RETRY_DELAYS_MS,
  AD_UNITS,
  CONSENT_DEBUG_GEOGRAPHY_EEA,
  CONSENT_INFO_TIMEOUT_MS,
  DEV_APP_FLAGS,
  TEST_REWARDED_AD_UNIT,
} from '../../src/config/ads';
import type { AdPlacement } from '../../src/config/ads';
import type { Scheduler } from '../../src/core/profile';
import { parseUrlFlags } from '../../src/core/urlFlags';
import { AdMobAds, FakeAds, NoAds } from '../../src/platform/ads';
import type { AdMobApi, AdMobSetup, ConsentInfo } from '../../src/platform/ads';
import { NetworkState } from '../../src/platform/network';

/** A clock whose timers run only when the test moves time on. */
class FakeClock implements Scheduler {
  time = 0;
  private nextId = 1;
  private readonly timers = new Map<number, { at: number; fn: () => void }>();

  now(): number {
    return this.time;
  }

  setTimeout(fn: () => void, ms: number): number {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + ms, fn });
    return id;
  }

  clearTimeout(handle: number): void {
    this.timers.delete(handle);
  }

  /** Moves time on by `ms`, running the timers that come due, in order. */
  async advance(ms: number): Promise<void> {
    const end = this.time + ms;
    for (;;) {
      const due = [...this.timers]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.time = due[1].at;
      due[1].fn();
      await settle();
    }
    this.time = end;
  }
}

/** Lets pending promise callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const consent = (overrides: Partial<ConsentInfo> = {}): ConsentInfo => ({
  status: 'NOT_REQUIRED',
  isConsentFormAvailable: false,
  canRequestAds: true,
  privacyOptionsRequirementStatus: 'NOT_REQUIRED',
  ...overrides,
});

interface Pending {
  readonly adId: string;
  resolve(): void;
  reject(): void;
}

/** AdMob as the plugin behaves: loads and the consent answer settle when the test says. */
class FakeAdMob implements AdMobApi {
  consentInfo: ConsentInfo | Error = consent();
  /** When set, the consent request waits for `answerConsent()`. */
  holdConsent = false;
  formAnswer: ConsentInfo = consent({ status: 'OBTAINED' });
  consentRequests: object[] = [];
  formsShown = 0;
  privacyFormsShown = 0;
  resets = 0;
  initFailures = 0;
  inits = 0;
  readonly loads: Pending[] = [];
  readonly shows: string[] = [];
  showRejects = false;
  private heldConsent: (() => void) | null = null;
  private readonly handlers = new Map<string, (() => void)[]>();

  initialize(): Promise<void> {
    this.inits++;
    if (this.initFailures > 0) {
      this.initFailures--;
      return Promise.reject(new Error('no banner parent'));
    }
    return Promise.resolve();
  }

  requestConsentInfo(options: object): Promise<ConsentInfo> {
    this.consentRequests.push(options);
    const answer = (): Promise<ConsentInfo> =>
      this.consentInfo instanceof Error
        ? Promise.reject(this.consentInfo)
        : Promise.resolve(this.consentInfo);
    if (!this.holdConsent) return answer();
    return new Promise((resolve, reject) => {
      this.heldConsent = () => void answer().then(resolve, reject);
    });
  }

  answerConsent(): void {
    this.heldConsent?.();
    this.heldConsent = null;
  }

  showConsentForm(): Promise<ConsentInfo> {
    this.formsShown++;
    return Promise.resolve(this.formAnswer);
  }

  showPrivacyOptionsForm(): Promise<void> {
    this.privacyFormsShown++;
    return Promise.resolve();
  }

  resetConsentInfo(): Promise<void> {
    this.resets++;
    return Promise.resolve();
  }

  prepareRewardVideoAd(options: { adId: string }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.loads.push({
        adId: options.adId,
        resolve: () => resolve({}),
        reject: () => reject(new Error('no fill')),
      });
    });
  }

  showRewardVideoAd(options: { adId: string }): Promise<unknown> {
    this.shows.push(options.adId);
    return this.showRejects
      ? Promise.reject(new Error('not prepared'))
      : new Promise(() => undefined);
  }

  onRewardEvent(event: string, listener: () => void): void {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), listener]);
  }

  emit(event: 'rewarded' | 'dismissed' | 'failedToShow'): void {
    for (const listener of this.handlers.get(event) ?? []) listener();
  }

  /** Settles every load waiting so far. */
  finishLoads(ok = true): void {
    for (const load of this.loads.splice(0)) {
      if (ok) load.resolve();
      else load.reject();
    }
  }
}

const SETUP: AdMobSetup = { units: AD_UNITS, testingDevices: [], consentDebugEea: false };
const SEPARATE_UNITS: AdMobSetup = {
  ...SETUP,
  units: { specialBall: 'unit/a', luckySave: 'unit/b', doubleCoins: 'unit/c' },
};

async function launch(
  options: { setup?: AdMobSetup; online?: boolean; api?: FakeAdMob } = {},
): Promise<{ ads: AdMobAds; api: FakeAdMob; network: NetworkState; clock: FakeClock }> {
  const api = options.api ?? new FakeAdMob();
  const network = new NetworkState(options.online ?? true);
  const clock = new FakeClock();
  const ads = new AdMobAds(api, network, options.setup ?? SETUP, clock);
  await ads.start(Promise.resolve());
  await settle();
  return { ads, api, network, clock };
}

const readyAll = (ads: AdMobAds): boolean[] => AD_PLACEMENTS.map((p) => ads.ready(p));

describe('ad config', () => {
  it("uses Google's sample rewarded unit until the owner's IDs come", () => {
    for (const placement of AD_PLACEMENTS) expect(AD_UNITS[placement]).toBe(TEST_REWARDED_AD_UNIT);
  });

  it('retries sooner first, and drops a loaded ad before AdMob expires it', () => {
    expect([...AD_RETRY_DELAYS_MS]).toEqual([30_000, 60_000, 120_000, 300_000]);
    expect(AD_MAX_AGE_MS).toBeLessThan(60 * 60_000);
  });

  it('starts the dev app with the debug panel and fake ads', () => {
    expect(parseUrlFlags(DEV_APP_FLAGS)).toMatchObject({ debug: true, ads: 'fake' });
  });
});

describe('AdMobAds: consent and loading', () => {
  it('asks for consent, starts the SDK and loads one ad per unit', async () => {
    const { ads, api } = await launch();
    expect(api.consentRequests).toEqual([{}]);
    expect(api.formsShown).toBe(0);
    expect(api.inits).toBe(1);
    // The three placements share Google's sample unit until the real ones exist.
    expect(api.loads.map((l) => l.adId)).toEqual([TEST_REWARDED_AD_UNIT]);
    expect(readyAll(ads)).toEqual([false, false, false]);
    api.finishLoads();
    await settle();
    expect(readyAll(ads)).toEqual([true, true, true]);
    expect(ads.status().placements.luckySave).toBe('ready');
  });

  it('loads a unit per placement when they differ', async () => {
    const { api } = await launch({ setup: SEPARATE_UNITS });
    expect(api.loads.map((l) => l.adId)).toEqual(['unit/a', 'unit/b', 'unit/c']);
  });

  it('shows the consent form only after the loading screen, and loads once allowed', async () => {
    const api = new FakeAdMob();
    api.consentInfo = consent({
      status: 'REQUIRED',
      isConsentFormAvailable: true,
      canRequestAds: false,
    });
    const ads = new AdMobAds(api, new NetworkState(true), SETUP, new FakeClock());
    let finishLoading = (): void => undefined;
    const launched = new Promise<void>((resolve) => (finishLoading = resolve));
    const started = ads.start(launched);
    await settle();
    expect(api.formsShown).toBe(0);
    expect(api.inits).toBe(0);
    finishLoading();
    await started;
    await settle();
    expect(api.formsShown).toBe(1);
    expect(api.inits).toBe(1);
    expect(api.loads).toHaveLength(1);
  });

  it('never loads when the player refuses', async () => {
    const api = new FakeAdMob();
    api.consentInfo = consent({
      status: 'REQUIRED',
      isConsentFormAvailable: true,
      canRequestAds: false,
    });
    api.formAnswer = consent({ status: 'OBTAINED', canRequestAds: false });
    const { ads } = await launch({ api });
    expect(api.formsShown).toBe(1);
    expect(api.inits).toBe(0);
    expect(readyAll(ads)).toEqual([false, false, false]);
    expect(ads.status().consent).toBe('OBTAINED, no ads');
  });

  it("doesn't wait long for the answer, and a late one never brings the form up", async () => {
    const api = new FakeAdMob();
    api.holdConsent = true;
    api.consentInfo = consent({
      status: 'REQUIRED',
      isConsentFormAvailable: true,
      canRequestAds: true,
    });
    const clock = new FakeClock();
    const ads = new AdMobAds(api, new NetworkState(true), SETUP, clock);
    let done = false;
    void ads.start(Promise.resolve()).then(() => (done = true));
    await clock.advance(CONSENT_INFO_TIMEOUT_MS - 1);
    expect(done).toBe(false);
    await clock.advance(1);
    await settle();
    expect(done).toBe(true);
    api.answerConsent();
    await settle();
    expect(api.formsShown).toBe(0);
    // A player who consented before can still get ads this launch.
    expect(api.inits).toBe(1);
  });

  it('asks without the form when the connection comes after an offline launch', async () => {
    const api = new FakeAdMob();
    api.consentInfo = consent({
      status: 'REQUIRED',
      isConsentFormAvailable: true,
      canRequestAds: false,
    });
    const { network } = await launch({ api, online: false });
    expect(api.consentRequests).toHaveLength(0);
    network.set(true);
    await settle();
    expect(api.consentRequests).toHaveLength(1);
    expect(api.formsShown).toBe(0);
    expect(api.inits).toBe(0);
  });

  it('asks again when the connection comes back after a failed request', async () => {
    const api = new FakeAdMob();
    api.consentInfo = new Error('timeout');
    const { network } = await launch({ api });
    api.consentInfo = consent();
    network.set(false);
    network.set(true);
    await settle();
    expect(api.consentRequests).toHaveLength(2);
    expect(api.inits).toBe(1);
  });

  it('passes the EEA debug geography and the test devices with ?consent=eea', async () => {
    const { api } = await launch({
      setup: { ...SETUP, consentDebugEea: true, testingDevices: ['ABC123'] },
    });
    expect(api.consentRequests).toEqual([
      { debugGeography: CONSENT_DEBUG_GEOGRAPHY_EEA, testDeviceIdentifiers: ['ABC123'] },
    ]);
  });

  it('retries a failed SDK start', async () => {
    const api = new FakeAdMob();
    api.initFailures = 1;
    const { ads, clock } = await launch({ api });
    expect(ads.status().sdk).toBe('failed');
    await clock.advance(AD_RETRY_DELAYS_MS[0] ?? 0);
    expect(api.inits).toBe(2);
    expect(ads.status().sdk).toBe('ready');
    expect(api.loads).toHaveLength(1);
  });

  it('retries a failed load after 30 s, 1 min, 2 min, then every 5 min', async () => {
    const { ads, api, clock } = await launch();
    const gaps: number[] = [];
    let last = clock.now();
    for (let i = 0; i < 6; i++) {
      api.finishLoads(false);
      await settle();
      expect(ads.ready('specialBall')).toBe(false);
      while (api.loads.length === 0) await clock.advance(1000);
      gaps.push(clock.now() - last);
      last = clock.now();
    }
    expect(gaps).toEqual([30_000, 60_000, 120_000, 300_000, 300_000, 300_000]);
    api.finishLoads();
    await settle();
    expect(ads.ready('specialBall')).toBe(true);
  });

  it('retries at once when the connection comes back', async () => {
    const { ads, api, network, clock } = await launch();
    api.finishLoads(false);
    await settle();
    expect(ads.status().placements.specialBall).toBe('retry in 30 s');
    network.set(false);
    await clock.advance(5000);
    network.set(true);
    await settle();
    expect(api.loads).toHaveLength(1);
  });

  it('is never ready offline, even with an ad loaded', async () => {
    const { ads, api, network } = await launch();
    api.finishLoads();
    await settle();
    let changes = 0;
    ads.onChange(() => changes++);
    network.set(false);
    expect(changes).toBe(1);
    expect(readyAll(ads)).toEqual([false, false, false]);
    expect(ads.status().placements.doubleCoins).toBe('loaded, offline');
    network.set(true);
    await settle();
    expect(readyAll(ads)).toEqual([true, true, true]);
    expect(api.loads).toHaveLength(0);
  });

  it('throws an ad away before the hour is up and loads a fresh one', async () => {
    const { ads, api, clock } = await launch();
    api.finishLoads();
    await settle();
    await clock.advance(AD_MAX_AGE_MS - 1);
    expect(api.loads).toHaveLength(0);
    await clock.advance(1);
    expect(ads.ready('luckySave')).toBe(false);
    expect(api.loads).toHaveLength(1);
  });
});

describe('AdMobAds: showing', () => {
  async function loaded(setup: AdMobSetup = SETUP) {
    const launched = await launch({ setup });
    launched.api.finishLoads();
    await settle();
    return launched;
  }

  it('gives rewarded only when AdMob sent the reward, after the ad closed', async () => {
    const { ads, api } = await loaded();
    const shown = ads.show('specialBall');
    expect(ads.showing).toBe(true);
    expect(readyAll(ads)).toEqual([false, false, false]);
    expect(api.shows).toEqual([TEST_REWARDED_AD_UNIT]);
    let result: string | null = null;
    void shown.then((r) => (result = r));
    api.emit('rewarded');
    await settle();
    expect(result).toBeNull();
    api.emit('dismissed');
    expect(await shown).toBe('rewarded');
    expect(ads.showing).toBe(false);
    // The next ad loads at once.
    expect(api.loads).toHaveLength(1);
  });

  it('gives closed when the player closes the ad early', async () => {
    const { ads, api } = await loaded();
    const shown = ads.show('luckySave');
    api.emit('dismissed');
    expect(await shown).toBe('closed');
  });

  it('gives failed when the ad fails to show, or was never ready', async () => {
    const { ads, api } = await loaded();
    const shown = ads.show('doubleCoins');
    api.emit('failedToShow');
    expect(await shown).toBe('failed');
    expect(await ads.show('doubleCoins')).toBe('failed');
    api.finishLoads();
    await settle();
    api.showRejects = true;
    expect(await ads.show('doubleCoins')).toBe('failed');
    expect(ads.showing).toBe(false);
  });

  it('keeps the other units ready while one shows', async () => {
    const { ads, api } = await loaded(SEPARATE_UNITS);
    const shown = ads.show('specialBall');
    expect(ads.ready('luckySave')).toBe(false);
    api.emit('dismissed');
    await shown;
    expect(ads.ready('specialBall')).toBe(false);
    expect(ads.ready('luckySave')).toBe(true);
    expect(api.loads.map((l) => l.adId)).toEqual(['unit/a']);
  });
});

describe('AdMobAds: privacy options', () => {
  it('shows Privacy options when AdMob requires them, and asks again after the form', async () => {
    const api = new FakeAdMob();
    api.consentInfo = consent({ status: 'OBTAINED', privacyOptionsRequirementStatus: 'REQUIRED' });
    const { ads } = await launch({ api });
    expect(ads.privacyOptionsRequired).toBe(true);
    api.consentInfo = consent({ status: 'OBTAINED', canRequestAds: false });
    await ads.showPrivacyOptions();
    expect(api.privacyFormsShown).toBe(1);
    expect(api.consentRequests).toHaveLength(2);
    expect(ads.privacyOptionsRequired).toBe(false);
    expect(readyAll(ads)).toEqual([false, false, false]);
  });

  it('forgets the answer on a reset', async () => {
    const { ads, api } = await launch();
    await ads.resetConsent();
    expect(api.resets).toBe(1);
    expect(ads.status().consent).toBe('not asked');
  });
});

describe('NoAds', () => {
  it('is never ready and never shows', async () => {
    const ads = new NoAds(new NetworkState(true));
    expect(AD_PLACEMENTS.map(() => ads.ready())).toEqual([false, false, false]);
    expect(await ads.show()).toBe('failed');
    expect(ads.showing).toBe(false);
    expect(ads.privacyOptionsRequired).toBe(false);
    expect(ads.status().kind).toBe('none');
  });
});

describe('FakeAds', () => {
  it('is ready only online, and shows the test ad', async () => {
    const network = new NetworkState(true);
    let answer: (result: 'rewarded' | 'closed') => void = () => undefined;
    const presented: AdPlacement[] = [];
    const ads = new FakeAds(network, (placement) => {
      presented.push(placement);
      return new Promise((resolve) => (answer = resolve));
    });
    let changes = 0;
    ads.onChange(() => changes++);
    expect(ads.ready()).toBe(true);
    const shown = ads.show('luckySave');
    expect(ads.showing).toBe(true);
    expect(ads.ready()).toBe(false);
    answer('rewarded');
    expect(await shown).toBe('rewarded');
    expect(presented).toEqual(['luckySave']);
    expect(ads.showing).toBe(false);
    network.set(false);
    expect(ads.ready()).toBe(false);
    expect(await ads.show('specialBall')).toBe('failed');
    expect(changes).toBe(3);
    expect(ads.status().placements.specialBall).toBe('offline');
  });
});
