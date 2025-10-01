import { supabase } from '../supabase';

export const ChallengesAdapter = {
  async getChallenges() {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async getUserChallenges(userId: string) {
    const { data, error } = await supabase
      .from('user_challenges')
      .select(`
        id,
        challenge_id,
        current_progress,
        reward_claimed,
        is_completed,
        challenge:challenges (
          id,
          title,
          description,
          target_value,
          reward,
          difficulty,
          challenge_type
        )
      `)
      .eq('user_id', userId);
    if (error) throw error;
    
    // Map snake_case to camelCase for TypeScript compatibility
    return (data || []).map((row: any) => ({
      id: row.id,
      challengeId: row.challenge_id,
      currentProgress: row.current_progress,
      rewardClaimed: row.reward_claimed,
      isCompleted: row.is_completed,
      challenge: row.challenge ? {
        id: row.challenge.id,
        title: row.challenge.title,
        description: row.challenge.description,
        targetValue: row.challenge.target_value,
        reward: row.challenge.reward,
        difficulty: row.challenge.difficulty,
        challengeType: row.challenge.challenge_type
      } : undefined
    }));
  },

  async assignChallengeToUser(userId: string, challengeId: string) {
    const { data, error } = await supabase
      .from('user_challenges')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        current_progress: 0,
        is_completed: false,
        reward_claimed: false
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateChallengeProgress(userId: string, challengeId: string, progress: number) {
    const { data, error } = await supabase
      .from('user_challenges')
      .update({ current_progress: progress })
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeChallengeForUser(userId: string, challengeId: string) {
    const { data, error } = await supabase
      .from('user_challenges')
      .update({ is_completed: true })
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markChallengeRewardAsClaimed(userId: string, challengeId: string) {
    const { data, error } = await supabase
      .from('user_challenges')
      .update({ reward_claimed: true })
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeUserChallenge(userId: string, challengeId: string) {
    const { error } = await supabase
      .from('user_challenges')
      .delete()
      .eq('user_id', userId)
      .eq('challenge_id', challengeId);
    if (error) throw error;
  },

  async cleanupExpiredChallenges() {
    // Skip cleanup if expires_at column doesn't exist
    // Challenges are managed by daily reset instead
    return;
  },

  async deleteTodaysChallenges(userId: string) {
    const { error } = await supabase
      .from('user_challenges')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  },

  async createChallenge(challenge: any) {
    // Convert camelCase to snake_case for Supabase
    const dbChallenge = {
      challenge_type: challenge.challengeType,
      title: challenge.title,
      description: challenge.description,
      target_value: challenge.targetValue,
      reward: challenge.reward,
      difficulty: challenge.difficulty,
      is_active: challenge.isActive ?? true,
      expires_at: challenge.expiresAt
    };
    
    const { data, error } = await supabase
      .from('challenges')
      .insert(dbChallenge)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
