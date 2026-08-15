import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beaudoin.faceup',
  appName: 'faceup',
  webDir: 'dist/public',
  // Native background behind/around the WebView (status bar area, any gap before the web
  // content paints) — without this it defaults to the system gray/white, visible as a strip
  // above the app's own black background until (and unless) the CSS safe-area padding lines up.
  backgroundColor: '#0B0B0F',
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
  },
};

export default config;
