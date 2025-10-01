import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import { useUserStore } from './user-store';

interface ChipsState {
  balance: number;
  isLoading: boolean;
  loadBalance: () => Promise<void>;
  setBalance: (balance: number) => void;
  deductBet: (amount: number) => Promise<void>;
  addWinnings: (amount: number) => Promise<void>;
  setAllInBalance: (amount: number) => Promise<void>;
  resetBalance: () => void;
}

const INITIAL_BALANCE = 0;

export const useChipsStore = create<ChipsState>((set, get) => ({
  balance: INITIAL_BALANCE,
  isLoading: false,
  
  loadBalance: async () => {
    set({ isLoading: true });
    try {
      // Load from /api/user/profile (single source of truth)
      const profile = await apiRequest('GET', '/api/user/profile').then(res => res.json());
      const coins = profile.coins ?? 0;
      set({ balance: coins });
      
      // Sync with userStore
      const { updateUser } = useUserStore.getState();
      updateUser({ coins });
    } catch (error) {
      console.error('Failed to load balance from profile:', error);
      // Keep existing balance on error instead of resetting to 0
    } finally {
      set({ isLoading: false });
    }
  },
  
  setBalance: (balance: number) => {
    set({ balance });
  },
  
  deductBet: async (amount: number) => {
    const currentBalance = get().balance;
    const delta = -amount; // Negative delta for deduction
    const newBalance = Math.max(0, currentBalance + delta);
    
    // Update locally first for immediate UI feedback
    set({ balance: newBalance });
    
    // Sync with userStore for user profile consistency  
    try {
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: newBalance });
    } catch (error) {
      console.warn('Failed to sync with user store:', error);
    }
    
    // Then sync with database using delta
    try {
      const response = await apiRequest('POST', '/api/user/coins/update', { delta });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('coins/update failed', response.status, errorText);
        throw new Error(`Failed to update coins: ${response.status}`);
      }
      const data = await response.json();
      // Update balance from server response to ensure consistency
      set({ balance: data.coins });
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: data.coins });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Revert on error
      set({ balance: currentBalance });
    }
  },
  
  addWinnings: async (amount: number) => {
    const currentBalance = get().balance;
    const delta = amount; // Positive delta for winnings
    const newBalance = currentBalance + delta;
    
    console.log("🔍 CHIPS DEBUG - addWinnings called:");
    console.log("🔍 amount to add:", amount);
    console.log("🔍 currentBalance:", currentBalance);
    console.log("🔍 newBalance:", newBalance);
    
    // Update locally first for immediate UI feedback
    set({ balance: newBalance });
    
    // Sync with userStore for user profile consistency
    try {
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: newBalance });
    } catch (error) {
      console.warn('Failed to sync with user store:', error);
    }
    
    // Then sync with database using delta
    try {
      const response = await apiRequest('POST', '/api/user/coins/update', { delta });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('coins/update failed', response.status, errorText);
        throw new Error(`Failed to update coins: ${response.status}`);
      }
      const data = await response.json();
      // Update balance from server response to ensure consistency
      set({ balance: data.coins });
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: data.coins });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Revert on error
      set({ balance: currentBalance });
    }
  },

  // All-in mode: set balance to exact amount (not add to existing)
  setAllInBalance: async (finalBalance: number) => {
    const currentBalance = get().balance;
    const delta = finalBalance - currentBalance; // Calculate delta from current to final
    
    console.log("🔍 CHIPS DEBUG - setAllInBalance called:");
    console.log("🔍 currentBalance:", currentBalance);
    console.log("🔍 finalBalance:", finalBalance);
    console.log("🔍 delta:", delta);
    
    // Update locally first for immediate UI feedback
    set({ balance: finalBalance });
    
    // Sync with userStore for user profile consistency
    try {
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: finalBalance });
    } catch (error) {
      console.warn('Failed to sync with user store:', error);
    }
    
    // Then sync with database using delta
    try {
      const response = await apiRequest('POST', '/api/user/coins/update', { delta });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('coins/update failed', response.status, errorText);
        throw new Error(`Failed to update coins: ${response.status}`);
      }
      const data = await response.json();
      // Update balance from server response to ensure consistency
      set({ balance: data.coins });
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: data.coins });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Keep the final balance even on error for all-in mode
    }
  },
  
  resetBalance: () => {
    set({ balance: 0 });
  },
}));