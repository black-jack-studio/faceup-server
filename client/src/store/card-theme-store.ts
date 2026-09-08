import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CardTheme = 'white' | 'black';

interface CardThemeState {
  theme: CardTheme;
  toggleTheme: () => void;
}

// Global light/dark look for every card face and back across the app (game table, card-backs
// picker, chest reveals, ...) -- same "one pastille flips everything" idea as the avatar skin
// tone swatch (avatars.tsx), except this one persists since it's a standing visual preference,
// not a per-purchase preview. Read directly by PlayingCard.tsx rather than threaded as a prop
// through its ~10 call sites.
export const useCardThemeStore = create<CardThemeState>()(
  persist(
    (set) => ({
      theme: 'white',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'white' ? 'black' : 'white' })),
    }),
    { name: 'offsuit-card-theme' }
  )
);
