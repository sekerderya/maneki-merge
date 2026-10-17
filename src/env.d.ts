/// <reference types="vite-plugin-pwa/vanillajs" />

/** Injected at build time by vite.config.ts. */
declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;
/** Every image under public/assets and public/clips, relative to the base URL (the loading screen). */
declare const __PRELOAD_IMAGES__: readonly string[];
/** True in the Android app's build (`vite build --mode android`, TECH_SPEC §16), false elsewhere. */
declare const __NATIVE_APP__: boolean;
/**
 * The play statistics' keys (TECH_SPEC §17), from the build's environment (vite.config.ts): null
 * for a service without them. `firebaseApp`: the Android build has Firebase's config for both apps.
 */
declare const __ANALYTICS_KEYS__: {
  readonly gameAnalytics: { readonly gameKey: string; readonly secretKey: string } | null;
  readonly gameAnalyticsTest: { readonly gameKey: string; readonly secretKey: string } | null;
  readonly firebaseWeb: Readonly<Record<string, string>> | null;
  readonly firebaseApp: boolean;
};
