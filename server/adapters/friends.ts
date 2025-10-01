import { supabase } from "../supabase";

/**
 * Friends adapter - All friendship operations via Supabase
 */

export interface Friendship {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export async function sendFriendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
  // Check if already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`)
    .limit(1)
    .single();
  
  if (existing) {
    throw new Error('Friend request already exists or you are already friends');
  }
  
  const { data, error } = await supabase
    .from('friendships')
    .insert({
      requester_id: requesterId,
      recipient_id: recipientId,
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function acceptFriendRequest(requesterId: string, recipientId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .eq('status', 'pending')
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Friend request not found or already processed');
    }
    throw error;
  }
  
  return data;
}

export async function rejectFriendRequest(requesterId: string, recipientId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', requesterId)
    .eq('recipient_id', recipientId)
    .eq('status', 'pending');
  
  if (error) throw error;
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${userId})`)
    .eq('status', 'accepted');
  
  if (error) throw error;
}

export async function getFriends(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq('status', 'accepted');
  
  if (error) {
    console.error('[FriendsAdapter] getFriends error:', error);
    return [];
  }
  
  return data || [];
}

export async function getFriendRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('recipient_id', userId)
    .eq('status', 'pending');
  
  if (error) {
    console.error('[FriendsAdapter] getFriendRequests error:', error);
    return [];
  }
  
  return data || [];
}

export async function checkFriendship(userId: string, friendId: string): Promise<{ status: string | null }> {
  const { data } = await supabase
    .from('friendships')
    .select('status')
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${userId})`)
    .limit(1)
    .single();
  
  return { status: data?.status || null };
}
