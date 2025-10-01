import { supabase } from '../supabase';

export const DailySpinAdapter = {
  async getLastSpinAt(userId: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('daily_spins')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return new Date(data.created_at);
  },

  async canUserSpin24h(userId: string): Promise<boolean> {
    const lastSpin = await this.getLastSpinAt(userId);
    if (!lastSpin) return true;
    
    const now = new Date();
    const hoursSinceLastSpin = (now.getTime() - lastSpin.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSpin >= 24;
  },

  async canUserSpin(userId: string): Promise<boolean> {
    return this.canUserSpin24h(userId);
  },

  async getSpinStatus(userId: string) {
    const lastSpin = await this.getLastSpinAt(userId);
    const canSpin = await this.canUserSpin(userId);
    
    let nextSpinAt = null;
    if (lastSpin && !canSpin) {
      nextSpinAt = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      canSpin,
      lastSpinAt: lastSpin,
      nextSpinAt
    };
  },

  async createDailySpin(userId: string, reward: number, rewardType: string) {
    const { data, error } = await supabase
      .from('daily_spins')
      .insert({
        user_id: userId,
        reward,
        reward_type: rewardType
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async createSpin(userId: string, reward: number, rewardType: string) {
    return this.createDailySpin(userId, reward, rewardType);
  }
};
