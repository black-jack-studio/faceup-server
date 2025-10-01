import { supabase } from '../supabase';

export const BattlePassAdapter = {
  async getCurrentSeason() {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      const now = new Date();
      const monthName = now.toLocaleDateString('en-US', { month: 'long' });
      return {
        id: `season-${now.getFullYear()}-${now.getMonth() + 1}`,
        name: `${monthName} Season`,
        start_date: new Date(now.getFullYear(), now.getMonth(), 1),
        end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        is_active: true
      };
    }
    
    return data;
  },

  async createSeason(season: any) {
    const { data, error } = await supabase
      .from('seasons')
      .insert(season)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getClaimedBattlePassTiers(userId: string) {
    const { data, error } = await supabase
      .from('battle_pass_rewards')
      .select('*')
      .eq('user_id', userId);
    
    if (error) return [];
    return data || [];
  },

  async claimBattlePassTier(userId: string, tier: number, rewardType: string, rewardAmount: number) {
    const { data, error } = await supabase
      .from('battle_pass_rewards')
      .insert({
        user_id: userId,
        tier,
        reward_type: rewardType,
        reward_amount: rewardAmount
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async addSeasonXPToUser(userId: string, xp: number) {
    const { data, error } = await supabase.rpc('add_season_xp', {
      p_user_id: userId,
      p_xp: xp
    });
    
    if (error) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('season_xp')
        .eq('user_id', userId)
        .single();
      
      const currentXP = profile?.season_xp || 0;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ season_xp: currentXP + xp })
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
    }
  },

  async getTimeUntilSeasonEnd() {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const timeLeft = endOfMonth.getTime() - now.getTime();
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  },

  async resetSeasonProgress() {
    const { error } = await supabase.rpc('reset_all_season_progress');
    if (error) throw error;
  }
};
