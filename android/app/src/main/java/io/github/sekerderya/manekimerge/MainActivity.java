package io.github.sekerderya.manekimerge;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Maneki Merge's Android app (docs/TECH_SPEC.md §16): Capacitor's WebView with the game's own
 * files, full screen like the installed web app.
 */
public class MainActivity extends BridgeActivity {

    /** The splash never stays longer than this, even if the page doesn't load. */
    private static final long SPLASH_MAX_MS = 2000;

    private volatile boolean pageLoaded = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DevicePlugin.class);
        // The splash (the cream and the icon) stays until the page has loaded, so the game's own
        // loading screen follows it with no empty frame between. Not until the page's first
        // paint: the splash holds back the WebView's drawing, and that paint would never come.
        SplashScreen.installSplashScreen(this).setKeepOnScreenCondition(() -> !pageLoaded);
        super.onCreate(savedInstanceState);
        new Handler(Looper.getMainLooper()).postDelayed(() -> pageLoaded = true, SPLASH_MAX_MS);
        if (bridge != null) {
            bridge.addWebViewListener(
                new WebViewListener() {
                    @Override
                    public void onPageLoaded(WebView webView) {
                        pageLoaded = true;
                    }
                }
            );
        }

        // Edge to edge and into the camera cutout: with the bars hidden, the default cutout mode
        // leaves a black band the cutout's height at the top (the installed web app's v0.42.15
        // problem). Capacitor's SystemBars plugin reports the cutout to the page's CSS as
        // env(safe-area-inset-*) (capacitor.config.ts).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Back from an ad, a dialog or another app: full screen again.
        if (hasFocus) hideSystemBars();
    }

    /** Immersive: the status and navigation bars are hidden; a swipe shows them for a moment. */
    private void hideSystemBars() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
