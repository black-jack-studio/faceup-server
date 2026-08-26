import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beaudoin.faceup',
  appName: 'faceup',
  webDir: 'dist/public',
  // Native background behind/around the WebView (status bar area, any gap before the web
  // content paints) — without this it defaults to the system gray/white, visible as a strip
  // above the app's own black background until (and unless) the CSS safe-area padding lines up.
  backgroundColor: '#000000',
  server: {
    androidScheme: 'https',
    // Allow external HTTP/HTTPS requests in production
    allowNavigation: [
      'https://faceup-server.onrender.com',
      'https://*.onrender.com'
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    // Without this, @capacitor/push-notifications shows nothing at all while the app is in
    // the foreground — it still fires the JS "pushNotificationReceived" event, but iOS
    // presents no banner/sound/badge unless explicitly told to via this config. Pushes that
    // arrive while the app is backgrounded/closed are unaffected either way (the OS always
    // presents those).
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // "none": the WKWebView's own frame never resizes when the keyboard appears — without
    // this plugin at all, that was already the behavior, except then nothing else moved
    // either, so a focused input near the bottom (e.g. Reset Password's email field) just
    // sat there behind the keyboard. BottomSheet listens for keyboardWillShow/Hide (see its
    // useKeyboardInset) and shifts only the sheet itself above the keyboard, in place of
    // letting the OS resize/scroll the whole app.
    Keyboard: {
      resize: 'none',
    },
  },
};

export default config;
