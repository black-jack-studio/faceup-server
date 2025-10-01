import { supabase } from "../supabase";

/**
 * Game Stats adapter - All game statistics via Supabase
 */

export interface GameStats {
  user_id: string;
  total_games: number;
  wins: number;
  losses: number;
  coins_earned: number;
  created_at?: string;
  updated_at?: string;
}

export async function getStats(userId: string): Promise<GameStats | null> {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No stats yet - return defaults
      return {
        user_id: userId,
        total_games: 0,
        wins: 0,
        losses: 0,
        coins_earned: 0
      };
    }
    console.error('[StatsAdapter] getStats error:', error);
    return null;
  }
  
  return data;
}

export async function upsertStats(
  userId: string, 
  result: 'win' | 'loss' | 'push',
  coinsEarned: number
): Promise<void> {
  const winsIncrement = result === 'win' ? 1 : 0;
  const lossesIncrement = result === 'loss' ? 1 : 0;
  
  // Try insert first
  const { data: inserted, error: insertError } = await supabase
    .from('game_stats')
    .insert({
      user_id: userId,
      total_games: 1,
      wins: winsIncrement,
      losses: lossesIncrement,
      coins_earned: coinsEarned
    })
    .select()
    .single();
  
  if (insertError) {
    // Conflict - do update
    if (insertError.code === '23505') {
      const { data: current, error: selectError } = await supabase
        .from('game_stats')
        .select('total_games, wins, losses, coins_earned')
        .eq('user_id', userId)
        .single();
      
      if (selectError) throw selectError;
      if (!current) throw new Error('Stats not found for update');
      
      const { error: updateError } = await supabase
        .from('game_stats')
        .update({
          total_games: (current.total_games || 0) + 1,
          wins: (current.wins || 0) + winsIncrement,
          losses: (current.losses || 0) + lossesIncrement,
          coins_earned: (current.coins_earned || 0) + coinsEarned
        })
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
    } else {
      throw insertError;
    }
  }
}
