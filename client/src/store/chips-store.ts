import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChipsState {
  balance: number;
  setBalance: (balance: number) => void;
  deductBet: (amount: number) => void;
  addWinnings: (amount: number) => void;
  resetBalance: () => void;
}

const INITIAL_BALANCE = 5000;

export const useChipsStore = create<ChipsState>()(
  persist(
    (set, get) => ({
      balance: INITIAL_BALANCE,
      
      setBalance: (balance: number) => {
        set({ balance });
      },
      
      deductBet: (amount: number) => {
        set((state) => ({
          balance: Math.max(0, state.balance - amount)
        }));
      },
      
      addWinnings: (amount: number) => {
        set((state) => ({
          balance: state.balance + amount
        }));
      },
      
      resetBalance: () => {
        set({ balance: INITIAL_BALANCE });
      },
    }),
    {
      name: 'chips-storage',
    }
  )
);