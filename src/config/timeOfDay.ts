/**
 * The garden's time of day (GAME_DESIGN §7.3): the backgrounds follow the phone's clock, like
 * Pokémon GO's map. No location is asked for, so the sun's times come from the date alone, at one
 * latitude with noon at one clock time: the owner's part of the world (Turkey, about 41° N, with
 * the sun highest near 13:00 all year), close enough across the mid-north. Pure data.
 */

/** `day` is the painted backgrounds as they always were; `sunset` and `night` are their edits. */
export const TIMES_OF_DAY = ['day', 'sunset', 'night'] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/** The latitude the sun's times are worked out for, degrees north. */
export const SUN_LATITUDE_DEG = 41;
/** The clock time the sun is highest, hours after midnight. */
export const SOLAR_NOON_HOUR = 13;
/** The sun's greatest tilt over the year (its declination at the solstices), degrees. */
export const SUN_MAX_DECLINATION_DEG = 23.44;

/** The sunset shows from this long before the sun sets to this long after it, minutes. */
export const SUNSET_BEFORE_MIN = 60;
export const SUNSET_AFTER_MIN = 30;
