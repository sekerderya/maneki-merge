# Android app (Google Play)

Capacitor's Android project (`npx cap add android`, Capacitor 8) with the game's own files inside
it (`npm run build:android`: `vite build --mode android`, then `cap sync android` copies
`dist-android/` into `app/src/main/assets/public/`) and Google's AdMob through
`@capacitor-community/admob`. How it works: docs/TECH_SPEC.md §16. Publishing it on Google Play:
[docs/PLAY_STORE.md](../docs/PLAY_STORE.md).

By hand, beside Capacitor's template: `MainActivity` (full screen, the camera cutout, the splash),
`DevicePlugin` (the dev app's test device ID), the version from `package.json`, the `.dev` build type
and its name (`app/src/debug/res`), the manifest (portrait, the AdMob App ID, vibration), the
themes and the launcher icons (`npm run icons`).

The `Android` workflow builds and signs it; nothing here needs Java or the Android SDK on the PC.
