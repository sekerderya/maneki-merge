import { describe, expect, it } from 'vitest';
import { SOLAR_NOON_HOUR, SUNSET_AFTER_MIN, SUNSET_BEFORE_MIN } from '../../src/config/timeOfDay';
import { dayOfYear, sunTimes, timeOfDayAt } from '../../src/core/timeOfDay';

/** A local time on a day of 2026 (the clock the player's phone shows). */
const at = (month: number, day: number, hours: number, minutes = 0): Date =>
  new Date(2026, month - 1, day, hours, minutes);

describe('time of day (GAME_DESIGN §7.3)', () => {
  it('counts the day of the year in the local calendar', () => {
    expect(dayOfYear(at(1, 1, 0))).toBe(1);
    expect(dayOfYear(at(1, 1, 23, 59))).toBe(1);
    expect(dayOfYear(at(2, 1, 12))).toBe(32);
    expect(dayOfYear(at(12, 31, 12))).toBe(365);
  });

  it('sets the sun about when it sets in Istanbul, in summer and in winter', () => {
    // Istanbul (UTC+3 all year): up about 5:30 to 20:40 at midsummer, 8:25 to 17:40 at midwinter.
    const june = sunTimes(at(6, 21, 12));
    expect(Math.abs(june.sunset - (20 * 60 + 40))).toBeLessThan(20);
    expect(Math.abs(june.sunrise - (5 * 60 + 30))).toBeLessThan(20);
    const december = sunTimes(at(12, 21, 12));
    expect(Math.abs(december.sunset - (17 * 60 + 40))).toBeLessThan(20);
    expect(Math.abs(december.sunrise - (8 * 60 + 25))).toBeLessThan(20);
    // Day and night are about as long at the equinox, either side of noon.
    const march = sunTimes(at(3, 21, 12));
    expect(Math.abs(march.sunset - march.sunrise - 12 * 60)).toBeLessThan(15);
    expect((march.sunset + march.sunrise) / 2).toBeCloseTo(SOLAR_NOON_HOUR * 60, 6);
  });

  it('shows the sunset round the sun going down, then night until sunrise', () => {
    const day = at(10, 15, 12);
    const { sunrise, sunset } = sunTimes(day);
    const when = (minutes: number): Date => at(10, 15, 0, Math.round(minutes));
    expect(timeOfDayAt(when(sunset - SUNSET_BEFORE_MIN - 2))).toBe('day');
    expect(timeOfDayAt(when(sunset - SUNSET_BEFORE_MIN + 1))).toBe('sunset');
    expect(timeOfDayAt(when(sunset))).toBe('sunset');
    expect(timeOfDayAt(when(sunset + SUNSET_AFTER_MIN - 1))).toBe('sunset');
    expect(timeOfDayAt(when(sunset + SUNSET_AFTER_MIN + 1))).toBe('night');
    expect(timeOfDayAt(at(10, 15, 23, 59))).toBe('night');
    expect(timeOfDayAt(at(10, 15, 0, 0))).toBe('night');
    expect(timeOfDayAt(when(sunrise - 2))).toBe('night');
    expect(timeOfDayAt(when(sunrise + 2))).toBe('day');
    expect(timeOfDayAt(day)).toBe('day');
  });

  it('follows the seasons: 19:00 is night in winter and day in summer', () => {
    expect(timeOfDayAt(at(12, 21, 19))).toBe('night');
    expect(timeOfDayAt(at(6, 21, 19))).toBe('day');
    expect(timeOfDayAt(at(6, 21, 20))).toBe('sunset');
    expect(timeOfDayAt(at(6, 21, 21, 30))).toBe('night');
    expect(timeOfDayAt(at(12, 21, 17))).toBe('sunset');
  });
});
