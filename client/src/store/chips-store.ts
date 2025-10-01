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
    const newBalance = Math.max(0, currentBalance - amount);
    
    // Update locally first for immediate UI feedback
    set({ balance: newBalance });
    
    // Sync with userStore for user profile consistency  
    try {
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: newBalance });
    } catch (error) {
      console.warn('Failed to sync with user store:', error);
    }
    
    // Then sync with database
    try {
      await apiRequest('POST', '/api/user/coins/update', { amount: newBalance });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Revert on error
      set({ balance: currentBalance });
    }
  },
  
  addWinnings: async (amount: number) => {
    const currentBalance = get().balance;
    const newBalance = currentBalance + amount;
    
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
    
    // Then sync with database
    try {
      await apiRequest('POST', '/api/user/coins/update', { amount: newBalance });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Revert on error
      set({ balance: currentBalance });
    }
  },

  // All-in mode: set balance to exact amount (not add to existing)
  setAllInBalance: async (finalBalance: number) => {
    console.log("🔍 CHIPS DEBUG - setAllInBalance called:");
    console.log("🔍 finalBalance:", finalBalance);
    
    // Update locally first for immediate UI feedback
    set({ balance: finalBalance });
    
    // Sync with userStore for user profile consistency
    try {
      const { updateUser } = useUserStore.getState();
      updateUser({ coins: finalBalance });
    } catch (error) {
      console.warn('Failed to sync with user store:', error);
    }
    
    // Then sync with database
    try {
      await apiRequest('POST', '/api/user/coins/update', { amount: finalBalance });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
    }
  },
  
  resetBalance: () => {
    set({ balance: 0 });
  },
}));