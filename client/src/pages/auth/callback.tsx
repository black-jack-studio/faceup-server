import { useEffect } from 'react';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    const handleAuth = async () => {
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
            
            // Connexion réussie - rediriger vers le jeu avec navigation SPA
            setLocation('/');
          } else {
            console.error('Erreur lors de la création du compte:', await response.text());
            setLocation('/register');
          }
        } catch (error) {
          console.error('Erreur réseau:', error);
          setLocation('/register');
        }
      } else {
        setLocation('/register');
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Connexion avec Apple...</p>
      </div>
    </div>
  );
}