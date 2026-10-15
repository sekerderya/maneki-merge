package io.github.sekerderya.manekimerge;

import android.content.pm.ApplicationInfo;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * The ID AdMob and its consent check know this phone by as a test device: the MD5 of ANDROID_ID in
 * upper-case hex, as AdMob prints it in logcat. Only the dev app (a debuggable build) answers: its
 * debug panel shows the ID (for src/config/ads.ts AD_TESTING_DEVICES) and puts it on the test
 * device lists, so the EEA consent test works on the owner's phone (docs/TECH_SPEC.md §16).
 */
@CapacitorPlugin(name = "ManekiDevice")
public class DevicePlugin extends Plugin {

    @PluginMethod
    public void testDeviceId(PluginCall call) {
        if ((getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) {
            call.reject("Only the dev app reads the test device ID");
            return;
        }
        try {
            String androidId = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
            byte[] digest = MessageDigest.getInstance("MD5").digest(androidId.getBytes(StandardCharsets.UTF_8));
            JSObject result = new JSObject();
            result.put("id", String.format(Locale.US, "%032X", new BigInteger(1, digest)));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("No test device ID", e);
        }
    }
}
