import { create } from 'zustand';

// Single source of truth for "is anything full-screen currently covering the base Home/Shop/
// Profile tabs" — used by ConditionalBottomNav (App.tsx) to decide whether the bottom nav bar
// should be mounted at all. A plain count, not a boolean: sheets nest (e.g. a referral-code
// BottomSheet opened from within the Friends screen, itself a Profile overlay), so the nav bar
// must only come back once every currently-open layer has genuinely finished closing, not just
// the last one to have opened.
//
// The two earlier approaches this replaces both derived "is something open" indirectly instead
// of asking each sheet directly:
//  - Watching document.body's scroll-lock style: correct on open, but on close it only reflects
//    the *state* flipping, not the sheet's own exit *animation* actually finishing (250-400ms
//    later) -- needed a guessed delay that either raced the animation (nav bar popping in while
//    the sheet was still visibly closing) or lagged it (an empty gap after the sheet was
//    already gone).
//  - z-index alone (nav bar always mounted, sheets stacked above it): correct in theory (every
//    sheet's z-index checked comfortably above the nav bar's), but empirically did NOT reliably
//    hold on-device -- reverting to this exact approach reproduced the original bleed-through
//    bug this whole thing was chasing.
//
// This store fixes both: every sheet registers the instant it opens (register(), so the nav
// bar unmounts immediately, before any entrance animation even starts) and unregisters only
// once Framer Motion's onExitComplete fires for it (see hooks/use-overlay-visibility.ts) --
// the real, exact moment its exit animation finishes, no guessing involved either direction.
interface OverlayVisibilityState {
  count: number;
  register: () => void;
  unregister: () => void;
}

export const useOverlayVisibilityStore = create<OverlayVisibilityState>((set) => ({
  count: 0,
  register: () => set((s) => ({ count: s.count + 1 })),
  unregister: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
