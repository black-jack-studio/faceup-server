import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from './lib/supabase';

export function registerDeepLinkHandler() {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      const u = new URL(url);
      // Format attendu: faceup://auth/callback?code=...&state=...
      const code = u.searchParams.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Supabase exchange error', error);
        } else {
          console.log('Session exchanged successfully', data);
          // La session est maintenant établie, l'app va automatiquement se rediriger
          // via les mécanismes de routing existants
        }
      }
    } catch (e) {
      console.error('Deep link parse error', e);
    }
  });
}
