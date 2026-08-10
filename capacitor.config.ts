import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beaudoin.faceup',
  appName: 'faceup',
  webDir: 'dist/public',
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
