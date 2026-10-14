import { describe, expect, it } from 'vitest';
import { COMBO_BASE_HZ, LIMITER, MERGE_PITCH_TOP_HZ, MUSIC, SOUNDS } from '../../src/config/audio';
import type { SoundName, SoundSpec } from '../../src/config/audio';
import { comboPitch, dangerTickPitch, mergePitch, semitones } from '../../src/audio/pitch';
import { VoiceThrottle } from '../../src/audio/throttle';
import { MusicPlayer, musicPosition } from '../../src/audio/music';

describe('sound pitches (GAME_DESIGN §12)', () => {
  it('pops lower for bigger cats', () => {
    expect(mergePitch(2)).toBeCloseTo(MERGE_PITCH_TOP_HZ, 6);
    for (let size = 3; size <= 12; size++) {
      expect(mergePitch(size)).toBeLessThan(mergePitch(size - 1));
    }
    expect(mergePitch(12)).toBeGreaterThan(150);
  });

  it('raises the combo notes along a pentatonic scale, then holds', () => {
    expect(comboPitch(2)).toBeCloseTo(COMBO_BASE_HZ, 6);
    expect(comboPitch(3)).toBeCloseTo(semitones(COMBO_BASE_HZ, 2), 6);
    expect(comboPitch(7)).toBeCloseTo(semitones(COMBO_BASE_HZ, 12), 6);
    for (let combo = 3; combo <= 12; combo++) {
      expect(comboPitch(combo)).toBeGreaterThan(comboPitch(combo - 1));
    }
    expect(comboPitch(40)).toBe(comboPitch(12));
  });

  it('ticks higher as the danger countdown runs out', () => {
    expect(dangerTickPitch(2)).toBeGreaterThan(dangerTickPitch(3));
    expect(dangerTickPitch(1)).toBeGreaterThan(dangerTickPitch(2));
    expect(dangerTickPitch(9)).toBe(dangerTickPitch(3));
    expect(dangerTickPitch(0)).toBe(dangerTickPitch(1));
  });
});

