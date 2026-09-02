import { create } from 'zustand';

// Separate from overlay-visibility-store.ts on purpose: that one fully hides the bottom nav bar
// (visibility: hidden) for sheets/modals that cover the tabs entirely. This one only darkens it
// to match a translucent black overlay sitting on top of the page (e.g. the Shop's chest-opening
// animation) — the bar stays visibly present, just as dim as everything else behind that overlay,
// instead of popping out bright above it. A plain count, not a boolean, for the same reason as
// overlay-visibility-store: nothing here nests today, but a count costs nothing and avoids a
// future two-callers-undim-each-other bug.
interface NavDimState {
  count: number;
  dim: () => void;
  undim: () => void;
}

export const useNavDimStore = create<NavDimState>((set) => ({
  count: 0,
  dim: () => set((s) => ({ count: s.count + 1 })),
  undim: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
