import { supabase } from "../supabase";

/**
 * Gems adapter - All gem transaction operations via Supabase
 */

export interface GemTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earn' | 'spend';
  description: string;
  related_id?: string | null;
  created_at?: string;
}

export interface GemPurchase {
  id: string;
  user_id: string;
  gem_amount: number;
  cost_currency: string;
  cost_amount: number;
  stripe_payment_intent_id?: string | null;
  created_at?: string;
}

export async function createGemTransaction(
  userId: string,
  amount: number,
  type: 'earn' | 'spend',
  description: string,
  relatedId?: string
): Promise<GemTransaction> {
  const { data, error } = await supabase
    .from('gem_transactions')
    .insert({
      user_id: userId,
      amount,
      type,
      description,
      related_id: relatedId || null
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserGemTransactions(userId: string): Promise<GemTransaction[]> {
  const { data, error } = await supabase
    .from('gem_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('[GemsAdapter] getUserGemTransactions error:', error);
    return [];
  }
  
  return data || [];
}

export async function createGemPurchase(
  userId: string,
  gemAmount: number,
  costCurrency: string,
  costAmount: number,
  stripePaymentIntentId?: string
): Promise<GemPurchase> {
  const { data, error } = await supabase
    .from('gem_purchases')
    .insert({
      user_id: userId,
      gem_amount: gemAmount,
      cost_currency: costCurrency,
      cost_amount: costAmount,
      stripe_payment_intent_id: stripePaymentIntentId || null
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserGemPurchases(userId: string): Promise<GemPurchase[]> {
  const { data, error } = await supabase
    .from('gem_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('[GemsAdapter] getUserGemPurchases error:', error);
    return [];
  }
  
  return data || [];
}
