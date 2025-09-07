import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface UserActions {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addXP: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
}

type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiRequest('POST', '/api/auth/login', {
            username,
            password,
          });
          
          const userData = await response.json();
          
          set({ 
            user: userData.user, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Login failed',
            isLoading: false 
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiRequest('POST', '/api/auth/register', {
            username,
            email,
            password,
          });
          
          const userData = await response.json();
          
          set({ 
            user: userData.user, 
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          set({ 
            error: error.message || 'Registration failed',
            isLoading: false 
          });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, error: null });
        // Clear session on server
        apiRequest('POST', '/api/auth/logout').catch(() => {
          // Ignore errors on logout
        });
      },

      loadUser: async () => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({ isLoading: true });
        
        try {
          const response = await apiRequest('GET', '/api/user/profile');
          const userData = await response.json();
          
          set({ 
            user: userData,
            isLoading: false,
            error: null 
          });
        } catch (error: any) {
          // If unauthorized, clear user
          if (error.message.includes('401')) {
            set({ user: null });
          }
          set({ 
            error: error.message,
            isLoading: false 
          });
        }
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({
          user: { ...currentUser, ...updates }
        });
        
        // Sync to server
        apiRequest('PATCH', '/api/user/profile', updates).catch((error) => {
          console.error('Failed to sync user updates:', error);
        });
      },

      addCoins: (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const newCoins = (currentUser.coins || 0) + amount;
        get().updateUser({ coins: newCoins });
      },

      addGems: (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const newGems = (currentUser.gems || 0) + amount;
        get().updateUser({ gems: newGems });
      },

      addXP: (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const newXP = (currentUser.xp || 0) + amount;
        const newLevel = Math.floor(newXP / 1000) + 1;
        get().updateUser({ xp: newXP, level: newLevel });
        
        // Award level-up bonus
        if (newLevel > (currentUser.level || 1)) {
          get().addCoins(1000); // Level up coin bonus
        }
      },

      spendCoins: (amount: number): boolean => {
        const currentUser = get().user;
        if (!currentUser || (currentUser.coins || 0) < amount) {
          return false;
        }
        
        const newCoins = (currentUser.coins || 0) - amount;
        get().updateUser({ coins: newCoins });
        return true;
      },

      spendGems: (amount: number): boolean => {
        const currentUser = get().user;
        if (!currentUser || (currentUser.gems || 0) < amount) {
          return false;
        }
        
        const newGems = (currentUser.gems || 0) - amount;
        get().updateUser({ gems: newGems });
        return true;
      },
    }),
    {
      name: 'offsuit-user-store',
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);
