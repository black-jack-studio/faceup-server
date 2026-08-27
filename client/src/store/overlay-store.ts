import { create } from 'zustand';

// Home renders several full-screen sheets (Create Game, Classic 21, the Play with Friends
// table, Battle Pass, Leaderboard — see home.tsx) as local state toggles, not real route
// navigations, so the URL stays "/" the whole time they're open. ConditionalBottomNav
// (App.tsx) only knows how to hide the nav bar by matching the URL against a path list, which
// can never see these — leaving the nav bar mounted and fixed to the bottom underneath them.
// It's supposed to be fully covered by each sheet's own opaque z-[60] background, but in
// practice that didn't reliably hold (reported: the nav bar visibly painting over the Battle
// Pass's bottom button, the bet slider on the table, and the Play with Friends sheet). Rather
// than keep chasing the exact stacking/rendering cause, Home reports "some full-screen sheet
// is open" here and ConditionalBottomNav actually unmounts the nav bar for it — an unmounted
// component can't bleed through no matter what the CSS stacking turns out to be doing.
interface OverlayState {
  isHomeSheetOpen: boolean;
  setHomeSheetOpen: (open: boolean) => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
  isHomeSheetOpen: false,
  setHomeSheetOpen: (open) => set({ isHomeSheetOpen: open }),
}));
