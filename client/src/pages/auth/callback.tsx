import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUserStore } from '@/store/user-store';

// Check if Supabase environment variables are configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function AuthCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      if (!supabase) {
        console.error('Supabase n\'est pas configuré. Redirection vers /register');
        window.location.assign('/register');
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Appeler notre API pour créer l'utilisateur complet dans le système de jeu
        try {
          const response = await fetch('/api/auth/apple-signin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              supabaseUserId: user.id,
              email: user.email,
              username: user.user_metadata?.username || user.email?.split('@')[0] || 'Player'
            }),
            credentials: 'include',
          });

          if (response.ok) {
            const userData = await response.json();
            
            // Mettre à jour l'état utilisateur dans le store
            useUserStore.setState({ 
              user: userData.user, 
              error: null 
            });
            
            // Connexion réussie - rediriger vers le jeu
            window.location.assign('/');
          } else {
            console.error('Erreur lors de la création du compte:', await response.text());
            window.location.assign('/register');
          }
        } catch (error) {
          console.error('Erreur réseau:', error);
          window.location.assign('/register');
        }
      } else {
        window.location.assign('/register');
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Sign in with Apple...</p>
      </div>
    </div>
  );
}