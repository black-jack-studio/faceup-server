import { supabase } from "../supabase";

/**
 * Inventory adapter - All inventory operations via Supabase
 */

export interface InventoryItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  created_at?: string;
}

export async function getUserInventory(userId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('[InventoryAdapter] getUserInventory error:', error);
    return [];
  }
  
  return data || [];
}

export async function addInventoryItem(userId: string, itemType: string, itemId: string): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      user_id: userId,
      item_type: itemType,
      item_id: itemId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function removeInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
