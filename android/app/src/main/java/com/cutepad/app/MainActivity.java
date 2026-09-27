package com.cutepad.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // On Android 15+/edge-to-edge the WebView is laid out behind the status bar
        // and gesture bar. Pad it so the app content always sits below the system UI
        // (status bar, display cutout, navigation bar) and never covers battery /
        // notification indicators or the notification shade swipe area.
        try {
            final View webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                ViewCompat.setOnApplyWindowInsetsListener(
                    webView,
                    (view, windowInsets) -> {
                        int systemTop =
                            windowInsets.getInsets(
                                    WindowInsetsCompat.Type.statusBars()
                                        | WindowInsetsCompat.Type.displayCutout()
                                    )
                                .top;
                        int systemBottom =
                            windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                        // Keep the left/right padding untouched; pad top for the status
                        // bar and bottom for the gesture navigation bar.
                        view.setPadding(view.getPaddingLeft(), systemTop, view.getPaddingRight(), systemBottom);
                        // Do not consume the insets: the WebView still needs IME
                        // (keyboard) insets for its own scrolling.
                        return windowInsets;
                    }
                );
                webView.requestApplyInsets();
            }
        } catch (Exception ignored) {
            // Insets are a progressive enhancement; never block app startup.
        }
    }
}
