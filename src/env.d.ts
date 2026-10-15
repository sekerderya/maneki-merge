/// <reference types="vite-plugin-pwa/vanillajs" />

/** Injected at build time by vite.config.ts. */
declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;
/** Every image under public/assets and public/clips, relative to the base URL (the loading screen). */
declare const __PRELOAD_IMAGES__: readonly string[];
/** True in the Android app's build (`vite build --mode android`, TECH_SPEC §16), false elsewhere. */
declare const __NATIVE_APP__: boolean;
