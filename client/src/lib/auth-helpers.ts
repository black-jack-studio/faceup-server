import { supabase } from './supabase';

export async function ensureProfileExists() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return;

  const uid = user.user.id;
  
  // Try to read profile
  const { data: prof } = await supabase
    .from('game_profiles')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();
  
  if (!prof) {
    // Create minimal profile
    const username =
      user.user.user_metadata?.username ||
      user.user.email?.split('@')[0] ||
      `player_${uid.slice(0, 6)}`;

    await supabase
      .from('game_profiles')
      .insert({ 
        user_id: uid, 
        username,
        email: user.user.email || '',
        coins: 5000,
        gems: 0,
        level: 1,
        xp: 0,
        tickets: 3
      })
      .throwOnError();
  }
}