describe('VoiceThrottle', () => {
  const spec = (s: Partial<SoundSpec>): SoundSpec => ({
    volume: 1,
    durationMs: 200,
    minIntervalMs: 30,
    maxVoices: 3,
    ...s,
  });
  const specs = { ...SOUNDS, merge: spec({}), coin: spec({ minIntervalMs: 0, maxVoices: 10 }) };

  it('collapses ten simultaneous merges into one voice per interval', () => {
    const throttle = new VoiceThrottle(specs, 20);
    const played = Array.from({ length: 10 }, () => throttle.allow('merge', 1000));
    expect(played.filter(Boolean)).toHaveLength(1);
    expect(throttle.allow('merge', 1029)).toBe(false);
    expect(throttle.allow('merge', 1030)).toBe(true);
  });

  it('caps the voices of one sound until they end', () => {
    const throttle = new VoiceThrottle(specs, 20);
    expect([0, 30, 60, 90].map((t) => throttle.allow('merge', t))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(throttle.active(90)).toBe(3);
    // The first voice ends at 200.
    expect(throttle.allow('merge', 200)).toBe(true);
  });

  it('caps the voices of all sounds together', () => {
    const throttle = new VoiceThrottle(specs, 4);
    for (let i = 0; i < 3; i++) expect(throttle.allow('merge', i * 30)).toBe(true);
    expect(throttle.allow('coin', 90)).toBe(true);
    expect(throttle.allow('coin', 91)).toBe(false);
    expect(throttle.active(91)).toBe(4);
    throttle.reset();
    expect(throttle.active(91)).toBe(0);
    expect(throttle.allow('coin', 91)).toBe(true);
  });

  it('has a sane spec for every sound', () => {
    for (const name of Object.keys(SOUNDS) as SoundName[]) {
      const s = SOUNDS[name];
      expect(s.volume).toBeGreaterThan(0);
      expect(s.volume).toBeLessThanOrEqual(1);
      expect(s.maxVoices).toBeGreaterThanOrEqual(1);
      expect(s.durationMs).toBeGreaterThan(0);
    }
  });
});

describe('background music (GAME_DESIGN §12)', () => {
  const loop = { loopStartS: 10, loopEndS: 40 };

  it('plays the intro once, then goes round the loop', () => {
    expect(musicPosition(0, 5, loop)).toBe(5);
    expect(musicPosition(0, 39, loop)).toBe(39);
    expect(musicPosition(0, 40, loop)).toBe(10);
    expect(musicPosition(0, 45, loop)).toBe(15);
    expect(musicPosition(0, 40 + 30 * 7 + 2, loop)).toBeCloseTo(12, 9);
    expect(musicPosition(25, 20, loop)).toBe(15);
    expect(musicPosition(5, -1, loop)).toBe(5);
  });

  it('loops inside the file and stays under the limiter', () => {
    expect(MUSIC.loopStartS).toBeGreaterThan(0);
    expect(MUSIC.loopEndS - MUSIC.loopStartS).toBeGreaterThan(60);
    // The file's peak is about -1.2 dBFS: with the gain the music alone never reaches the threshold.
    expect(20 * Math.log10(MUSIC.volume) - 1.2).toBeLessThan(LIMITER.thresholdDb);
    expect(MUSIC.file).toMatch(/^assets\/music\/.+\.mp3$/);
  });

  /** Just enough of an AudioContext for the player: a clock, gains and buffer sources. */
  function fakeContext() {
    const sources: { offset: number; stopAt: number | null; loopStart: number; loopEnd: number }[] =
      [];
    const ctx = {
      currentTime: 0,
      decoded: 0,
      createGain: () => {
        const param = {
          value: 0,
          setValueAtTime: (v: number) => void (param.value = v),
          linearRampToValueAtTime: (v: number) => void (param.value = v),
          cancelScheduledValues: () => undefined,
        };
        return { gain: param, connect: () => undefined, disconnect: () => undefined };
      },
      createBufferSource: () => {
        const record = { offset: -1, stopAt: null as number | null, loopStart: 0, loopEnd: 0 };
        sources.push(record);
        const node = {
          buffer: null,
          loop: false,
          onended: null,
          set loopStart(v: number) {
            record.loopStart = v;
          },
          set loopEnd(v: number) {
            record.loopEnd = v;
          },
          connect: () => undefined,
          start: (_t: number, offset: number) => void (record.offset = offset),
          stop: (t: number) => void (record.stopAt = t),
        };
        return node;
      },
      decodeAudioData: async () => {
        ctx.decoded++;
        return {};
      },
    };
    return { ctx, sources };
  }
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('loads only once switched on, and goes on where it stopped', async () => {
    const { ctx, sources } = fakeContext();
    let loads = 0;
    const player = new MusicPlayer('m.mp3', async () => {
      loads++;
      return new ArrayBuffer(8);
    });
    player.attach(ctx as unknown as AudioContext, {} as AudioNode);
    await flush();
    expect(loads).toBe(0);

    player.setOn(true);
    await flush();
    expect(loads).toBe(1);
    expect(player.playing).toBe(true);
    expect(sources[0]).toMatchObject({ offset: 0, loopStart: MUSIC.loopStartS });
    expect(sources[0]?.loopEnd).toBe(MUSIC.loopEndS);

    ctx.currentTime = MUSIC.loopEndS + 3;
    player.setOn(false);
    expect(player.playing).toBe(false);
    expect(sources[0]?.stopAt).toBeCloseTo(MUSIC.loopEndS + 3 + MUSIC.fadeOutS, 9);

    player.setOn(true);
    await flush();
    expect(loads).toBe(1);
    expect(ctx.decoded).toBe(1);
    expect(sources[1]?.offset).toBeCloseTo(MUSIC.loopStartS + 3, 9);
  });

  it('stays silent when the file fails, and tries again next time', async () => {
    const { ctx, sources } = fakeContext();
    let fail = true;
    const player = new MusicPlayer('m.mp3', async () => {
      if (fail) throw new Error('offline');
      return new ArrayBuffer(8);
    });
    player.setOn(true);
    player.attach(ctx as unknown as AudioContext, {} as AudioNode);
    await flush();
    expect(player.playing).toBe(false);
    player.setOn(false);
    fail = false;
    player.setOn(true);
    await flush();
    expect(player.playing).toBe(true);
    expect(sources).toHaveLength(1);
  });
});
