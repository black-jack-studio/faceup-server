import { create } from 'zustand';

interface ChipsState {
  balance: number;
  isLoading: boolean;
  loadBalance: () => Promise<void>;
  setBalance: (balance: number) => void;
  deductBet: (amount: number) => Promise<void>;
  addWinnings: (amount: number) => Promise<void>;
  resetBalance: () => void;
}

const INITIAL_BALANCE = 5000;

export const useChipsStore = create<ChipsState>((set, get) => ({
  balance: INITIAL_BALANCE,
  isLoading: false,
  
  loadBalance: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/user/coins');
      if (response.ok) {
        const data = await response.json();
        set({ balance: data.coins });
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
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
    
    // Then sync with database
    try {
      await fetch('/api/user/coins/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: newBalance }),
      });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Revert on error
      set({ balance: currentBalance });
    }
  },
  
  addWinnings: async (amount: number) => {
    const currentBalance = get().balance;
    const newBalance = currentBalance + amount;
    
    // Update locally first for immediate UI feedback
    set({ balance: newBalance });
    
    // Then sync with database
    try {
      await fetch('/api/user/coins/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: newBalance }),
      });
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      // Revert on error
      set({ balance: currentBalance });
    }
  },
  
  resetBalance: () => {
    set({ balance: INITIAL_BALANCE });
  },
}));