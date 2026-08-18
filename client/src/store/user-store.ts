import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@shared/schema';
import { apiRequest, queryClient, invalidateCSRFToken, invalidateManualCookieCache } from '@/lib/queryClient';

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface UserActions {
  login: (username: string, password: string) => Promise<void>;
  loginWithApple: (identityToken: string) => Promise<void>;
  registerWithApple: (identityToken: string, username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addTickets: (amount: number) => void;
  addXP: (amount: number) => void;
  addSeasonXP: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
  spendTickets: (amount: number) => boolean;
  checkSubscriptionStatus: () => Promise<void>;
  isPremium: () => boolean;
  // Game-specific coin actions (replaces chips-store)
  loadUserCoins: () => Promise<void>;
  deductBet: (amount: number) => Promise<void>;
  addWinnings: (amount: number) => Promise<void>;
  setBalance: (amount: number) => Promise<void>;
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

          // Invalidate CSRF token cache after login to force new token fetch
          invalidateCSRFToken();
          invalidateManualCookieCache();

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
          // Normalize error to ensure errorType is preserved
          const normalizedError = {
            message: error?.message || 'Login failed',
            errorType: error?.errorType,
            status: error?.status ?? 401,
          };
          throw normalizedError;
        }
      },

      loginWithApple: async (identityToken: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiRequest('POST', '/api/auth/apple', { identityToken });
          const userData = await response.json();

          invalidateCSRFToken();
          invalidateManualCookieCache();

          set({
            user: userData.user,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          set({
            error: error.message || 'Apple sign-in failed',
            isLoading: false
          });
          throw error;
        }
      },

      registerWithApple: async (identityToken: string, username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiRequest('POST', '/api/auth/apple/register', {
            identityToken,
            username,
            password,
          });
          const userData = await response.json();

          invalidateCSRFToken();
          invalidateManualCookieCache();

          set({
            user: userData.user,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          set({
            error: error.message || 'Apple sign-up failed',
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

          // Invalidate CSRF token cache after registration to force new token fetch
          invalidateCSRFToken();
          invalidateManualCookieCache();

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

      setUser: (user: User) => {
        set({
          user,
          isLoading: false,
          error: null
        });
      },

      logout: () => {
        set({ user: null, error: null });
        queryClient.clear();
        invalidateManualCookieCache();
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
          if (error.status === 401 || error.message.includes('401')) {
            set({ user: null });
          }
          set({
            error: error.message,
            isLoading: false
          });
        }
      },

      initializeAuth: async () => {
        // Check if we have a stored user from localStorage
        const storedUser = get().user;

        // If no stored user, no need to check session
        if (!storedUser) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Try to fetch current user profile to verify session is still valid
          const response = await apiRequest('GET', '/api/user/profile');
          const userData = await response.json();

          // Session is valid, update user data
          set({
            user: userData,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          // Session is invalid or expired, clear stored user
          if (error.status === 401 || error.status === 403 || error.message.includes('401') || error.message.includes('403')) {
            set({
              user: null,
              isLoading: false,
              error: null
            });
            queryClient.clear();
          } else {
            // Other error, keep stored user but show error
            set({
              error: error.message,
              isLoading: false
            });
          }
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

      addTickets: (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const newTickets = (currentUser.tickets || 0) + amount;
        get().updateUser({ tickets: newTickets });
      },

      addXP: (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const currentLevel = currentUser.level || 1;
        const currentLevelXP = currentUser.currentLevelXP || 0;
        const totalXP = currentUser.xp || 0;

        // Add XP to current level
        let newCurrentLevelXP = currentLevelXP + amount;
        let newLevel = currentLevel;

        // Check if we need to level up (100 XP per level)
        while (newCurrentLevelXP >= 100) {
          newCurrentLevelXP -= 100; // Reset to 0 and carry over
          newLevel++;
        }

        const newTotalXP = totalXP + amount;

        get().updateUser({
          xp: newTotalXP,
          currentLevelXP: newCurrentLevelXP,
          level: newLevel
        });

        // Award level-up bonus
        if (newLevel > currentLevel) {
          get().addCoins(1000); // Level up coin bonus
        }
      },

      addSeasonXP: async (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          // Call API to add season XP
          const response = await apiRequest('POST', '/api/seasons/add-xp', {
            amount
          });

          const data = await response.json();

          // Update local user state with new season XP
          get().updateUser({
            seasonXp: data.seasonXp
          });
        } catch (error) {
          console.error('Failed to add season XP:', error);
          // Fallback: update locally
          const newSeasonXP = (currentUser.seasonXp || 0) + amount;
          get().updateUser({ seasonXp: newSeasonXP });
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

      spendTickets: (amount: number): boolean => {
        const currentUser = get().user;
        if (!currentUser || (currentUser.tickets || 0) < amount) {
          return false;
        }

        const newTickets = (currentUser.tickets || 0) - amount;
        get().updateUser({ tickets: newTickets });
        return true;
      },

      checkSubscriptionStatus: async () => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          const response = await apiRequest('GET', '/api/subscription/status');
          const data = await response.json();

          if (data) {
            get().updateUser({
              membershipType: data.isActive ? 'premium' : 'normal',
              subscriptionExpiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            });
          }
        } catch (error) {
          console.error('Failed to check subscription status:', error);
        }
      },

      isPremium: (): boolean => {
        const currentUser = get().user;
        if (!currentUser) return false;

        // Si l'utilisateur a un membershipType premium, on le considère comme premium
        // (l'API server-side vérifiera toujours la validité lors des requêtes critiques)
        return currentUser.membershipType === 'premium';
      },

      // ========================================
      // Game-specific coin actions (replaces chips-store)
      // ========================================

      loadUserCoins: async () => {
        const currentUser = get().user;
        if (!currentUser) {
          console.warn('⚠️ loadUserCoins: No user logged in');
          return;
        }

        set({ isLoading: true });
        try {
          console.log('🔄 Loading user coins...');
          const response = await apiRequest('GET', '/api/user/coins');
          const data = await response.json();
          console.log('✅ Coins loaded successfully:', data.coins);
          // Update both coins and tickets
          get().updateUser({
            coins: data.coins || 0,
            tickets: data.tickets !== undefined ? data.tickets : currentUser.tickets
          });
        } catch (error: any) {
          console.error('❌ Failed to load coins - Details:');
          console.error('  Message:', error?.message || 'Unknown error');
          console.error('  Status:', error?.status || 'N/A');
          console.error('  Full error:', error);

          // If it's an auth error, user might need to re-login
          if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Authentication')) {
            console.warn('⚠️ Authentication issue detected - user may need to login again');
          }
        } finally {
          set({ isLoading: false });
        }
      },

      deductBet: async (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const currentCoins = currentUser.coins || 0;
        const newCoins = Math.max(0, currentCoins - amount);

        // Optimistic update for immediate UI feedback
        get().updateUser({ coins: newCoins });

        // updateUser already syncs to server via PATCH /api/user/profile
      },

      addWinnings: async (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const newCoins = (currentUser.coins || 0) + amount;

        console.log("🔍 USER STORE - addWinnings called:");
        console.log("🔍 amount to add:", amount);
        console.log("🔍 currentCoins:", currentUser.coins);
        console.log("🔍 newCoins:", newCoins);

        // Optimistic update for immediate UI feedback
        get().updateUser({ coins: newCoins });

        // updateUser already syncs to server via PATCH /api/user/profile
      },

      setBalance: async (finalBalance: number) => {
        console.log("🔍 USER STORE - setBalance called:");
        console.log("🔍 finalBalance:", finalBalance);

        // Set coins to exact amount (used for All-In mode)
        get().updateUser({ coins: finalBalance });

        // updateUser already syncs to server via PATCH /api/user/profile
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
