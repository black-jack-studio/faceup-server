import { supabase } from "../supabase";

/**
 * Profile adapter - All user profile operations via Supabase
 */

export interface Profile {
  user_id: string;
  username: string | null;
  email: string | null;
  coins: number;
  gems: number;
  tickets: number;
  avatar_id?: string | null;
  selected_card_back_id?: string | null;
  xp?: number;
  level?: number;
  season_xp?: number;
  season_level?: number;
  streak_21?: number;
  max_single_win?: number;
  referral_code?: string | null;
  referred_by?: string | null;
  referral_reward_claimed?: boolean;
  created_at?: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('[ProfileAdapter] getProfile error:', error);
    return null;
  }
  
  return data;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows
    console.error('[ProfileAdapter] getProfileByUsername error:', error);
    return null;
  }
  
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();
  
  if (error) {
    console.error('[ProfileAdapter] updateProfile error:', error);
    throw error;
  }
  
  return data;
}

export async function updateCoins(userId: string, delta: number): Promise<number> {
  // Read current
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('coins')
    .eq('user_id', userId)
    .single();
  
  if (readError) throw readError;
  if (!profile) throw new Error('Profile not found');
  
  // Update atomically
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ coins: (profile.coins || 0) + delta })
    .eq('user_id', userId)
    .select('coins')
    .single();
  
  if (updateError) throw updateError;
  if (!updated) throw new Error('Update failed');
  
  return updated.coins;
}

export async function updateGems(userId: string, delta: number): Promise<number> {
  // Read current
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('gems')
    .eq('user_id', userId)
    .single();
  
  if (readError) throw readError;
  if (!profile) throw new Error('Profile not found');
  
  // Update atomically
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ gems: (profile.gems || 0) + delta })
    .eq('user_id', userId)
    .select('gems')
    .single();
  
  if (updateError) throw updateError;
  if (!updated) throw new Error('Update failed');
  
  return updated.gems;
}

export async function updateTickets(userId: string, delta: number): Promise<number> {
  // Read current
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('tickets')
    .eq('user_id', userId)
    .single();
  
  if (readError) throw readError;
  if (!profile) throw new Error('Profile not found');
  
  // Update atomically
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ tickets: Math.max(0, (profile.tickets || 0) + delta) })
    .eq('user_id', userId)
    .select('tickets')
    .single();
  
  if (updateError) throw updateError;
  if (!updated) throw new Error('Update failed');
  
  return updated.tickets;
}

export async function searchProfiles(query: string, excludeUserId?: string): Promise<Profile[]> {
  let request = supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20);
  
  if (excludeUserId) {
    request = request.neq('user_id', excludeUserId);
  }
  
  const { data, error } = await request;
  
  if (error) {
    console.error('[ProfileAdapter] searchProfiles error:', error);
    return [];
  }
  
  return data || [];
}
