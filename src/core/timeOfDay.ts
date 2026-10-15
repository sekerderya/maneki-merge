import {
  SOLAR_NOON_HOUR,
  SUN_LATITUDE_DEG,
  SUN_MAX_DECLINATION_DEG,
  SUNSET_AFTER_MIN,
  SUNSET_BEFORE_MIN,
} from '../config/timeOfDay';
import type { TimeOfDay } from '../config/timeOfDay';

const DAY_MS = 86_400_000;
const RAD = Math.PI / 180;

/** When the sun rises and sets, minutes after the local midnight. */
export interface SunTimes {
  readonly sunrise: number;
  readonly sunset: number;
}

/** The day of the year of `date` in its local calendar: 1 on 1 January. */
export function dayOfYear(date: Date): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today - Date.UTC(date.getFullYear(), 0, 0)) / DAY_MS);
}

/**
 * The sun's times on `date`'s day at SUN_LATITUDE_DEG (config/timeOfDay.ts): the sun's tilt for
 * the day of the year, and from it half the day's length either side of SOLAR_NOON_HOUR.
 */
export function sunTimes(date: Date): SunTimes {
  const tilt = SUN_MAX_DECLINATION_DEG * Math.sin((2 * Math.PI * (284 + dayOfYear(date))) / 365);
  const cos = -Math.tan(SUN_LATITUDE_DEG * RAD) * Math.tan(tilt * RAD);
  // Past the polar circles the sun stays up (or down) all day.
  const halfDayDeg = Math.acos(Math.min(1, Math.max(-1, cos))) / RAD;
  // The sun crosses 15° an hour: 4 minutes a degree.
  const half = halfDayDeg * 4;
  const noon = SOLAR_NOON_HOUR * 60;
  return { sunrise: noon - half, sunset: noon + half };
}

/**
 * The garden's time at `date` (GAME_DESIGN §7.3): `sunset` from SUNSET_BEFORE_MIN before the sun
 * sets to SUNSET_AFTER_MIN after it, `night` from then until sunrise, else `day`.
 */
export function timeOfDayAt(date: Date): TimeOfDay {
  const { sunrise, sunset } = sunTimes(date);
  const now = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  if (now >= sunset - SUNSET_BEFORE_MIN && now < sunset + SUNSET_AFTER_MIN) return 'sunset';
  if (now >= sunset + SUNSET_AFTER_MIN || now < sunrise) return 'night';
  return 'day';
}
